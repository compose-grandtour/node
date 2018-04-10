"use strict";
/* jshint node:true */

// Add the express web framework
const express = require("express");
const app = express();
const { URL } = require("url");

// Use body-parser to handle the PUT data
const bodyParser = require("body-parser");
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);

// Then we'll pull in the database client library
const { Etcd3 } = require("etcd3");

let endpoints = process.env.COMPOSE_ETCD_ENDPOINTS;

if (endpoints === undefined) {
  console.error("Please set the COMPOSE_ETCD_ENDPOINTS environment variable");
  process.exit(1);
}

let envuser = process.env.COMPOSE_ETCD_USER;
let envpass = process.env.COMPOSE_ETCD_PASS;

// Create auth credentials
let opts = {
  hosts: endpoints.split(","),
  auth: {
    username: envuser,
    password: envpass
  }
};

var etcd = new Etcd3(opts).namespace("/grand_tour/words/");

// We want to extract the port to publish our app on
let port = process.env.PORT || 8080;

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + "/public"));

// Add a word to the database
function addWord(word, definition) {
  return etcd.put(word).value(definition);
}

// Get words from the database
function getWords() {
  return etcd
    .getAll()
    .strings()
    .then(values => {
      return new Promise((resolve, reject) => {
        let words = [];
        for (const key in values) {
          words.push({ word: key, definition: values[key] });
        }
        resolve(words);
      });
    });
}

// The user has clicked submit to add a word and definition to the database
// Send the data to the addWord function and send a response if successful
app.put("/words", function(request, response) {
  addWord(request.body.word, request.body.definition)
    .then(function(resp) {
      response.send(resp);
    })
    .catch(function(err) {
      console.log(err);
      response.status(500).send(err);
    });
});

// Read from the database when the page is loaded or after a word is successfully added
// Use the getWords function to get a list of words and definitions from the database
app.get("/words", function(request, response) {
  getWords()
    .then(function(words) {
      response.send(words);
    })
    .catch(function(err) {
      console.log(err);
      response.status(500).send(err);
    });
});

// Listen for a connection.
app.listen(port, function() {
  console.log("Server is listening on port " + port);
});
