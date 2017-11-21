'use strict';
// Add the express web framework
const express = require('express');
const app = express();

// Use body-parser to handle the PUT data
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: false
}));

// Then we'll pull in the database client library
const { Etcd3 } = require('etcd3');

let endpoints = process.env.COMPOSE_ETCD_ENDPOINTS;
let envuser = process.env.COMPOSE_ETCD_USER
let envpass = process.env.COMPOSE_ETCD_PASS

// Create auth credentials
let opts = {
  hosts: endpoints.split(","),
  auth: {
    username: envuser,
    password: envpass
  }
}

var etcd = new Etcd3(opts).namespace("/grand_tour/words/");

// We want to extract the port to publish our app on
let port = process.env.PORT || 8080;

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

// The user has clicked submit to add a word and definition to the database
// put them into etcd3 and respond
app.put("/words", function (request, response) {
  etcd.put(request.body.word).value(request.body.definition).then(
    (result) => {
      response.send(result);
    }
  ).catch((err) => {
    console.log(err);
    response.status(500).send(err);
  });
});

// Read from the database when the page is loaded or after a word is successfully added
// Get all the keys and values from our namespace, turn them into a JSON document
// with word and definition fields and send that to the browser
app.get("/words", function (request, response) {
    // execute a query on our database
    etcd.getAll().strings().then((values) => {
      let words = [];
      for (const key in values) {
        words.push({ "word": key, "definition": values[key] });
      };
      response.send(words);
    }
    ).catch((err) => {
      console.log(err);
      response.status(500).send(err);    
    });
  });

// Listen for a connection.
app.listen(port, function () {
  console.log('Server is listening on port ' + port);
});
