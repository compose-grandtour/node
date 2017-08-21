// First add the obligatory web framework
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const curl = require('curlrequest');

app.use(bodyParser.urlencoded({
  extended: false
}));

// Util is handy to have around, so thats why that's here.
const util = require('util')
// and so is assert
const assert = require('assert');

// We want to extract the port to publish our app on
let port = process.env.PORT || 8080;

// Set up the connection to JanusGraph using the connection string from your deployment overview
let sessionUrl = process.env.COMPOSE_JANUSGRAPH_URL;

// we can parse sessionUrl to get a url to use once we have a token
let splitter = new RegExp(':|\/|@');
let parts = sessionUrl.split(splitter);
let authedUrl = 'https://'+ parts[5] + ':' + parts[6];


process.on('unhandledRejection', function (reason, promise) {
    console.log('Unhandled rejection', {reason: reason, promise: promise})
});

let jgToken;
let retrying = false;

let authOptions = { url: sessionUrl, include: true, insecure: true };

// 1. Get an authorization token
// 2. (optional) Delete existing graph and Create the example database
// 3. Open the example database
// 4. Initialise with some data

getToken().then(function(response,err){
  jgToken = response;
  jgQuery(createGraph).then(function(response) {
    console.log(response);

    // uncomment the next block to delete and recreate the graph when the app starts

    // START delete and recreate block

    jgQuery(openGraph).then(function(response, err) {
      console.log("[+] Opened graph");
      jgQuery(resetGraph).then(function(response, err) {
        console.log("[+] Reset graph");   
        jgQuery(initialise).then(function(response, err) {
          wordsInfo = JSON.parse(response);
          console.log("[+] Initialised");
        });
      });
    });

    // END delete and recreate block
    
}).catch(function (err) {
      console.log("createGraph error: ",err);
    });
}).catch(function (err) {
  console.log("error: ", err);
  // reject(err);
});

// Get an authorization token

function getToken() {
  return new Promise(function(resolve, reject) {
    curl.request(authOptions, function (err, parts) {
      if (err) {
          console.log(err);
          reject(err);
      } else {
        parts = parts.split('\r\n');
        let tokenInfo = JSON.parse(parts.pop());
        console.log("[+] Token: ", tokenInfo.token);
        resolve(tokenInfo.token);
      }
    });
  });
};

// Define Gremlin commands

let createGraph = 'def graph=ConfiguredGraphFactory.create(\'mywords\');0;';
let openGraph = 'def graph=ConfiguredGraphFactory.open(\'mywords\');';
let traverseGraph = 'def g=ConfiguredGraphFactory.open(\'mywords\').traversal();';

let resetGraph = traverseGraph;
resetGraph += 'g.V().hasLabel(\'word\').drop().iterate();';
resetGraph += 'g.V().hasLabel(\'definition\').drop().iterate();';

let initialise = openGraph;

// add some words to the graph
initialise += 'def w1 = graph.addVertex(T.label, \'word\', \'text\', \'hello\');';
initialise += 'def w2 = graph.addVertex(T.label, \'word\', \'text\', \'world\');';
initialise += 'def d1 = graph.addVertex(T.label, \'definition\', \'text\', \'a greeting\');';
initialise += 'def d2 = graph.addVertex(T.label, \'definition\', \'text\', \'a planet\');';

// add 'definition' edges
initialise += 'd1.addEdge(\'definition\', w1, \'weight\', 0.5d);';
initialise += 'd2.addEdge(\'definition\', w2, \'weight\', 0.5d);';

// add a 'follows' edge
initialise += 'w2.addEdge(\'follows\', w1, \'weight\', 0.5d);';
  
initialise += 'graph.tx().commit();';

let queryTest = traverseGraph;
queryTest += 'def query=g.V().has(\'text\', \'hello\').next();';
queryTest += 'g.V(query).out(\'definition\').values(\'text\');';

// Use CURL to pass Gremlin commands to JanusGraph
function jgQuery(gremlinCommand) {
  let wordsOptions = { 
    url: authedUrl,
    headers: { Authorization: 'Token ' + jgToken },
    insecure: true,
    data: '{"gremlin": "' + gremlinCommand + '"}'
  };

  // console.log(wordsOptions);
  return new Promise(function(resolve, reject) {
    let response = {};
    curl.request(wordsOptions, function (err, parts, meta) {
      if (err) {
        console.log(err);
          reject(err);
      } else {
        // console.log(meta);
        // console.log(parts);
        parts = parts.split('\r\n');
        response = parts.pop()
          , head = parts.pop();
        if (response) {
          resolve(response);
        }
        else {
          console.log("token expired");
          getToken().then(function(response,err){
            jgToken = response;
            console.log("got a new token");
          }).catch(function (err) {
            reject(err);
          });
          reject("tokenerr");
        }
      }
    });
  
  });

};


// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

// List all the words in the database
function listWords() {
  return new Promise(function(resolve, reject) {
    let gremlinQuery = traverseGraph;
    gremlinQuery += 'def wQuery=g.V().hasLabel(\'word\').values(\'text\').order();'
    jgQuery(gremlinQuery).then(function(response, err) {
      if (err) {
        console.log("error in listWords");
        reject(err);
      }
      wordsInfo = JSON.parse(response);
      resolve(wordsInfo.result.data);
    }).catch(function (err) {
      console.log("listWords error: ", err);
      reject(err);
    });
  });
};

// Get words from the database
function getWords(request) {
  
  return new Promise(function(resolve, reject) {
    
    let gremlinQuery = traverseGraph;
    gremlinQuery += 'def wQuery=g.V().has(\'text\', \'' + request.query.word + '\').next();'
  
    // use the connected components recipe (http://tinkerpop.apache.org/docs/current/recipes/#connected-components)
    gremlinQuery += 'g.V(wQuery).emit(cyclicPath().or().not(__.in())).repeat(__.in()).until(cyclicPath()).aggregate(\'p\').by(path()).cap(\'p\').unfold().limit(local, 1).dedup().map(__.as(\'v\').select(\'p\').unfold().filter(unfold().where(eq(\'v\'))).unfold().dedup().order().by(id).fold()).dedup().path();';

    jgQuery(gremlinQuery).then(function(response, err) {
      if (err) {
        console.log("error in getWords");
        reject(err);
      }
      wordsInfo = JSON.parse(response);
      resolve(wordsInfo.result.data);
    }).catch(function (err) {
      console.log("getWords error: ", err);
      reject(err);
    });
  });
};

// is word already in our graph?
function checkVertex(request) {
  console.log("[?] Check vertex: %s: %s", request.label, request.text);
  return new Promise(function(resolve,reject) {

    let gremlinQuery = traverseGraph;
    gremlinQuery += 'def wQuery=g.V().hasLabel(\'' + request.label + '\').has(\'text\', \'' + request.text + '\').values(\'text\').as(\'w\');';
    
    jgQuery(gremlinQuery).then(function(response) {
      wordsInfo = JSON.parse(response);
      // console.log(wordsInfo);
      
      if ( wordsInfo.result.data[0] ) {
       resolve("[x] Already exists " + request.label + ": " + request.text);
      }
      else {
        addVertex(request).then(function(resp) {
          resolve(resp);
        }).catch(function (err) {
            console.log(err);
            reject(err);
        });
      }
    }).catch(function (err) {
      console.log(err);
      reject(err);
    });
  });
};

function checkEdge(vertices) {
  console.log("[?] Check edge: %s -> %s -> %s", vertices.word2, vertices.edgeType, vertices.word1);
  return new Promise(function(resolve,reject) {
    let gremlinQuery = traverseGraph;
    gremlinQuery += 'def eQuery=g.V().hasLabel(\'word\').has(\'text\', \'' + vertices.word1 + '\').in(\'' + vertices.edgeType + '\').has(\'text\', \'' + vertices.word2 + '\').valueMap();';
    jgQuery(gremlinQuery).then(function(response) {
      wordsInfo = JSON.parse(response);

      if ( wordsInfo.result.data[0] ) {
       resolve("[x] Edge already exists");
      }
      else {
        
        addEdge(vertices).then(function(resp) {
          resolve("[+] Edge: " + vertices.edgeType);
        }).catch(function (err) {
            console.log(err);
            reject(err);
        });
      }
    
    }).catch(function (err) {
      console.log(err);
      reject(err);
    });

  });
  
};

// Add a vertex to the database
function addVertex(vertex) {
  return new Promise(function(resolve, reject) {
    let gremlinQuery = openGraph;
    gremlinQuery += 'def v1 = graph.addVertex(T.label, \'' + vertex.label + '\', \'text\', \'' + vertex.text + '\');';
    gremlinQuery += 'graph.tx().commit();';
    jgQuery(gremlinQuery).then(function(response) {
      wordsInfo = JSON.parse(response);
      
      resolve("[+] Vertex: " + vertex.label + ": " + vertex.text);
    }).catch(function (err) {
      console.log(err);
      reject(err);
    });
  });
};

// Add an edge to the database
function addEdge(vertices) {
  return new Promise(function(resolve, reject) {
    let gremlinQuery = openGraph;
    gremlinQuery += traverseGraph;
    gremlinQuery += 'def w1=g.V().hasLabel(\'word\').has(\'text\', \'' + vertices.word1 + '\').next();';
    gremlinQuery += 'def w2=g.V().has(\'text\', \'' + vertices.word2 + '\').next();';
    gremlinQuery += 'w2.addEdge(\'' + vertices.edgeType + '\', w1, \'weight\', 0.5d);';
    gremlinQuery += 'graph.tx().commit();';
    jgQuery(gremlinQuery).then(function(response) {
      wordsInfo = JSON.parse(response);
      resolve("ok");
    }).catch(function (err) {
      console.log(err);
      reject(err);
    });
  });
};

// The user has clicked submit to add a word and definition to the database
app.put("/words", function(request, response) {
  console.log("[?] PUT request: ",request.body);
  let word1Label = 'word';
  let word2Label = (request.body.edgeType === 'definition') ? 'definition' : 'word' ;
  checkVertex({label: word1Label, text:request.body.word1}).then(function(resp) {
    console.log(resp);
    checkVertex({label: word2Label, text:request.body.word2}).then(function(resp){
      console.log(resp);
      checkEdge(request.body).then(function(resp){
        console.log(resp);
        response.send(request.body.word1);
      });
    });
  }).catch(function (err) {
    console.log("[!] addWord error: %s",err);
    response.status(500).send({err});
  });
  });
  
  // Read from the database when the page is loaded or after a word is successfully added
  // Use the getWords function to get a list of words and definitions from the database
  app.get("/words", function(request, response) {
  console.log("[?] GET request: ",request.query);
  getWords(request).then(function(words) {
    response.send(words);
  }).catch(function (err) {
      console.log("[!] getWords error:",err);
      response.status(500).send(err);
    });
  });
  
  // Use the listWords function to get a list of words in the database
  app.get("/list", function(request, response) {
  console.log("[?] List all words");
   listWords(request).then(function(words) {
    response.send(words);
  }).catch(function (err) {
      console.log("[!] listWords error:",err);
      response.status(500).send(err);
    });
  });
  
  // Listen for a connection.
  app.listen(port,function(){
  console.log('Server is listening on port ' + port);
  });