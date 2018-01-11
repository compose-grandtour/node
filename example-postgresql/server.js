"use strict";
// Add the express web framework
const express = require("express");
const app = express();
const fs = require("fs");

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
const pg = require("pg");

// Get your connection string from the Compose deployment overview page
let connectionString = process.env.COMPOSE_POSTGRESQL_URL;

if (connectionString === undefined) {
  console.error("Please set the COMPOSE_MYSQL_URL environment variable");
  process.exit(1);
}

// Get your SSL certificate from the Compose deployment overview page
// and save it to a file
let caCert = fs.readFileSync(process.env.PATH_TO_POSTGRESQL_CERT);

// We want to parse connectionString to get username, password, database name, server, port
// So we can use those to connect to the database
const parse = require("pg-connection-string").parse;
let config = parse(connectionString);

// And add the ssl
config.ssl = {
  //  rejectUnauthorized: false,
  ca: caCert
};

// set up a new client using our config details
let client = new pg.Client(config);

client.connect(function(err) {
  if (err) {
    response.status(500).send(err);
  } else {
    client.query(
      "CREATE TABLE IF NOT EXISTS words (word varchar(256) NOT NULL, definition varchar(256) NOT NULL)",
      function(err, result) {
        if (err) {
          console.log(err);
        }
      }
    );
  }
});

// Add a word to the database
function addWord(request) {
  return new Promise(function(resolve, reject) {
    let queryText = "INSERT INTO words(word,definition) VALUES($1, $2)";
    client.query(
      queryText,
      [request.body.word, request.body.definition],
      function(error, result) {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
}

// Get words from the database
function getWords() {
  return new Promise(function(resolve, reject) {
    client.query("SELECT * FROM words ORDER BY word ASC", function(
      err,
      result
    ) {
      if (err) {
        reject(err);
      } else {
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

// Listen for a connection.
app.listen(port, function() {
  console.log("Server is listening on port " + port);
});
