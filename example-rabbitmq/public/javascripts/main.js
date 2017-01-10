$(document).ready(function() {

  function reload() {
    $('.receiveMessage').fadeOut();
    $('receiveMessage').empty();
  }

  $('#sendMessage').submit(function(e) {
    e.preventDefault();

    $.ajax({
      url: '/message',
      type: 'PUT',
      data: $(this).serialize(),
      // success: function(data) {
      //   reload();
      // }
    });
  });

  $('#receiveMessage').submit(function(e) {
    e.preventDefault();
    $.ajax({
      url: '/message',
      type: 'GET',
      success: function(data) {
        console.log("showing", data);
        rendered = "<li>Message: " + data + "</li>";
        $('#receivedMessages').prepend(rendered);
        $('.hidden').fadeIn();
      }
    });
  });

  // load data on start
  reload();

});
