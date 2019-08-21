/*
Sara Vass (sjv219) and Alex James (aoj219)
CSE264
Final Project: Go Fish game
client side JavaScript for pokemon go fish game
*/
//Constants
var HOST = "localhost:3000";
var SERVER = "http://" + HOST + "/";
const backendUrl = "https://go-fish-321.herokuapp.com/";

//global variables
let userId = 0;
var deckTop = 0;
var yourTurn = false;
var choosable = true;


// Utility method for encapsulating the jQuery Ajax Call
function doAjaxCall(method, cmd, params, fcn) {
  $.ajax(
    SERVER + cmd,
      {
        type: method,
        processData: true,
        data: params,
        dataType: "json",
        success: function (result) {
          fcn(result)
        },
        error: function (jqXHR, textStatus, errorThrown) {
          alert("Error: " + jqXHR.responseText);
          alert("Error: " + textStatus);
          alert("Error: " + errorThrown);
          }
      }
    );
}

/*
 Handles user login
 Takes username entered by user as parameter(name)
 Makes Ajax call to server with the user's name, gets the user's Player Object
 back from the server and saves their unique ID, then displays their name and score
*/
function login(name) {
  doAjaxCall("GET", "login", {username: name},
  function (result) {
    if(result.id == "FULL") {
      alert("The current game is full. Please try again later.");
    }
    else {
      //changes to game-page
      $.mobile.changePage($("#game-page"));

      userId= result.id;

      //displays player info
      $('#player').html('<h3>' + result.username + '<br>score: <span id="playerScore">'+
      result.score + '</span></h3>');
      $('#instructions').css("display", "block");
    }
  });
}

/*
 Takes a card value number as a parameter.
 Matches card value to corrisponding image, then displays the card.
*/
function playerDraw(val) {
  var card = "<img class='card'";
  if(val == 1) {
    card += 'id="1" src="../images/cards/1barboach.png" alt="barboach card"';
  }
  else if(val == 2) {
    card += 'id="2" src="../images/cards/2basculin.png" alt="basculin card"';
  }
  else if(val == 3) {
    card += 'id="3" src="../images/cards/3finneon.png" alt="finneon card"';
  }
  else if(val == 4) {
    card += 'id="4" src="../images/cards/4horsea.png" alt="horsea card"';
  }
  else if(val == 5) {
    card += 'id="5" src="../images/cards/5lumineon.png" alt="lumineon card"';
  }
  else if(val == 6) {
    card += 'id="6" src="../images/cards/6luvdisc.png" alt="luvdisc card"';
  }
  else if(val == 7) {
    card += 'id="7" src="../images/cards/7magikarp.png" alt="magikarp card"';
  }
  else if(val == 8) {
    card += 'id="8" src="../images/cards/8qwilfish.png" alt="qwilfish card"';
  }
  else if(val == 9) {
    card += 'id="9" src="../images/cards/9remoraid.png" alt="remoraid card"';
  }
  else if(val == 10) {
    card += 'id="10" src="../images/cards/10seaking.png" alt="seaking card"';
  }
  else if(val == 11) {
    card += 'id="11" src="../images/cards/11sharpedo.png" alt="sharpedo card"';
  }
  else if(val == 12) {
    card += 'id="12" src="../images/cards/12tynamo.png" alt="tynamo card"';
  }
  else if(val == 0) {
    card += 'id="0" src="../images/cards/13wishiwashi.png" alt="wishiwashi card"';
  }

  card += ">"
  $('#player').append(card);
}

/*
 Displays an image of the back of a card to represent a card in the opponent's hand.
*/
function oppDraw() {
  $('#opponent').prepend('<img class="card" src="../images/cards/card-back1.png" alt="back of go fish card">');
}

/*
 Takes a card value as a parameter.
 Makes an ajax call to the server with the player's ID and the card value requested.
 Server lets the player know wether their guess was a match and handles the displays
 involved with that.
*/
function submitCard(val) {
  doAjaxCall("GET", "submit", {playerId:userId, cardValue:val},
  function (result) {
    $('#submitCard').css("display", "none");

    if(!result.success) {
      $('.deck-top').toggleClass("selected");
      choosable = false;
    }
    else {
      choosable = true;
    }
  });
}

/*
 Takes the number of cards left in the deck as a parameter.
 Creates a deck display with the correct number of cards.
*/
function makeDeck(numCards) {
  var htmlStr = '';
  for (var i = 0; i < numCards; i++) {
    var card = '';
    if(i != (numCards-1)) {
      card = '<img id="card' + i +'" class="stack" src="images/cards/card-back1.png" alt="deck represented by back of card" '
      + 'style="top:' + (50 - (i/40)) + '%;left:' + (50 - (i/40)) + '%;">';
    }
    else {
      card = '<img id="card' + i +'" class="stack deck-top" src="images/cards/card-back1.png" alt="deck represented by back of card"'
       + ' style="top:' + (50 - (i/40)) + '%;left:' + (50 - (i/40)) + '%;">';
    }
    htmlStr += card;
  }
  $('#deck').html(htmlStr);
}

/*
 Takes a PlayerList object as a parameter.
 Uses the PlayerList to set up the initial display for the user and opponent info and hands.
*/
function gameSetup(pList) {

  //iterates through each Player on pList
  for(var i = 0; i < pList.length; i++) {
    //if current player on list is this player
    if(pList[i].id == userId) {
      //adds card to player's hand
      var myHand = pList[i].hand["handcards"];
      for(var j = 0; j < myHand.length; j++) {
        playerDraw(myHand[j]);
      }
      //update's turn
      yourTurn = pList[i].turn;
    }
    //if this Player on pList is not the current player, updates opponents hand
    else {
      $('#opponent').html('<h3>' + pList[i].name + '<br>score: <span id="oppScore">' +
       pList[i].score + '</span></h3>');
      for(var j = 0; j < pList[i].hand["handcards"].length; j++) {
        oppDraw();
      }
    }
  }
  //highlits current player's turn
  if(yourTurn) {
    $('#player h3').css("color", "yellow");
    $('#opponent h3').css("color", "white");
  }
  else {
    $('#opponent h3').css("color", "yellow");
    $('#player h3').css("color", "white");
  }
}

/*
takes a boolean as a parameter noting wether its modifying the player or opponent's hand
Changes the max width of the cards in a hand so entire hand will fit on screen
*/
function cardWidth(isPlayer) {
  var maxWidth = 0;
  if(isPlayer) {
    maxWidth = (($( "#player .card" ).width() / $( window ).width()) * 100) + "%";
    $( "#player .card" ).css("max-width", maxWidth);
  }
  else {
    var oppWidth = $( window ).width() - $( "#leave-game" ).width();
    maxWidth = (($( "#opponent .card").width() / oppWidth) * 100) + "%";
    $( "#opponent .card" ).css("max-width", maxWidth);
  }
}


/*
 Takes a PlayerList object as a parameter.
 Modify's player and opponent hand and information displays so they are updated and accurate.
*/
var notDone = true;
function updateCards(pList) {
  //iterates through each player on the pList
  for(var i = 0; i < pList.length; i++) {
    //if it's this player
    if(pList[i].id == userId) {
      var counter = 0;
      //deletes cards from player's hand
      $('#player .card').each( function(index) {
        if($(this).attr("id") != pList[i].hand["handcards"][counter]) {
          $(this).remove();
        }
        else {
          counter++;
        }
      });
      //adds cards to players hand
      while(counter < pList[i].hand["handcards"].length) {
        playerDraw(pList[i].hand["handcards"][counter]);
        counter++;
      }
      //updates player's score
      $('#playerScore').html(pList[i].score);
      //update's player's turn
      yourTurn = pList[i].turn;
      //handles winning
      if(pList[i].winner == true && notDone) {
        //var x = $("#won");
        //alert("x.length")
        $('#game-page').append('<h1 id="won" style="color:yellow;">Congratulations!<br>You&apos;ve won!</h1>');
        notDone = false;
      }
      cardWidth(true);
    }
    //If the current player in the list is the opponent
    else {
      //deletes cards from opponent's hand if needed
      if($('#opponent .card').length > pList[i].hand["handcards"].length) {
        $('#opponent .card').each( function(index) {
          if(index >= pList[i].hand["handcards"].length) {
            $(this).remove();
          }
        });
      }
      //adds cards to opponent's hand if needed
      else if($('#opponent .card').length < pList[i].hand["handcards"].length) {
        var numAdd = pList[i].hand["handcards"].length - $('#opponent .card').length;
        for(var j = 0; j < numAdd; j++) {
          oppDraw();
        }
      }
      //updates the max width of opponent's cards so they will fit on the screen
      cardWidth(false);

      //updates opponents score
      $('#oppScore').html(pList[i].score);
      //handles losing
      if(pList[i].winner == true && notDone) {
        //var y = $("#lost");
        //alert("y.length");
        $('#game-page').append('<h1 id="lost" font-size="200%">Oh no! You lost.<br>Better luck next time!</h1>');
        notDone = false;
      }
    }
  }
  //updates which player's turn is displayed
  if(yourTurn) {
    $('#player h3').css("color", "yellow");
    $('#opponent h3').css("color", "white");
  } 
  else {
    $('#opponent h3').css("color", "yellow");
    $('#player h3').css("color", "white");
  }
}

/* Ajax call for when the user draws a new card.*/
function drawCard(uId) {
  choosable = true;
  doAjaxCall("GET", "addCard", {playerId:uId},
  function (result) {
    if(!result.success) {
      alert("draw unsuccessful");
    }
    if(result.message == "goAgain") {
      $('#drew-pair').css("display", "block");
    }
  });
}

/*
 Attaches event handlers
*/
function attachEventHandlers() {
  //When login button clicked
  $('#register').click( function () {
    //saves user input
    var name = $('#userIn').val();
    login(name);
  });

  //when leave game button clicked
  $('#leave').click( function () {
    //resets text input box
    if(notDone == false){
      var x = $("#won")
      var y = $("#lost")
      if (x.length > 0) {
        $("#won").remove();
      }
      if (y.length > 0) {
        $("#lost").remove();
      }
      notDone = true;
    }
    $('#userIn').val("");
    //changes display to login plage
    $.mobile.changePage($("#login-page"));

  });

  var cardVal = -1;
  //when a chard in the player's deck is clicked
  $("#player").on('click', 'img', function() {
    //only allows deck to be clicked if it's the player's turn and they
    //have not already chosen a card
    if(yourTurn && choosable) {
      var clickEl = $(this);
      $('#player img').each(function () {
        if($(this) != clickEl && $(this).hasClass("selected")) {
          $(this).removeClass("selected");
        }
      });
      $(this).toggleClass("selected");
      $('#submitCard').css("display", "initial");
      cardVal = $(this).attr("id");
    }
  });

  //when the Ask button is clicked
  $('#submitCard').click( function() {
    //cannot be clicked if it is not the player's turn
    if(yourTurn) {
      var elName = "#player #" + cardVal;
      $(elName).removeClass("selected");
      submitCard(cardVal);
      cardVal = -1;
    }
  });

  //when the card on the top of the deck is clicked
  $("#deck").on('click', '.deck-top', function() {
    //can only be clicked if it is that player's turn and they have already
    //made a guess
    if(yourTurn && !choosable) {
      $(this).toggleClass("selected");
      drawCard(userId);
    }
  });

  $('.popup button').click(function(){
    $('.popup').css("display", "none");
  });
}

/*
 set up function when page finishes loading
*/
$( () => {
  attachEventHandlers();

  //sets up a socket to the server
  var socket = io.connect(HOST);

  //handles startGame event from server
  socket.on('startGame', function (players) {
    gameSetup(players);
  });

  //handles updateStats event from server
  socket.on('updateStatus', function(players) {
    updateCards(players);
  });

  //handles deck event from server
  socket.on('deck', function(length){
    makeDeck(length);
  });

});
