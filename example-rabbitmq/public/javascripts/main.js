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
      success: function(data) {
        rendered = "<li>Message sent: " + data + "</li>";
        $('#receivedMessages').prepend(rendered);
        $('.hidden').fadeIn();
      }
    });
  });

  $('#receiveMessage').submit(function(e) {
    e.preventDefault();
    $.ajax({
      url: '/message',
      type: 'GET',
      success: function(data) {
        rendered = "<li>Message received: " + data + "</li>";
        $('#receivedMessages').prepend(rendered);
        $('.hidden').fadeIn();
      }
    });
  });

  // load data on start
  reload();

});
