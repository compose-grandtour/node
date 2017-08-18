$(document).ready(function() {

  function reload(currentWord) {
    $('#messages').html("<span>Refreshing network from '" + currentWord + "'...</span>").fadeIn();
    $.ajax({
        url: '/words',
        type: 'GET',
        data: {word: currentWord },
        success: function(data) {
          console.log("data:", data);

          var rawNodes = [];
          var rawEdges = [];
          var colors = {"word": "#D2E5FF", "definition": "#CCC"};
          var shapes = {"word": "circle", "definition": "box"};
          
          data.forEach(function(item) {
            
            var vertex = item.objects[0];
              vertex.forEach(function(word){
                var definesID = 0;
                // console.log(word.objects);
                word.objects.forEach(function(wordObject){
                  // console.log(wordObject.properties.text[0].value);
                  // console.log(wordObject.label);
                  // add the node
                  var nodeObject = {
                    id: wordObject.id,
                    label: wordObject.properties.text[0].value,
                    color: colors[wordObject.label],
                    shape: shapes[wordObject.label],
                  };
                  // console.log(nodeObject);
                  var found = rawNodes.some(function (el) {
                  return  el.id === wordObject.id;
                  });
                  if (!found) { rawNodes.push(nodeObject) };

                  // add the edge
                  if (definesID == 0) {
                    definesID = wordObject.id;
                  }
                  else {
                    var edgeObject = {
                      color: colors[wordObject.label]
                    };
                    if ( wordObject.label === 'word' ){
                      edgeObject.from = definesID;
                      edgeObject.to = wordObject.id;
                      var found = rawEdges.some(function (el) {
                        return  el.from === definesID && el.to === wordObject.id;
                      });
                    }
                    else {
                      edgeObject.from = wordObject.id;
                      edgeObject.to = definesID;
                      var found = rawEdges.some(function (el) {
                        return  el.to === definesID && el.from === wordObject.id;
                      });
                    }
                    
                    if (!found) { rawEdges.push(edgeObject) };
                    definesID = wordObject.id;
                  
                  }

                });
                
              });

          });
        
          // create an array with nodes
          var nodes = new vis.DataSet(rawNodes);

          // create an array with edges
          var edges = new vis.DataSet(rawEdges);

          // create a network
          var container = document.getElementById('mynetwork');

          // provide the data in the vis format
          var data = {
              nodes: nodes,
              edges: edges
          };
          var options = {
            height: '100%',
            width: '100%',
            edges:{
              arrows: 'to',
            }
          };

          // initialize your network!
          var network = new vis.Network(container, data, options);
          $('#messages').hide().html("<span>Viewing network from '" + currentWord + "'</span>").fadeIn();

          // load subgraph for a clicked node
          network.on("select", function (params) {
            var clickedWord = rawNodes.find(x => x.id === params.nodes[0]).label;
            reload(clickedWord);
          });

        },
        error: function(response) {
          console.log(response);
          $('#messages').hide().html("<span>" + response.responseText + "</span>").fadeIn();
        }

    });

    $.ajax({
        url: '/list',
        type: 'GET',
        success: function(data) {
          var selections;

          data.forEach(function(item) {
            selections += "<option value=\"" +item + "\">" + item + "</option>";
          });

          $('#allWords').empty().append(selections);
        }
    });

  }

  $('#add-word').submit(function(e) {
    e.preventDefault();
    $('#messages').fadeOut().empty();
    $.ajax({
      url: '/words',
      type: 'PUT',
      data: $(this).serialize(),
      success: function(response) {
        console.log("response back from the PUT: " + response);
        $('#messages').hide().html("<span>" + response + " added!</span>").fadeIn();
        reload(response);
      },
      error: function(response) {
        console.log(response);
        $('#messages').hide().html("<span>" + response.responseText + "</span>").fadeIn();
      }
    });
  });

  $('#view-word').submit(function(e) {
    e.preventDefault();
    var word = $('select#allWords').val();
    reload(word);
    $('#chosenWord').val(word);
    $('#chosenDef').val('');
  });

  // load data on start
  reload('hello');

});
