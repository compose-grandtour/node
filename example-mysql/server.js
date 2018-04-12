"use strict";
/* jshint node:true */

// Add the express web framework
const express = require("express");
const app = express();
const fs = require("fs");
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
const mysql = require("mysql2/promise");

// Connect to MySQL using a connection string
// Get your connection string from the Compose deployment overview page
let connectionString = process.env.COMPOSE_MYSQL_URL;
let connectionCertPath = process.env.PATH_TO_MYSQL_CERT;

if (connectionString === undefined) {
  console.error("Please set the COMPOSE_MYSQL_URL environment variable");
  process.exit(1);
}

// First we need to parse the connection string. Although we could pass
// the URL directly, that doesn't allow us to set an SSL certificate.

let mysqlurl = new url.URL(connectionString);
let options = {
  host: mysqlurl.hostname,
  port: mysqlurl.port,
  user: mysqlurl.username,
  password: mysqlurl.password,
  database: mysqlurl.pathname.split("/")[1]
};

// If the path to the certificate is set, we assume SSL.
// Therefore we read the cert and set the options for a validated SSL connection
if (connectionCertPath) {
  var ca = [fs.readFileSync(connectionCertPath)];
  options.ssl = { ca: ca };
  options.flags = "--ssl-mode=REQUIRED";
}

// set up a new connection using our config details
let connection = null;

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + "/public"));

// Add a word to the database
function addWord(word, definition) {
  return connection.query("INSERT INTO words( word, definition) VALUES(?, ?)", [
    word,
    definition
  ]);
}

// Get words from the database
function getWords() {
  return connection
    .query("SELECT * FROM words ORDER BY word ASC")
    .then(([rows, fields]) => {
      return new Promise((resolve, reject) => {
        resolve(rows);
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

mysql
  .createConnection(options)
  .then(conn => {
    connection = conn;
    return connection.query(
      "CREATE TABLE IF NOT EXISTS words (id int auto_increment primary key, word varchar(256) NOT NULL, definition varchar(256) NOT NULL)"
    );
  })
  .then(result => {
    // Listen for a connection.
    app.listen(port, function() {
      console.log("Server is listening on port " + port);
    });
  })
  .catch(err => {
    console.log(err);
    process.exit(1);
  });
