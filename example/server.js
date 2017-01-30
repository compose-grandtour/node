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
var words = [];

// Add a word and its definition to the database when the user clicks 'Add'
app.put("/words", function(request, response) {
  words.push({'word': request.body.word , 'definition': request.body.definition});
  response.send('ok');
});

// Get the words and their definitions from the words object
// when the page loads or a new word has been added
app.get("/words", function(request, response) {
 response.send(words);
});

// Listen for a connection.
app.listen(port,function(){
  console.log('Server is listening on port ' + port);
});
