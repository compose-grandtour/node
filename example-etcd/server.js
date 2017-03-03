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
var Etcd = require('node-etcd');

// Use your connection string from the deployment overview page
var connectionString = process.env.COMPOSEETCDURL;

// We need to parse the string to get the various pieces out to pass to Etcd
var splitter = new RegExp(':|\/|@');
var parts = connectionString.split(splitter);
var hosts = 'https://'+ parts[5] + ':' + parts[6];
var auth = {
    user: parts[3],
    pass: parts[4]
};

// Create auth credentials
var opts = {
    auth: auth
}

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

// Add a word to the database
function addWord(request) {
  return new Promise(function(resolve, reject) {
    // set up a new client using our config details
    var etcd = new Etcd(hosts, opts);
    // execute a query on our database
    etcd.set(request.body.word,request.body.definition,function(err,result) {
      if (err) {
        reject(err);
      }
      else {
        console.log(result);
        resolve(result);
      }
    });
  });
};

// Get words from the database
function getWords() {
  return new Promise(function(resolve, reject) {
    // set up a new client using our config details
    var etcd = new Etcd(hosts, opts);
    // execute a query on our database
    etcd.get('/', function(err, result) {
      if (err) {
        reject(err);
      } else {
        var words = [];
        result.node.nodes.forEach(function(word){
          words.push( { "word" : word.key , "definition" : word.value  } );
        });
        resolve(words);
      }
    });
  });
};

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
