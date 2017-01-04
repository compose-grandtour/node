 // First add the web framework
var express = require('express');
var app = express();

// Set up the Elasticsearch client connection
// Alternatively, you could export this from a separate file, eg connections.js
var elasticsearch=require('elasticsearch');
var client = new elasticsearch.Client( {
  hosts: [
    'https://[username]:[password]@[server]:[port]/',
    'https://[username]:[password]@[server]:[port]/'
  ]
});

// use body-parser to handle the PUT data
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: false
}));

// We want to extract the port to publish our app on
var port = process.env.PORT || 8080;

// Create the index if it doesn't already exist
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

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

// Add a word and its definition to the index using the data passed from the form
app.put("/words", function(request, response) {
  var now = new Date();
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
      response.status(500).send(err);
    } else {
      response.send(resp);
    }
  });
});

// Read from the database when the page is loaded or when a word is added
app.get("/words", function(request, response) {
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
      response.status(500).send(err);
    } else {
      // get the words from the index
      var words = [];
      resp.hits.hits.forEach(function(hit){
        words.push( { "word" : hit._source.word , "definition" : hit._source.definition } );
      });
      response.send(words);
    }
  });

});

// Listen for a connection.
app.listen(port,function(){
  console.log('Server is listening on port ' + port);
});
