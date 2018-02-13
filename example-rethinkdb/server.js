"use strict";
/* jshint node:true */

// Add the express web framework
const express = require('express');
const app = express();
const fs = require('fs');

// Use body-parser to handle the PUT data
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: false
}));

// We want to extract the port to publish our app on
let port = process.env.PORT || 8080;

// Then we'll pull in the database client library
const r = require("rethinkdb");

// We need to parse the connection string for the deployment
let parseRethinkdbUrl = require('parse-rethinkdb-url');

// you can get your connection string from the deployment overview page
let connectionString = process.env.COMPOSE_RETHINKDB_URL;
let options = parseRethinkdbUrl(connectionString);

let connection;

// Make the database connection using the parsed options
// and the SSL certificate, and create the 'examples' database.
// The SSL certificate is available from the deployment overview page
// If the database already exists RethinkDB returns an error, which will appear in the console
let caCert = fs.readFile(process.env.PATH_TO_RETHINKDB_CERT, function(err, caCert) {
  // Now we can insert the SSL credentials
  options.ssl = {
      ca: caCert
  };
  console.log(options);
  r.connect(options, function(error, conn) {
    if (error) throw error;
    else {
      connection = conn;
      r.dbCreate("examples").run(connection);
      r.db("examples").tableCreate("words").run(connection);
    }
  });

});

// Add a word to the database
function addWord(request) {
  return new Promise(function(resolve, reject) {
    r.db("examples").table("words").insert({
        "word": request.body.word,
        "definition": request.body.definition
    }).run(connection, function(error,cursor) {
      if (error) {
        reject(error);
      } else {
        resolve(cursor);
      }
    });
  });
}

// Get words from the database
function getWords() {
  return new Promise(function(resolve, reject) {
    // we make a database request for the contents of the 'words' table
    // ordering the results alphabetically
    r.db("examples").table("words").orderBy("word").run(connection, function(err, cursor) {
        if (err) {
          reject(err);
        } else {
          // then we convert the response to an array and send it back to 'main.js'
          cursor.toArray(function(err, results) {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
        }
    });
  });
}

// With the database going to be open as some point in the future, we can
// now set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + '/public'));


// The user has clicked submit to add a word and definition to the database
// Send the data to the addWord function and send a response if successful
app.put("/words", function(request, response) {
  addWord(request).then(function(resp) {
    response.send(resp);
  }).catch(function (err) {
      console.log(err);
      response.status(500).send(err);
    });
});

// Read from the database when the page is loaded or after a word is successfully added
// Use the getWords function to get a list of words and definitions from the database
app.get("/words", function(request, response) {
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
