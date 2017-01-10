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
var cassandra = require('cassandra-driver');

// Use the address translator
var compose = require('composeaddresstranslator');

// Connect to ScyllaDB using a connection string
// Get your connection string and mapping details from the Compose deployment overview page.
// Store the connection string as an environment variable
var connectionString = process.env.COMPOSESCYLLADBURL;
var maps = {[maps]};

// get a username and password from the uri
const url = require('url');
myURL = url.parse(connectionString);
auth = myURL.auth;
splitAuth = auth.split(":");
username = splitAuth[0];
password = splitAuth[1];

// get contactPoints for the connection
translator=new compose.ComposeAddressTranslator();
translator.setMap(maps);

var authProvider = new cassandra.auth.PlainTextAuthProvider(username, password)
var uuid = require('uuid')

client = new cassandra.Client({
  contactPoints: translator.getContactPoints(),
  policies: {
    addressResolution: translator
  },
  authProvider: authProvider
});

// create a keyspace and a table if they don't already exist
client.execute("CREATE KEYSPACE IF NOT EXISTS examples WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '3' };", function(error,result){
  if (error) {
      console.log(error);
    } else {
      console.log(result);
      client.execute("CREATE TABLE IF NOT EXISTS examples.words (my_table_id uuid, word text, definition text, PRIMARY KEY(my_table_id));", function(err,res){
        if (err) {
            console.log(err);
          } else {
            console.log(res);
          }
      });
    }
});

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

app.put("/words", function(request, response) {

  client.execute("INSERT INTO examples.words(my_table_id, word, definition) VALUES(?,?,?)",
     [uuid.v4(), request.body.word, request.body.definition],
     { prepare: true },
     function(error, result) {
       if (error) {
           console.log(error);
           response.status(500).send(error);
         } else {
           console.log(result.rows);
           response.send(result.rows);
         }
     });

});

// Read from the database when someone visits /hello
app.get("/words", function(request, response) {

    // execute a query on our database
    client.execute('SELECT * FROM examples.words', function (err, result) {
      if (err) {
        console.log(err);
       response.status(500).send(err);
      } else {
        console.log(result.rows);
       response.send(result.rows);
      }

    });

});



// Listen for a connection.
app.listen(port,function(){
  console.log('Server is listening on port ' + port);
});
