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
let connectionString = process.env.COMPOSE_REDIS_URL;

if (connectionString === undefined) {
  console.error("Please set the COMPOSE_REDIS_URL environment variable");
  process.exit(1);
}

let client = null;

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

client.on("error", err => {
  console.log("Error " + err);
});

// Add a word to the database
function addWord(word, definition) {
  return new Promise((resolve, reject) => {
    client.hset("words", word, definition, (error, result) => {
      if (error) {
        reject(error);
      } else {
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
      response.status(500).send(err);
    });
});

// Listen for a connection.
app.listen(port, () => {
  console.log("Server is listening on port " + port);
});
