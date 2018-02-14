"use strict";
/* jshint node:true */

// Add the express web framework
const express = require("express");
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
const cassandra = require("cassandra-driver");

// Use the address translator
const compose = require("composeaddresstranslator");

// Connect to ScyllaDB using a connection string
// Get your connection string and mapping details from the Compose deployment overview page.
// Store the connection string as an environment variable
let connectionString = process.env.COMPOSE_SCYLLA_URLS;

if (connectionString === undefined) {
  console.error("Please set the COMPOSE_SCYLLA_URLS environment variable");
  process.exit(1);
}

// your environment variable for the maps should look like:
// COMPOSESCYLLADBMAPS='{ip:server,ip:server,ip:server}'
// in other words copy the Address Translation Map from your Compose Deployment Overview
// including the curly braces
let mapList = JSON.parse(process.env.COMPOSE_SCYLLA_MAPS.split(","));

// get a username and password from the uri
const url = require("url");
let myURL = url.parse(connectionString);
let auth = myURL.auth;
let splitAuth = auth.split(":");
let username = splitAuth[0];
let password = splitAuth[1];
let sslopts = myURL.protocol === "https:" ? {} : null;

// get contactPoints for the connection
let translator = new compose.ComposeAddressTranslator();
translator.setMap(mapList);

let authProvider = new cassandra.auth.PlainTextAuthProvider(username, password);
let uuid = require("uuid");

let client = new cassandra.Client({
  contactPoints: translator.getContactPoints(),
  policies: {
    addressResolution: translator
  },
  authProvider: authProvider,
  sslOptions: sslopts
});

// Add a word to the database
function addWord(request) {
  return new Promise(function(resolve, reject) {
    client.execute(
      "INSERT INTO grand_tour.words(my_table_id, word, definition) VALUES(?,?,?)",
      [uuid.v4(), request.body.word, request.body.definition],
      { prepare: true },
      function(error, result) {
        if (error) {
          console.log(error);
          reject(error);
        } else {
          resolve(result.rows);
        }
      }
    );
  });
}

// Get words from the database
function getWords() {
  return new Promise(function(resolve, reject) {
    // execute a query on our database
    client.execute("SELECT * FROM grand_tour.words", function(err, result) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        //console.log(result.rows);
        resolve(result.rows);
      }
    });
  });
}

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + "/public"));

// The user has clicked submit to add a word and definition to the database
// Send the data to the addWord function and send a response if successful
app.put("/words", function(request, response) {
  addWord(request)
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

console.log("Connecting");

// create a keyspace and a table if they don't already exist
client
  .execute(
    "CREATE KEYSPACE IF NOT EXISTS grand_tour WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '3' };"
  )
  .then(result =>
    client
      .execute(
        "CREATE TABLE IF NOT EXISTS grand_tour.words (my_table_id uuid, word text, definition text, PRIMARY KEY(my_table_id));"
      )
      .then(result => {
        app.listen(port, function() {
          console.log("Server is listening on port " + port);
        });
      })
      .catch(err => {
        console.log(err);
        process.exit(1);
      })
  );
