'use strict';
// Add the express web framework
const express = require('express');
const fs = require('fs');
const app = express();

// Use body-parser to handle the PUT data
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: false
}));

// Then we'll pull in the database client library
const MongoClient = require('mongodb').MongoClient;

// Set up the connection to MongoDB using the connection string from your deployment overview
let connectionString = process.env.COMPOSE_MONGODB_URL;
let connectionCertPath = process.env.PATH_TO_MONGODB_CERT;

if (connectionString===undefined) {
  console.error("Please set the COMPOSE_MONGODB_URL environment variable")
  process.exit(1);
}
// Setting nothing in the options will assume no SSL
let options = {}

// If the path to the certificate is set, we assume SSL.
// Therefore we read the cert and set the options for a validated SSL connection
if (connectionCertPath) {
  var ca = [fs.readFileSync(connectionCertPath)];
  options = {
    ssl: true,
    sslValidate: true,
    sslCA: ca
  };
}

// We want to extract the port to publish our app on
let port = process.env.PORT || 8080;

// This is a global variable we'll use for handing the MongoDB client around
let mongodb;

// This is the MongoDB connection.
MongoClient.connect(connectionString, options, function (err, db) {
  // Here we handle the async response. This is a simple example and
  // we're not going to inject the database connection into the
  // middleware, just save it in a global variable, as long as there
  // isn't an error.
  if (err) {
    console.log(err);
  } else {
    // Although we have a connection, it may be to the "admin" 
    // database of MongoDB deployment, depending on the connection
    // string. So, in this example we make sure we use the
    // "grand_tour" database by pointing the mongodb variable to
    // that particular database.
    mongodb = db.db("grand_tour");
  }
}
);

// Add a word to the database
function addWord(request) {
  return new Promise(function (resolve, reject) {
    mongodb.collection("words").insertOne({
      word: request.body.word, definition: request.body.definition
    }, function (error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

// Get words from the database
function getWords() {
  return new Promise(function (resolve, reject) {
    // we call on the connection to return us all the documents in the words collection.
    mongodb.collection("words").find().toArray(function (err, words) {
      if (err) {
        reject(err);
      } else {
        resolve(words);
      }
    });
  });
};

// With the database going to be open as some point in the future, we can
// now set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + '/public'));

// The user has clicked submit to add a word and definition to the database
// Send the data to the addWord function and send a response if successful
app.put("/words", function (request, response) {
  addWord(request).then(function (resp) {
    response.send(resp);
  }).catch(function (err) {
    console.log(err);
    response.status(500).send(err);
  });
});

// Read from the database when the page is loaded or after a word is successfully added
// Use the getWords function to get a list of words and definitions from the database
app.get("/words", function (request, response) {
  getWords().then(function (words) {
    response.send(words);
  }).catch(function (err) {
    console.log(err);
    response.status(500).send(err);
  });
});

// Listen for a connection.
app.listen(port, function () {
  console.log('Server is listening on port ' + port);
});
