$(document).ready(function() {

  function reload() {
    $('.hidden').fadeOut();
    $('displayOutput').empty();
    $.get( '/words', function(data) {
      var rendered = "<ul>";
      for (var word in data) {
        var definition = data[word];
        rendered = rendered + "<li>The word <b>" + word + "</b> is defined as <b>" + definition + "</b></li>";
      }
      rendered = rendered + "</ul>";
      $('#displayOutput').html(rendered);
    });
    $('.hidden').fadeIn();
  }

  $('#add-word').submit(function(e) {
    e.preventDefault();

    $.ajax({
      url: '/words',
      type: 'PUT',
      data: $(this).serialize(),
      success: function(data) {
        reload();
      }
    });
  });

  // load data on start
  reload();

});
