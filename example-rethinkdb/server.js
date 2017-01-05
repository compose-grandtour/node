// First add the obligatory web framework
var express = require('express');
var app = express();
var fs = require('fs');

var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
  extended: false
}));

// We want to extract the port to publish our app on
var port = process.env.PORT || 8080;

// Then we'll pull in the database client library
var r = require("rethinkdb");

// We need to parse the connection string for the deployment
var parseRethinkdbUrl = require('parse-rethinkdb-url');

// you can get your connection string from the deployment overview page
var connectionString = '[connectionString]';
var options = parseRethinkdbUrl(connectionString);

var connection;

// Make the database connection using the parsed options
// and the SSL certificate, and create the 'examples' database.
// The SSL certificate is available from the deployment overview page
// If the database already exists RethinkDB returns an error, which will appear in the console
fs.readFile('./cacert', function(err, caCert) {
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




// With the database going to be open as some point in the future, we can
// now set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + '/public'));

// When a user clicks 'add' we add their input to the 'words' table
app.put("/words", function(request, response) {
  r.db("examples").table("words").insert({
      "word": request.body.word,
      "definition": request.body.definition
  }).run(connection, function(error,cursor) {
    if (error) {
      response.status(500).send(error);
    } else {
      response.send("ok");
    }
  });
});

// Then we create a route to handle our example database call
app.get("/words", function(request, response) {

    // we make a database request for the contents of the 'words' table
    // ordering the results alphabetically
    r.db("examples").table("words").orderBy("word").run(connection, function(err, cursor) {

        if (err) throw err;

        // then we convert the response to an array and send it back to 'main.js'
        cursor.toArray(function(err, results) {
          if (err) throw err;
          response.send(results);
      });

    });

});

// Listen for a connection.
app.listen(port,function(){
  console.log('Server is listening on port ' + port);
});
