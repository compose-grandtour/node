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
var redis = require("redis");

// Connect to Redis using a connection string
// Get your connection string from the Compose deployment overview page
var connectionString = process.env.COMPOSEREDISURL;
var client=redis.createClient(connectionString);

client.on("error", function (err) {
    console.log("Error " + err);
});

// We can now set up our web server. First up we set it to server static pages
app.use(express.static(__dirname + '/public'));

app.put("/words", function(request, response) {

  // use the connection to add the word and definition entered by the user
  client.hset("words", request.body.word, request.body.definition, function(error, result) {
      if (error) {
        response.status(500).send(error);
      } else {
        response.send("success");
      }
    });
});

// Then we create a route to handle our example database call
app.get("/words", function(request, response) {

    // and we call on the connection to return us all the documents in the
    // words hash.

    client.hgetall("words",function(err, resp) {
      if (err) {
        response.status(500).send(err);
      } else {
        response.send(resp);
      }
    });
});

// Listen for a connection.
app.listen(port,function(){
  console.log('Server is listening on port ' + port);
});
