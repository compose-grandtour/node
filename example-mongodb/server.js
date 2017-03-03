 // First add the obligatory web framework
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
  extended: false
}));

// We want to extract the port to publish our app on
var port = process.env.PORT || 8080;

// Then we'll pull in the database client library
var MongoClient = require('mongodb').MongoClient;

// Set up the connection to MongoDB using the connection string from your deployment overview
var connectionString = process.env.COMPOSEMONGODBURL;
var options = {
    mongos: {
        ssl: true,
        sslValidate: false,
    }
}

// This is a global variable we'll use for handing the MongoDB client around
var mongodb;

// This is the MongoDB connection.
MongoClient.connect(connectionString, options,function(err, db) {
        // Here we handle the async response. This is a simple example and
        // we're not going to inject the database connection into the
        // middleware, just save it in a global variable, as long as there
        // isn't an error.
        if (err) {
            console.log(err);
        } else {
            // Although we have a connection, it's to the "admin" database
            // of MongoDB deployment. In this example, we want the
            // "examples" database so what we do here is create that
            // connection using the current connection.
            mongodb = db.db("examples");
        }
    }
);

// With the database going to be open as some point in the future, we can
// now set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + '/public'));

// Add a word to the database
function addWord(request) {
  return new Promise(function(resolve, reject) {
    mongodb.collection("words").insertOne( {
      word: request.body.word, definition: request.body.definition}, function(error, result) {
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
  return new Promise(function(resolve, reject) {
    // we call on the connection to return us all the documents in the words collection.
    mongodb.collection("words").find().toArray(function(err, words) {
      if (err) {
       reject(err);
      } else {
       resolve(words);
      }
    });
  });
};

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
