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

// Add a word to the database
function addWord(request) {
  return new Promise(function(resolve, reject) {
    // To send a message, we first open a connection
    amqp.connect(connectionString, { servername: parsedurl.hostname }, function(err, conn) {
      if (err) {
        reject(err);
      }
      // With the connection open, we then create a channel
      conn.createChannel(function(err, ch) {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          // next we make sure our queue exists
          ch.assertQueue(q, {
              durable: false
          });
          // We can now send a Buffer as a payload to the queue.
          msgTxt = request.body.message + ' : Message sent at ' + new Date();
          ch.sendToQueue(q, new Buffer(msgTxt));    // Now close the created Channel
          ch.close();
          // and set a timer to close the connection so that anything
          // in transit can clear
          setTimeout(function() { conn.close(); }, 500);
          resolve(msgTxt);
        }
      });
    });
  });
};

// Get words from the database
function getWords() {
  return new Promise(function(resolve, reject) {
    // To receive a message, we first open a connection
    amqp.connect(connectionString, { servername: parsedurl.hostname }, function(err, conn) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        // With the connection open, we then crea te a channel
        conn.createChannel(function(err, ch) {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            // next we make sure our queue exists
            ch.assertQueue(q, {
                durable: false
            });
            // Now we attempt to get a message from our queue
            ch.get(q, {}, function(err, msgOrFalse) {
              if (err) {
                console.log(err);
                reject(err);
              } else {
                // If the get() call got a message, write the message to
                // the response and then acknowledge the message so it is
                // removed from the queue
                if (msgOrFalse != false) {
                    ch.ack(msgOrFalse);
                    result = util.inspect(msgOrFalse.content.toString(), false, null);
                } else {
                    // There's nothing, write a message saying that
                    result = "Nothing in queue";
                }
                // close the channel
                ch.close();
                // and set a timer to close the connection (there's an ack in transit)
                setTimeout(function() { conn.close(); }, 500);

                resolve(result);
              }
            });
          }
        });
      }
    });
  });
};

// With the database going to be open as some point in the future, we can
// now set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + '/public'));

// The user has clicked submit to add a word and definition to the database
// Send the data to the addWord function and send a response if successful
app.put("/message", function(request, response) {
  addWord(request).then(function(resp) {
    response.send(resp);
  }).catch(function (err) {
      console.log(err);
      response.status(500).send(err);
    });
});

// Read from the database when the page is loaded or after a word is successfully added
// Use the getWords function to get a list of words and definitions from the database
app.get("/message", function(request, response) {
  getWords().then(function(words) {
    response.send(words);
  }).catch(function (err) {
      console.log(err);
      response.status(500).send(err);
    });
});


// Listen for a connection.
app.listen(port,function(){
  console.log('Server is listening on port ' + port);
});
