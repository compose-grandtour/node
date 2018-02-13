'use strict';
/* jshint node:true */

// First add the obligatory web framework
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
  extended: false
}));

// We want to extract the port to publish our app on
var port = process.env.PORT || 8080;

// Set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + '/public'));

// Create empty object to contain user-added words
let words = [];

// Function to add a word and its definition to the database
// or in this case, add them to the words object
function addWord(userInput) {
  return new Promise(function(resolve, reject) {
    words.push({
      'word': userInput.body.word,
      'definition': userInput.body.definition
    });
    resolve("ok");
  });
}

// Get a list of words and definitions from the database
function getWords() {
  return new Promise(function(resolve, reject) {
    // normally you'd have a fuction here to get words from the database
    resolve(words);
  });
}

// The user has clicked submit to add a word and definition to the index
// Send the data to the addWord function and send a response if successful
app.put("/words", function(request, response) {
  addWord(request).then(function(resp) {
    response.send(resp);
  }).catch(function (err) {
      console.log(err);
    });
});

// Read from the database when the page is loaded or after a word is successfully added
// Use the getWords function to get a list of words and definitions from the index
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
