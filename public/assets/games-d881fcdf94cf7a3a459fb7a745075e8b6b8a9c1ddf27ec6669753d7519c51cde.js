
// helpr method to check if input is empty
var input_is_empty = function() {
    var value = $('input#chatbox').val();
    return _.isEmpty( value );
}

// appends message to chatbox
var add_message = function( message ) {
  
    var content = '<div class="chat-box-left">' + message.message + '</div>' + 
                   '<div class="chat-box-name-left">' + message.name + ',' + message.timestamp + '</div>' + 
                    '<hr class="hr-clas" />';
    var pretty_message = $('<div></div>').html(content);

    $("div#message").append( pretty_message );
}

// add return to lobby button
var addReturnButton = function() {
    $("button#quit").remove();
    var content = '<br><br><button type="button" id = "return"' +
    ' class="btn btn-warning" style="background: #540f2a;">RETURN TO LOBBY</button>';
    $("div#buttons").append(content);
     $('button#return').click( function() {
      console.log('return pressed');
           window.location = '/home/index'; 
     });
       
}

// function to handle quit
var handleQuit = function(game_id,socket_id) {
   var URI = '/games/move';
 var payload = {
                source: -1,
                target: -1,
                status: "quit",
                piece: -1,
                newposition: -1,
                game_id: game_id,
                socket_id: socket_id
             };

             console.log(payload);

      $.post( URI, payload,function(response){
                 window.location = "/home/index";
                // add_message(response);
            });
       
}

// send message to controller 
var send_message = function() {
  console.log( 'Button clicked' );
            if ( !input_is_empty() ) {
            var URI = '/chat/message';
            var message = $('input#chatbox').val(); // get message
            console.log(message);
            var payload = {
                message: message,
             };
           
            $.post( URI, payload,function(response){ // send message to controller
                console.log(response)
               
            } );

            $('input#chatbox').val('');

      };

}

// function to handle move received from oponent
var move_piece = function(data,board,game) {
console.log('received data ');
      console.log(data.source);
      console.log(data.target);

      if(data.source == -1 || data.target == -1){  // check if other player has quit
        console.log('quit!!');
       alert("Sorry, unfortunately your oponent left the game!");
       window.location = '/home/index';  // redirect to home page
      }

      var target = data.target;
      var piece = "'" + data.piece + "'";
      var location_string = data.source + "-" + target;

      board.move(location_string);   // move the piece received form oponent
      var move = game.move({
        from: data.source,
        to: data.target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
      });
      console.log(move);
      if (move === null) return 'snapback';

      updateStatus(game); // update status

}

// handle the move: move piece on boar and send it to other player
var handleOnDrop = function(game,source, target,socket_id) {
 // see if the move is legal
      var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
      });
      if (move === null) return 'snapback'; // snapback for invalid move
      console.log(move);
 
        var moveColor = 'white';
          if (game.turn() === 'b') {
             moveColor = 'black';
        }

        var status = null;
        var winner = null;
        var URI = '/games/move';
        console.log(move.piece);
        console.log(move.to);
        if (game.in_checkmate() === true) {  // check for checkmate
           status = "checkmate";
           if(color == moveColor){
              winner = "no";
            } else {
              winner = "yes";
            }
               
        } else if (game.in_draw() === true) {  // check for draw
            status = "draw";
        }  else {                              // game still on
        status = "on";
        }
        var payload = {
          source: move.from,
          target: move.to,
          piece: move.piece,
          //newposition: ChessBoard.objToFen(move.to),
          newposition: game.fen(),
          socket_id: socket_id,
          status: status,
          winner: winner,
          game_id: game_id
        };

      console.log(payload);

      // send the move to controller to handle
      $.post( URI, payload,function(response){
           console.log(response);
                // add_message(response);
      });
      updateStatus(game);                 // update the status

}

 // update the status
 var updateStatus = function(game) {
      var status = '';

      var moveColor = 'white';
      if (game.turn() === 'b') {
        moveColor = 'black';
      }

      // checkmate?
      if (game.in_checkmate() === true) {
        if(color == moveColor){
        status = 'Game over! You are in checkmate!, Good try..';
        } else {
           status = 'Congratulations!! You won!';
        }
        addReturnButton();
      }

      // draw?
      else if (game.in_draw() === true) {
        status = 'Game over!,Sorry, but no more moves are possible! ';
      }

      // game still on
      else {
        status = moveColor + ' to move. ';
        if(moveColor == color){
          status += "Your turn!"
        } else {
          status += "Wait for your oponent's move"
        }
        

        // check?
        if (game.in_check() === true) {
          if(color == moveColor){
            status += ', You are in check! ' + moveColor + ' is in check';
          } else {
            status += 'You checked your oponent';
          }
          
        }
      }

      $('#status').html(status);
    //  fenEl.html(game.fen());
    //  pgnEl.html(game.pgn());
    };

// on page load
$(document).ready( function() {
  // load chess board

  user = $('.temp_information').data('user');
  color = $('.temp_information').data('color');
   game_id = $('.temp_information').data('game');
   fen_string = $('.temp_information').data('fen-string');

  console.log("user is " + user);
  console.log("color is " + color);
  console.log("game id " + game_id);
  console.log("fen string " + fen_string);
  
   var socket_id = null;
   pusher.connection.bind('connected', function () {
     socket_id = pusher.connection.socket_id;
   });
   // subscribe to public chat channel 
   var channel = pusher.subscribe('public-chat');   
    channel.bind('message-sent', function(data) {
      add_message(data);
    });
    // subscribe to chess channel to get move updates from oponent
    var channel = pusher.subscribe('game' + game_id); 
     channel.bind('move', function(data) {
      move_piece(data,board,game);

    });
       // when chat button is pressed.
       $('button#send').click( function() {
         send_message();    
      });

   console.log( 'Games DOM LOADED' );

  
    var board, statusEl = $('#status');
    if(fen_string == "start")
      var game = new Chess(); 
    else
      var game = new Chess(fen_string);
    

    // do not pick up pieces if the game is over
    // only pick up pieces for the side to move
    var onDragStart = function(source, piece, position, orientation) {
      if (game.game_over() === true ||
          (piece.search(/^b/) !== -1 && color == 'white') ||
          (piece.search(/^w/) !== -1 && color == 'black') ||
          (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
          (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        console.log(color);
        console.log(game.turn());
        console.log(piece);
        return false;
      }
    };

    var onDrop = function(source, target) {
       handleOnDrop(game,source,target,socket_id);
    };

    // update the board position after the piece snap 
    // for castling, en passant, pawn promotion
    var onSnapEnd = function() {
      board.position(game.fen());
    };
   
   // when quit button is pressed
  $('#quit').on('click', function(e){

   var r = confirm("Are you sure you want to quit?");
   if (r == true) {
     handleQuit(game_id,socket_id);
    } 
        // .one() is NOT a typo of .on()
  });
    console.log('Loading game');
    var cfg = {
      draggable: true,
      position: fen_string,
      onDragStart: onDragStart,
      onDrop: onDrop,
      onSnapEnd: onSnapEnd
    };
    board = ChessBoard('board', cfg);
    //var board2 = ChessBoard('board2', cfg);

    updateStatus(game);
        
});



