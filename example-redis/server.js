"use strict";
/* jshint node:true */

// Add the express web framework
const express = require("express");
const { URL } = require("url");
const app = express();

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
const redis = require("redis");


// Connect to Redis using a connection string
// Get your connection string from the Compose deployment overview page
// separate all connection string with just a commaa ','
let connectionString = process.env.COMPOSE_REDIS_URL;

// split all the connection strings into an array
let connectionStrings = connectionString.split(',');

if (connectionString === undefined) {
  console.error("Please set the COMPOSE_REDIS_URL environment variable");
  process.exit(1);
}

var client;

// subsequent failed reconnection attempts
var reconnectionCounter;
// the starting frequency at which a failed connection retries (milliseconds)
var retryFrequency;

// reset all reconnection counters
resetConnectionRetryCounters();

// initialize client with the first index/connectionString
createClient(connectionStrings[0]);

function createClient(connectionString) {
  if (connectionString.startsWith("rediss://")) {
    // If this is a rediss: connection, we have some other steps.
    client = redis.createClient(connectionString, {
      tls: { servername: new URL(connectionString).hostname }
    });
    // This will, with node-redis 2.8, emit an error:
    // "node_redis: WARNING: You passed "rediss" as protocol instead of the "redis" protocol!"
    // This is a bogus message and should be fixed in a later release of the package.
  } else {
      client = redis.createClient(connectionString);
  }
  errorHandler();
}

// checks to see if client is emitting an error.
function errorHandler() {
  client.on("error", err => {
    console.log("Error " + err);
    if (err.code === 'ETIMEDOUT') {
      console.log(reconnectionCounter + ' subsequent failed reconnection attempt(s)')
      // retry connection after a 'retryFrequency' amount of time.
      setTimeout(nextClient, retryFrequency);
    }
  });
}

// reset reconnection counters
function resetConnectionRetryCounters() {
    reconnectionCounter = 0;
    retryFrequency = 2000;
}

// closes current connection and connects to the next connection string
function nextClient() {
    // close current connection
    client.quit();
    // add the value of the first index to the end of the array
    connectionStrings.push(connectionStrings[0]);
    // remove the first index so that the next value is in the first index
    connectionStrings.shift();
    // pass in the value of the connection string in the first index to create
    // a connection
    createClient(connectionStrings[0]);
    reconnectionCounter++;
    // stop increasing frequency after 8.5 minutes
    if (retryFrequency < 512000 ) {
        retryFrequency *= 2;
    }
}

// Add a word to the database
function addWord(word, definition) {
  return new Promise((resolve, reject) => {
    // use the connection to add the word and definition entered by the user
    client.hset("words", word, definition, (error, result) => {
      if (error) {
        reject(error);
      } else {
        // reset the connection counters
        resetConnectionRetryCounters();
        resolve("success");
      }
    });
  });
}

// Get words from the database
function getWords() {
  return new Promise((resolve, reject) => {
    client.hgetall("words", (err, resp) => {
      if (err) {
        reject(err);
      } else {
        resolve(resp);
      }
    });
  });
}

// We can now set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + "/public"));

// The user has clicked submit to add a word and definition to the hash
// Send the data to the addWord function and send a response if successful
app.put("/words", (request, response) => {
  addWord(request.body.word, request.body.definition)
    .then(resp => {
      response.send(resp);
    })
    .catch(err => {
      console.log(err);
      // if the current connection is down or in the process of reconnection, 
      // pass the arguments back in after a connection is established
      if (err.code === "NR_CLOSED") {
          return addWord(request.body.word, request.body.definition)
      }      
      response.status(500).send(err);
    });
});

// Read from the hash when the page is loaded or after a word is successfully added
// Use the getWords function to get a list of words and definitions from the hash
app.get("/words", (request, response) => {
  getWords()
    .then(words => {
      response.send(words);
    })
    .catch(err => {
      console.log(err);
      if (err.code === "NR_CLOSED") {
        return getWords()
      }
      response.status(500).send(err);
    });
});

client.ping((err, reply) => {
  if (err !== null) {
    console.log(err);
    process.exit(1);
  }
  // Listen for a connection.
  app.listen(port, () => {
    console.log("Server is listening on port " + port);
  });
});
