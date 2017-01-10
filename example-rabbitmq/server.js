// First add the obligatory web framework
var express = require('express');
var app = express();
var url = require('url');
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
  extended: false
}));

// Util is handy to have around, so thats why that's here.
const util = require('util')

// We want to extract the port to publish our app on
var port = process.env.PORT || 8080;

// Then we'll pull in the database client library
// Rabbitmq uses AMQP as a protocol, so this is a generic library for the protocol
var amqp = require("amqplib/callback_api");

// Connect using a connection string
// Create a user, then get your connection string from the Compose deployment overview page
// Add your connection string as an environment variable and access it here
var connectionString = process.env.COMPOSERABBITMQURL;
var parsedurl = url.parse(connectionString);

// We now name a queue, "hello" - we'll use this queue for communications
var q = 'hello';

// With the database going to be open as some point in the future, we can
// now set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + '/public'));

// Then we create a route to handle our example database call
app.put("/message", function(request, response) {
    // To send a message, we first open a connection
    amqp.connect(connectionString, { servername: parsedurl.hostname }, function(err, conn) {
        // With the connection open, we then create a channel
        conn.createChannel(function(err, ch) {
            // next we make sure our queue exists
            ch.assertQueue(q, {
                durable: false
            });
            // We can now send a Buffer as a payload to the queue.
            ch.sendToQueue(q, new Buffer(request.body.message + ' : Message sent at ' + new Date()));
            // Here we write our response as plain text confirming that we sent something
            response.writeHead(200, {
                "Content-Type": "text/plain"
            });
            response.write("Sent 'Hello World!' message");
            response.end();
            // Now close the created Channel
            ch.close();
            // and set a timer to close the connection so that anything
            // in transit can clear
            setTimeout(function() { conn.close(); }, 500);
        });
    });
});

app.get("/message", function(request, response) {
    // To receive a message, we first open a connection
    amqp.connect(connectionString, { servername: parsedurl.hostname }, function(err, conn) {
        // With the connection open, we then crea te a channel
        conn.createChannel(function(err, ch) {
            // next we make sure our queue exists
            ch.assertQueue(q, {
                durable: false
            });
            // Now we attempt to get a message from our queue
            ch.get(q, {}, function(err, msgOrFalse) {

                // If the get() call got a message, write the message to
                // the response and then acknowledge the message so it is
                // removed from the queue
                if (msgOrFalse != false) {
                    response.write(util.inspect(msgOrFalse.content.toString(), false, null));
                    ch.ack(msgOrFalse);
                } else {
                    // There's nothing, write a message saying that
                    response.write("Nothing in queue")
                }
                // Wrap up the response and close the channel
                response.end();
                ch.close();
                // and set a timer to close the connection (there's an ack in transit)
                setTimeout(function() { conn.close(); }, 500);
            });
        });
    });
});


// Listen for a connection.
app.listen(port,function(){
  console.log('Server is listening on port ' + port);
});
