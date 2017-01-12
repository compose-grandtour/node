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
var caCert = fs.readFile('./caCert.pem');

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

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

app.put("/words", function(request, response) {
  // set up a new client using our config details
  var client = new pg.Client(config);
  client.connect(function(err) {
    if (err) {
     response.status(500).send(err);
    } else {
      var queryText = 'INSERT INTO words(word,definition) VALUES($1, $2)';

      client.query(queryText, [request.body.word,request.body.definition], function (error,result){
        if (error) {
         response.status(500).send(error);
        } else {
         response.send(result);
        }
      });
    }
  });
});

// Read from the database when someone visits /words
app.get("/words", function(request, response) {
  // set up a new client using our config details
  var client = new pg.Client(config);
  // connect to the database
  client.connect(function(err) {

    if (err) throw err;

    // execute a query on our database
    client.query('SELECT * FROM words ORDER BY word ASC', function (err, result) {
      if (err) {
       response.status(500).send(err);
      } else {
       response.send(result.rows);
      }

    });

  });

});

// Listen for a connection.
app.listen(port,function(){
  console.log('Server is listening on port ' + port);
});
