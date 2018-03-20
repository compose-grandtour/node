"use strict";
/* jshint node:true */

// Add the express web framework
const express = require("express");
const app = express();
const url = require("url");

// Use body-parser to handle the PUT data
const bodyParser = require("body-parser");
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);

// We want to extract the port to publish our app on
let port = process.env.PORT || 8080;

// Then we'll pull in the database client library
// Rabbitmq uses AMQP as a protocol, so this is a generic library for the protocol
const amqp = require("amqplib");

// Connect using a connection string
// Create a user, then get your connection string from the Compose deployment overview page
// Add your connection string as an environment variable and access it here
let connectionString = process.env.COMPOSE_RABBITMQ_URL;

if (connectionString === undefined) {
  console.error("Please set the COMPOSE_RABBITMQ_URL environment variable");
  process.exit(1);
}

let parsedurl = url.parse(connectionString);

// Bind a queue to the exchange to listen for messages
// When we publish a message, it will be sent to this queue, via the exchange
let routingKey = "words";
let exchangeName = "grandtour";
let qName = "sample";

var open = amqp.connect(connectionString, { servername: parsedurl.hostname });

open
  .then(conn => {
    return conn.createChannel();
  })
  .then(ch => {
    return ch
      .assertExchange(exchangeName, "direct", { durable: true })
      .then(() => {
        return ch.assertQueue(qName, { exclusive: false });
      })
      .then(q => {
        return ch.bindQueue(q.queue, exchangeName, routingKey);
      });
  })
  .catch(err => {
    console.err(err);
    process.exit(1);
  });

// Publish a message to the exchange
// RabbitMQ will move it to the queue
function addMessage(message) {
  return open
    .then(conn => {
      return conn.createChannel();
    })
    .then(ch => {
      ch.publish(exchangeName, routingKey, new Buffer(message));
      let msgTxt = message + " : Message sent at " + new Date();
      console.log(" [+] %s", msgTxt);
      return new Promise(resolve => {
        resolve(message);
      });
    });
}

// Get a message from the queue
function getMessage() {
  return open
    .then(conn => {
      return conn.createChannel();
    })
    .then(ch => {
      return ch.get(qName, {}).then(msgOrFalse => {
        if (msgOrFalse !== false) {
          return new Promise((resolve, reject) => {
            let result =
              msgOrFalse.content.toString() +
              " : Message received at " +
              new Date();
            console.log(" [-] %s", result);
            ch.ack(msgOrFalse);
            resolve(result);
          });
        } else {
          let result = "No messages in the queue";
          console.log(" [-] %s", result);
          return new Promise(resolve => {
            resolve(result);
          });
        }
      });
    });
}

// With the database going to be open as some point in the future, we can
// now set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + "/public"));

// The user has clicked submit to add a word and definition to the database
// Send the data to the addWord function and send a response if successful
app.put("/message", function(request, response) {
  addMessage(request.body.message)
    .then(resp => {
      response.send(resp);
    })
    .catch(err => {
      console.log("error:", err);
      response.status(500).send(err);
    });
});

// Read from the database when the page is loaded or after a word is successfully added
// Use the getWords function to get a list of words and definitions from the database
app.get("/message", function(request, response) {
  getMessage()
    .then(words => {
      response.send(words);
    })
    .catch(err => {
      console.log(err);
      response.status(500).send(err);
    });
});

// Listen for a connection.
app.listen(port, function() {
  console.log("Server is listening on port " + port);
});
