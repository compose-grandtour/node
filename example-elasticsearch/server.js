'use strict';
/* jshint node:true */

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
let elasticsearch = require('elasticsearch');

let connectionString = process.env.COMPOSE_ELASTICSEARCH_URL;

if (connectionString === undefined) {
    console.error("Please set the COMPOSE_ELASTICSEARCH_URL environment variable");
    process.exit(1);
}
let hostList = connectionString.split(',');

let client = new elasticsearch.Client({
    hosts: hostList
});

// We want to extract the port to publish our app on
let port = process.env.PORT || 8080;

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

// Create the index if it doesn't already exist
function checkIndices() {
    client.indices.exists({
        index: 'grand_tour'
    }, function(err, resp, status) {
        if (resp === false) {
            client.indices.create({
                index: 'grand_tour',
                body: {
                    mappings: {
                        "words": {
                            "properties": {
                                "word": { "type": "text" },
                                "definition": { "type": "text" },
                                "added": { "type": "date" }
                            }
                        }
                    }
                }
            }, function(err, resp, status) {
                if (err) {
                    console.log(err);
                }
            });
        }
    });
}

// Check for an existing index
checkIndices();

// Add a word to the index
function addWord(word, definition) {
    return new Promise(function(resolve, reject) {
        let now = new Date();
        client.index({
            index: 'grand_tour',
            type: 'words',
            body: {
                "word": word,
                "definition": definition,
                "added": now
            },
            refresh: "wait_for"
        }, function(err, resp, status) {
            if (err) {
                reject(err);
            } else {
                resolve(resp);
            }
        });
    });
}

// Get words from the index
function getWords() {
    return new Promise(function(resolve, reject) {
        client.search({
            index: 'grand_tour',
            type: 'words',
            _source: ['word', 'definition'],
            body: {
                sort: {
                    'added': {
                        order: 'desc'
                    }
                }
            }
        }, function(err, resp, status) {
            if (err) {
                reject(err);
            } else {
                let words = [];
                resp.hits.hits.forEach(function(hit) {
                    words.push({ "word": hit._source.word, "definition": hit._source.definition });
                });
                resolve(words);
            }
        });
    });
}

// The user has clicked submit to add a word and definition to the index
// Send the data to the addWord function and send a response if successful
app.put("/words", function(request, response) {
    addWord(request.body.word, request.body.defintion).then(function(resp) {
        response.send(resp);
    }).catch(function(err) {
        console.log(err);
        response.status(500).send(err);
    });
});

// Read from the database when the page is loaded or after a word is successfully added
// Use the getWords function to get a list of words and definitions from the index
app.get("/words", function(request, response) {
    getWords().then(function(words) {
        response.send(words);
    }).catch(function(err) {
        console.log(err);
        response.status(500).send(err);
    });
});

// Listen for a connection.
app.listen(port, function() {
    console.log('Server is listening on port ' + port);
});