"use strict";
/* jshint node:true */

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
const r = require("rethinkdb");

// and we'll need to parse the connection string for the deployment
const parseRethinkdbUrl = require("parse-rethinkdb-url");

// you can get your connection string from the deployment overview page
let connectionString = process.env.COMPOSE_RETHINKDB_URL;

if (connectionString === undefined) {
  console.error("Please set the COMPOSE_RETHINKDB_URL environment variable");
  process.exit(1);
}

let options = parseRethinkdbUrl(connectionString);

// The SSL certificate is available from the deployment overview page
let caCert = fs.readFileSync(process.env.PATH_TO_RETHINKDB_CERT);

// Now we can insert the SSL credentials into the options
options.ssl = {
  ca: caCert
};

// Add a word to the database
function addWord(word, definition) {
  return r
    .db("grand_tour")
    .table("words")
    .insert({
      word: word,
      definition: definition
    })
    .run(connection);
}

// Get words from the database
function getWords() {
  return r
    .db("grand_tour")
    .table("words")
    .orderBy("word")
    .run(connection)
    .then(cursor => {
      return cursor.toArray();
    });
}

// With the database going to be open as some point in the future, we can
// now set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + "/public"));

// The user has clicked submit to add a word and definition to the database
// Send the data to the addWord function and send a response if successful
app.put("/words", (request, response) => {
  addWord(request.body.word, request.body.definition)
    .then(resp => {
      response.status(200).send(resp);
    })
    .catch(err => {
      console.log(err);
      response.status(500).send(err);
    });
});

// Read from the database when the page is loaded or after a word is successfully added
// Use the getWords function to get a list of words and definitions from the database
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

let connection;

// Make the database connection using the parsed options
// and the SSL certificate, and create the 'grand_tour' database and the `words` table
// if needed. Once done, start the web server.

r
  .connect(options)
  .then(conn => {
    connection = conn;
  })
  .then(() => {
    return r
      .dbList()
      .contains("grand_tour")
      .do(function(exists) {
        return r.branch(
          exists,
          {
            dbs_created: 0
          },
          r.dbCreate("grand_tour")
        );
      })
      .run(connection);
  })
  .then(result => {
    if (result.dbs_created > 0) {
      console.log("DB created");
    }
    return r
      .db("grand_tour")
      .tableList()
      .contains("words")
      .do(exists => {
        return r.branch(
          exists,
          {
            tables_created: 0
          },
          r.db("grand_tour").tableCreate("words", {
            replicas: 3
          })
        );
      })
      .run(connection);
  })
  .then(result => {
    if (result.tables_created > 0) {
      console.log("Table created");
    }
    // Listen for a connection.
    app.listen(port, () => {
      console.log("Server is listening on port " + port);
    });
  })
  .catch(err => {
    console.error(err);
  });
