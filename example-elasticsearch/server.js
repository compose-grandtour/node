'use strict';
// Add the express web framework
const express = require('express');
const app = express();

// Use body-parser to handle the PUT data
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: false
}));

// Set up the Elasticsearch client connection
// Alternatively, you could export this from a separate file, eg connections.js
let elasticsearch=require('elasticsearch');
let hostList = process.env.COMPOSEELASTICSEARCHURL.split(',');
let client = new elasticsearch.Client( {
  hosts: hostList
});

// We want to extract the port to publish our app on
let port = process.env.PORT || 8080;

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

// Create the index if it doesn't already exist
let checkIndices = () => {
  client.indices.exists({
    index:'examples'
  },function(err,resp,status) {
    if (resp === false) {
      client.indices.create({
        index: 'examples'
      },function(err,resp,status) {
        if(err) {
          console.log(err);
        }
      });
    }
  });
};

// Check for an existing index
checkIndices();

// Add a word to the index
let addWord = (request) => {
  return new Promise(function(resolve, reject) {
    let now = new Date();
    client.index({
      index: 'examples',
      type: 'words',
      body: {
        "word": request.body.word,
        "definition": request.body.definition,
        "added": now
      }
    },function(err,resp,status) {
      if (err) {
        reject(err);
      } else {
        console.log(resp);
        resolve(resp);
      }
    });
  });
};

// Get words from the index
let getWords = () => {
  return new Promise(function(resolve, reject) {
    client.search({
      index: 'examples',
      type: 'words',
      _source: ['word','definition'],
      body: {
        sort: {
          'added' : {
            order: 'desc'
          }
        }
      }
    },function (err,resp,status) {
      if (err) {
        reject(err);
      } else {
        let words = [];
        resp.hits.hits.forEach(function(hit){
          words.push( { "word" : hit._source.word , "definition" : hit._source.definition } );
        });
        resolve(words);
      }
    });
  });
};

// The user has clicked submit to add a word and definition to the index
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
