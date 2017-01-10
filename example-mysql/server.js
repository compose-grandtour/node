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
var mysql = require('mysql');

// Connect to Redis using a connection string
// Get your connection string from the Compose deployment overview page
var connectionString = process.env.COMPOSEMYSQLURL;

// set up a new connection using our config details
var connection = mysql.createConnection(connectionString);

connection.connect(function(err) {
  if (err) {
   console.log(err);
  } else {
    connection.query('CREATE TABLE words (id int auto_increment primary key, word varchar(256) NOT NULL, definition varchar(256) NOT NULL)', function (err,result){
      if (err) {
        console.log(err)
      }
    });
  }
});

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

app.put("/words", function(request, response) {

      var queryText = 'INSERT INTO words(word,definition) VALUES(?, ?)';

      connection.query(queryText, [request.body.word,request.body.definition], function (error,result){
        if (error) {
          console.log(error);
          response.status(500).send(error);
        } else {
          console.log(result);
          response.send(result);
        }
      });

});

// Read from the database when someone visits /hello
app.get("/words", function(request, response) {

    // execute a query on our database
    connection.query('SELECT * FROM words ORDER BY word ASC', function (err, result) {
      if (err) {
        console.log(err);
       response.status(500).send(err);
      } else {
        console.log(result);
       response.send(result);
      }

    });

});

// Listen for a connection.
app.listen(port,function(){
  console.log('Server is listening on port ' + port);
});
