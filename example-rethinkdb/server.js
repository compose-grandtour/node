"use strict";
/* jshint node:true */

// Add the express web framework
const express = require("express");
const app = express();
const fs = require("fs");

// Use body-parser to handle the PUT data
const bodyParser = require("body-parser");
app.use(
    bodyParser.urlencoded({
        extended: false
    })
);

// We want to extract the port to publish our app on
let port = process.env.PORT || 8080;

// Then we'll pull in the database client library
const r = require("rethinkdb");

// We need to parse the connection string for the deployment
let parseRethinkdbUrl = require("parse-rethinkdb-url");

// you can get your connection string from the deployment overview page
let connectionString = process.env.COMPOSE_RETHINKDB_URL;

if (connectionString === undefined) {
    console.error("Please set the COMPOSE_RETHINKDB_URL environment variable");
    process.exit(1);
}

let options = parseRethinkdbUrl(connectionString);
let connection;

// Make the database connection using the parsed options
// and the SSL certificate, and create the 'examples' database.
// The SSL certificate is available from the deployment overview page
// If the database already exists RethinkDB returns an error, which will appear in the console
let caCert = fs.readFileSync(process.env.PATH_TO_RETHINKDB_CERT);

// Now we can insert the SSL credentials
options.ssl = {
    ca: caCert
};

r.connect(options).then(function(conn) {
    connection = conn;
}).then(function(x) {
    return r.dbList().contains("grand_tour").do(
        function(exists) {
            return r.branch(exists, { "dbs_created": 0 },
                r.dbCreate("grand_tour"));
        }).run(connection);
}).then(function(result) {
    if (result.dbs_created > 0) { console.log("DB created"); }
    return r.db("grand_tour").tableList().contains("words").do(
        function(exists) {
            return r.branch(exists, { "tables_created": 0 },
                r.db("grand_tour").tableCreate("words", { replicas: 3 })
            );
        }).run(connection);
}).then(function(result) {
    if (result.tables_created > 0) { console.log("Table created"); }
}).catch(function(err) {
    console.err(err);
});

// Add a word to the database
function addWord(word, definition) {
    return new Promise(function(resolve, reject) {
        r
            .db("grand_tour")
            .table("words")
            .insert({
                word: word,
                definition: definition
            })
            .run(connection, function(error, cursor) {
                if (error) {
                    reject(error);
                } else {
                    resolve(cursor);
                }
            });
    });
}

// Get words from the database
function getWords() {
    return new Promise(function(resolve, reject) {
        // we make a database request for the contents of the 'words' table
        // ordering the results alphabetically
        r
            .db("grand_tour")
            .table("words")
            .orderBy("word")
            .run(connection, function(err, cursor) {
                if (err) {
                    reject(err);
                } else {
                    // then we convert the response to an array and send it back to 'main.js'
                    cursor.toArray(function(err, results) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(results);
                        }
                    });
                }
            });
    });
}

// With the database going to be open as some point in the future, we can
// now set up our web server. First up we set it to server static pages
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