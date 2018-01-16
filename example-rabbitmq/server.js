'use strict';
// Add the express web framework
const express = require('express');
const app = express();
const url = require('url');

// Use body-parser to handle the PUT data
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: false
}));

// Util is handy to have around, so thats why that's here.
const util = require('util')

// We want to extract the port to publish our app on
let port = process.env.PORT || 8080;

// Then we'll pull in the database client library
// Rabbitmq uses AMQP as a protocol, so this is a generic library for the protocol
const amqp = require("amqplib/callback_api");

function bail(err, conn) {
  console.error(err);
  if (conn) conn.close(function() {
      process.exit(1);
  });
}

// Connect using a connection string
// Create a user, then get your connection string from the Compose deployment overview page
// Add your connection string as an environment variable and access it here
let connectionString = process.env.COMPOSE_RABBITMQ_URL;

if (connectionString===undefined) {
  console.error("Please set the COMPOSE_RABBITMQ_URL environment variable")
  process.exit(1);
}

let parsedurl = url.parse(connectionString);

// Bind a queue to the exchange to listen for messages
// When we publish a message, it will be sent to this queue, via the exchange
let routingKey = "words";
let exchangeName = "grandtour";
let qName = 'sample';

amqp.connect(connectionString, { servername: parsedurl.hostname }, function(err, conn) {
  conn.createChannel(function(err, ch) {
    ch.assertExchange(exchangeName, 'direct', {durable: true});
    ch.assertQueue(qName, {exclusive: false}, function(err, q) {
      console.log(" [*] Waiting for messages in the queue '%s'", q.queue);
      ch.bindQueue(q.queue, exchangeName, routingKey);
    });
  });
  setTimeout(function() { conn.close(); }, 500);
});

// Add a message to the queue
function addMessage(request) {
  return new Promise(function(resolve, reject) {

    // To send a message, we first open a connection
    amqp.connect(connectionString, { servername: parsedurl.hostname }, function(err, conn) {
      if (err !== null) return bail(err, conn);
      
      // Then we create a channel
      conn.createChannel(function(err, channel) {
        if (err !== null) return bail(err, conn);
        let message = request.body.message;
        
        // And we publish the message to an exchange
        channel.assertExchange(exchangeName, "direct", {
            durable: true
        }, function(err, ok) {
            if (err !== null) return bail(err, conn);
            channel.publish(exchangeName, routingKey, new Buffer(message))
        });
        
      });

      let msgTxt = request.body.message + ' : Message sent at ' + new Date();
      console.log(" [+] %s", msgTxt);
      setTimeout(function() { conn.close(); }, 500);
      resolve(msgTxt);

    });
  });
};

// Get a message from the queue
function getMessage() {
  return new Promise(function(resolve, reject) {

    // To receive a message, we first open a connection
    amqp.connect(connectionString, { servername: parsedurl.hostname }, function(err, conn) {
      if (err !== null) return bail(err, conn);

      // With the connection open, we then create a channel
      conn.createChannel(function(err, channel) {
        if (err !== null) return bail(err, conn);

        // ...and get a message from the queue, which is bound to the exchange
        channel.get(qName, {}, function(err, msgOrFalse) {
          if (err !== null) return bail(err, conn);
          
          let result = "No message received";

          if (msgOrFalse != false) {
            channel.ack(msgOrFalse);
            result = msgOrFalse.content.toString() + ' : Message received at ' + new Date();
            console.log(" [-] %s", result);
          } else {
            // There's nothing, write a message saying that
            result = "No messages in the queue";
            console.log(" [x] %s", result);
          }

          // close the channel
          channel.close();
          // and set a timer to close the connection (there's an ack in transit)
          setTimeout(function() { conn.close(); }, 500);
          resolve(result);
        }, {noAck: true});
      });
    });
  });
};

// With the database going to be open as some point in the future, we can
// now set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + '/public'));

// The user has clicked submit to add a word and definition to the database
// Send the data to the addWord function and send a response if successful
app.put("/message", function(request, response) {
  addMessage(request).then(function(resp) {
    response.send(resp);
  }).catch(function (err) {
      console.log("error:",err);
      response.status(500).send(err);
    });
});

// Read from the database when the page is loaded or after a word is successfully added
// Use the getWords function to get a list of words and definitions from the database
app.get("/message", function(request, response) {
  getMessage().then(function(words) {
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
