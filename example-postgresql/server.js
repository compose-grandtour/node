// First add the obligatory web framework
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var fs = require('fs');

app.use(bodyParser.urlencoded({
  extended: false
}));

// We want to extract the port to publish our app on
var port = process.env.PORT || 8080;

// Then we'll pull in the database client library
var pg = require('pg');


// Get your SSL certificate from the Compose deployment overview page
// and save it to a file
var caCert = fs.readFile('./composecert.pem');

// Get your connection string from the Compose deployment overview page
var connectionString = process.env.COMPOSEPOSTGRESQLURL;

// We want to parse connectionString to get username, password, database name, server, port
// So we can use those to connect to the database
var parse = require('pg-connection-string').parse;
config = parse(connectionString);

// And add the ssl
config.ssl = {
  rejectUnauthorized: false,
  ca: caCert
}

// set up a new client using our config details
var client = new pg.Client(config);

client.connect(function(err) {
  if (err) {
   response.status(500).send(err);
  } else {
    client.query('CREATE TABLE words (word varchar(256) NOT NULL, definition varchar(256) NOT NULL)', function (err,result){
      if (err) {
        console.log(err)
      }
    });
  }
});

// Add a word to the database
function addWord(request) {
  return new Promise(function(resolve, reject) {
    var client = new pg.Client(config);
    client.connect(function(err) {
      if (err) {
        reject(err);
      } else {
        var queryText = 'INSERT INTO words(word,definition) VALUES($1, $2)';
        client.query(queryText, [request.body.word,request.body.definition], function (error,result){
          if (error) {
           reject(error);
          } else {
           resolve(result);
          }
        });
      }
    });
  });
};

// Get words from the database
function getWords() {
  return new Promise(function(resolve, reject) {
    var client = new pg.Client(config);
    client.connect(function(err) {
      if (err) reject(err);
      client.query('SELECT * FROM words ORDER BY word ASC', function (err, result) {
        if (err) {
          reject(err);
        } else {
         resolve(result.rows);
        }
      });
    });
  });
};

// We can now set up our web server. First up we set it to serve static pages
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
