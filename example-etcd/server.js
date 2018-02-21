"use strict";
/* jshint node:true */

// Add the express web framework
const express = require("express");
const app = express();

// Use body-parser to handle the PUT data
const bodyParser = require("body-parser");
app.use(
    bodyParser.urlencoded({
        extended: false
    })
);

// Then we'll pull in the database client library
const Etcd = require("node-etcd");

// Use your connection string from the deployment overview page
let connectionString = process.env.COMPOSE_ETCD_URL;

if (connectionString === undefined) {
    console.error("Please set the COMPOSE_ETCD_URL environment variable");
    process.exit(1);
}
// We need to parse the string to get the various pieces out to pass to Etcd
let splitter = new RegExp(":|/|@");
let parts = connectionString.split(splitter);
let hosts = "https://" + parts[5] + ":" + parts[6];
let auth = {
    user: parts[3],
    pass: parts[4]
};

// Create auth credentials
let opts = {
    auth: auth
};

// We want to extract the port to publish our app on
let port = process.env.PORT || 8080;

// Add a word to the database
function addWord(word, definition) {
    return new Promise(function(resolve, reject) {
        // set up a new client using our config details
        let etcd = new Etcd(hosts, opts);
        // execute a query on our database
        etcd.set(word, definition, function(err, result) {
            if (err) {
                reject(err);
            } else {
                console.log(result);
                resolve(result);
            }
        });
    });
}

// Get words from the database
function getWords() {
    return new Promise(function(resolve, reject) {
        // set up a new client using our config details
        let etcd = new Etcd(hosts, opts);
        // execute a query on our database
        etcd.get("/", function(err, result) {
            if (err) {
                reject(err);
            } else {
                let words = [];
                result.node.nodes.forEach(function(word) {
                    words.push({ word: word.key, definition: word.value });
                });
                resolve(words);
            }
        });
    });
}

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + "/public"));

// The user has clicked submit to add a word and definition to the database
// Send the data to the addWord function and send a response if successful
app.put("/words", function(request, response) {
    addWord(request.body.word, request.body.definition)
        .then(function(resp) {
            response.send(resp);
        })
        .catch(function(err) {
            console.log(err);
            response.status(500).send(err);
        });
});

// Read from the database when the page is loaded or after a word is successfully added
// Use the getWords function to get a list of words and definitions from the database
app.get("/words", function(request, response) {
    getWords()
        .then(function(words) {
            response.send(words);
        })
        .catch(function(err) {
            console.log(err);
            response.status(500).send(err);
        });
});

// Listen for a connection.
app.listen(port, function() {
    console.log("Server is listening on port " + port);
});