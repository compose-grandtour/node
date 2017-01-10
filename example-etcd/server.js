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

app.put("/words", function(request, response) {
  // set up a new client using our config details
  var etcd = new Etcd(hosts, opts);
  // execute a query on our database
  etcd.set(request.body.word,request.body.definition,function(err,result) {
    if (err) {
      console.log(err.httperror);
      throw err;
    }
    response.send("ok");
  });

});

// Read from the database when someone visits /words
app.get("/words", function(request, response) {
    // set up a new client using our config details
    var etcd = new Etcd(hosts, opts);
    // execute a query on our database
    etcd.get('/', function(err, result) {
      if (err) {
        console.log(err);
        response.status(500).send(err);
      } else {
        // get the words from the index
        var words = [];
        result.node.nodes.forEach(function(word){
          words.push( { "word" : word.key , "definition" : word.value  } );
        });
        console.log(words);
        response.send(words);
      }
    });
});

// Listen for a connection.
app.listen(port,function(){
  console.log('Server is listening on port ' + port);
});
