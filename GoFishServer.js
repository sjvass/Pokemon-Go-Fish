/*
 * Sara Vass (sjv219) and Alex James (aoj219)
 * CSE264
 * Final Project: Go Fish Game
 * Pokemon Go Fish Game Server: Based of SetGame/WordSearch Server
*/

/*Constants*/
const PORT = process.env.PORT || 3000;
const DEBUG = 1;
const NOT_BEING_USED = -1;
const ERROR = -1;
const SUCCESS = 0;
const HOST = "127.0.0.1";
const backendUrl = "https://pokemon-go-fish.herokuapp.com/";

const url = require("url");
const http = require("http");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();

/*
 * Header adds a Content-Type header to the response indicating that all output
 * will be json formatted.
 */
function header(res) {
  res.writeHead(200, {
    "Content-Type": "application/json"
  });
}

/*
 * Wrap is a utility function for implementing jsonp, a method (basically hack)
 * for doing cross-domain calls.
 * See: http://en.wikipedia.org/wiki/JSONP
 * See: http://en.wikipedia.org/wiki/Cross-origin_resource_sharing
 */
function wrap(txt, callb) {
  return callb + "(" + txt + ")";
}
function errorLog(fcn, ctx, e) {
  console.log(fcn + ": Error on input (" + ctx + ") " + e.toString());
}
function log(ipaddr, id, message) {
  console.log(ipaddr + "(" + id + "): " + message);
}

/*
 *Function shuffle
 * Description: Shuffle randomizes the elements in array.
 */

function shuffle(a) {
  for (var i = 0; i < a.length; ++i) {
    var n = Math.floor(Math.random() * a.length);
    var tmp = a[n];
    a[n] = a[0];
    a[0] = tmp;
  }
}

/*
 * Class: Deck
 * Description: A Deck object contains one or more complete decks of Set cards.
 */
class Deck {
  // Constructor
  constructor(ndecks) {
    var cardarr = new Array();
    for (var i = 0; i < 52; ++i) {
      cardarr[i] = Math.floor((i)/4);
    }
    shuffle(cardarr);
    this.cards = cardarr;
    this.nextCard = 0;
  };

  // Deal a single card or return -1 if the deck has run out.
  getCard() {
    if (this.nextCard < 52){
      var newCard = this.cards[this.nextCard]
      this.cards.splice(this.nextCard,1);
      return newCard;}
    else return -1;
  };
}

var numberOfDecks = 1;
var setDeck = new Deck(numberOfDecks);

/*
 * Class: Hand
 * Description: The Hand object contains all the cards in player's hand.
 */

class Hand {
  // Constructor
  constructor() {
    this.handcards = [];
  };

  // Initialize the Hand with 5 cards from the Deck.
  init() {
    var hand = new Array();
    for (var i = 0; i < 5; ++i) {
      if (setDeck["cards"].length > 0){
        hand[i] = setDeck.getCard();
      }
    }
    this.handcards = hand;
  };

  // Gets length of hand.
  length() {
    this.handcards.length;
  }
  // Add a new Card to the end of the Hand.
  addCard(c) {
    this.handcards.push(c);
  };

  // Remove the given Card from the Hand.
  removeCard(c) {
    var index = this.handcards.indexOf(c);
    if (index != -1) this.handcards.splice(index, 1);
  };

  // Check to see if a given card is in the Hand.
  inHand(card) {
    return this["handcards"].indexOf(card);
  };
}

/*
 * Function: getGUID
 * Description: Creates a unique id for ech player.
 */
 function getGUID() {
   return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
     var r = (Math.random() * 16) | 0,
       v = c == "x" ? r : (r & 0x3) | 0x8;
     return v.toString(16);
   });
 }

/*
 * Class: Player
 * Description: Contains all the information maintained about a single player.
 *   The server maintains an array of players which is broadcast to the clients
 *   whenever it changes.
 */
class Player {
  constructor(login, ipaddr) {
    this.name = login;
    this.id = getGUID();
    this.score = 0;
    this.hand = new Hand();
    this.hand.init();
    this.winner = false;
    this.turn = false;
    this.ipaddr = ipaddr;
  }
}

/*
 * Class: PlayerList
 * Description: Contains the list of players currently playing the game with
 *   methods for querying and manipulating it.
 */

class PlayerList {
  constructor() {
    this.players = [];
    this.ids = {};
    this.unames = {};
  }

  add(player) {
    this.players.push(player);
    this.ids[player.id] = player;
    this.unames[player.name] = player;
    return player.id;
  }

  updateScore(id, pts) {
    this.ids[id].score += pts;
  }

  length() {
    return this.players.length;
  }

  idOnList(id) {
    return !(typeof this.ids[id] === "undefined");
  }

  nameOnList(uname) {
    return !(typeof this.unames[uname] === "undefined");
  }

  getPlayer(id) {
    return this.ids[id];
  }

  getPlayerId(uname) {
    return this.unames[uname].id;
  }

  getPlayerName(id) {
    return this.getPlayer(id).name;
  }

  setWinner() {
    var hi = 0;
    var winner = 0;
    this.players.forEach((player, index, array) => {
      if (player.score >= hi) {
        hi = player.score;
        winner = index;
      }
    });
    if (winner > 0) {
      this.players.forEach((player, index, array) => {
        if (index === winner) player.winner = true;
        else player.winner = false;
      });
    }
  }
}

/*The Player List*/
var setPlayers = new PlayerList();

/*
 * Services
 * process are the services that the clients can request
 */

/*
 * Function: processLogin
 * Description: Processes a login request from the client. Filters out empty
 *   login names and removes special characters from names. If the login name
 *   hasn't been used before, then a new integer id is assigned and returned or
 *   else the old id is returned. Therefore, if a user logs in repeatedly with
 *   the same login name they will keep receiving the same id.
 */
function processLogin(req, uname) {
  let ipaddr = req.connection.remoteAddress;
  let filteredName = uname.replace(/[^a-zA-Z0-9 ]/g, "");
  if(setPlayers.length()<2){
    if (filteredName.trim().length <= 0) {
      console.log(`Login: Empty name rejected. (${uname})`);
      return "";
    } else {
      if (filteredName.length > 20) {
        filteredName = filteredName.substring(0, 21);
      }
      while (setPlayers.nameOnList(filteredName)) {
        let ret = {};
        let id = setPlayers.getPlayerId(filteredName);
        console.log(`New ID ${id}`);
        log(ipaddr, id, "Login: Relogin (" + filteredName + ")");
        ret.success = true;
        ret.id = id;
        ret.score = setPlayers.getPlayer(id).score;
        ret.username = setPlayers.getPlayerName(id);
        return ret;
      }
      let ret = {};
      var newbie = new Player(filteredName, ipaddr);
      let id = setPlayers.add(newbie);
      console.log(`New ID ${id}`);
      let index = setPlayers.length();
      console.log(`New login ${filteredName}`);
      ret.success = true;
      ret.id = id;
      ret.score = setPlayers.getPlayer(id).score;
      ret.username = setPlayers.getPlayerName(id);
      setPlayers.players[0].turn = true;
      return ret;
    }
  }
  else{
    while (setPlayers.nameOnList(filteredName)) {
      let ret = {};
      let id = setPlayers.getPlayerId(filteredName);
      console.log(`New ID ${id}`);
      log(ipaddr, id, "Login: Relogin (" + filteredName + ")");
      ret.success = true;
      ret.id = id;
      ret.score = setPlayers.getPlayer(id).score;
      ret.username = setPlayers.getPlayerName(id);
      return ret;
    }
    let ret = {};
    ret.success = false;
    ret.id = "FULL"
    ret.score = 0;
    ret.username = "";
    return ret;
  }
}

/*
 * Function: handCheck
 * Description: Checks for any pairs in the hand
 */
function handCheck() {
  for (var i = 0; i < setPlayers.length(); i++) {
    var pHand = setPlayers.players[i].hand["handcards"];
    var flag = true;
    for(var j = 0; j < pHand.length; j++) {
      if(flag == false){
        j = 0;
        flag = true;
      }
      for(var z = (j+1); z < pHand.length; z++) {
        if (pHand[j] == pHand[z] && pHand.length>0) {
          pHand.splice(z, 1);
          pHand.splice(j, 1);
          setPlayers.players[i].score++;
          flag = false;
        }
      }
    }
  }
  updateDeck();
  updateStatus();
}

var started = false;
var finished = false;
var reset = false;
setInterval(function(){
  if (setPlayers.length() == 2 && started == false) {
    startGame();
    updateDeck();
    started = true;
  }
  if(started == true){
    setTimeout(function(){handCheck();}, 2000);
    started = null;
  }
  if(setDeck["cards"].length == 0){
    for(var i = 0; i < setPlayers.length(); i++){
      if(setPlayers.players[i].hand["handcards"].length == 0){
        finished = true;
      } else {
        finished = false;
        break;
      }
      if(finished == true){
        if(setDeck["cards"].length == 0){
        setPlayers.setWinner();
        updateStatus();
        reset = true;
        finished = false;
      }
      if(reset == true){
        reset = false
        setTimeout(function(){ setPlayers = new PlayerList()
        setDeck = new Deck(numberOfDecks)
        started = false;
        },2000);
      }
    }
   }
  }
}, 1000);

/*
 *Function: guessingCard
 *Description: Handles client request to guess card in opponent hand
 */
function guessingCard(userId, desiredCard){
  if(setPlayers.idOnList(userId)){
    if(setPlayers.getPlayer(userId).turn == true){
      for(var i = 0; i < setPlayers.length(); i++){
        if(setPlayers.players[i].id != userId){
          let opponent = setPlayers.players[i];
          var indexOfCard = opponent.hand.inHand(parseInt(desiredCard));
          if (indexOfCard >= 0) {
            let ret = {};
            ret.success = true;
            ret.message = "Correct Card";
            setPlayers.updateScore(userId,1);
            opponent.hand.removeCard(parseInt(desiredCard));
            setPlayers.getPlayer(userId).hand.removeCard(parseInt(desiredCard));
            updateStatus();
            if(setPlayers.getPlayer(userId).hand["handcards"].length == 0){
              setPlayers.getPlayer(userId).hand.init();
              //setInterval(function (){
                updateStatus()
              //  console.log("YOUR A WHORE")
              //}, 2000);
              handCheck();
            }
            if(opponent.hand["handcards"].length == 0){
              setPlayers.players[i].hand.init();
              //setInterval(function() {
                updateStatus();
              //  console.log("HOW U BITCH");
              //}, 2000);
              handCheck();
            }
            return ret;
          } else {
            let ret = {};
            ret.success = false;
            ret.message = "INVALID CARD";
            updateStatus();
            //ret.card = -1;
            return ret;
          }
        } else {}
      }
    }
    let ret = {}
    ret.success = false;
    ret.message = "Not Your Turn";
    //ret.card = -1;
    return ret;
  }
  let ret = {};
  ret.success = false;
  ret.message = "INVALID ID";
  //ret.card = -1;
  return ret;
}

/*
 * Function: processAddCard
 * Description: Processes an add card request from the client.
 */

function processAddCard(userId) {
  if(setPlayers.idOnList(userId)){
    if(setPlayers.getPlayer(userId).turn == true){
      for(var i = 0; i < setPlayers.length(); i++){
        if(setPlayers.players[i].id != userId){
          if (setDeck["cards"].length > 0) {
            var baseLength = setPlayers.getPlayer(userId).hand["handcards"].length;
            setPlayers.getPlayer(userId).hand.addCard(setDeck.getCard());
            handCheck();
            if (setPlayers.getPlayer(userId).hand["handcards"].length > baseLength)
            {
              setPlayers.players[i].turn = !(setPlayers.players[i].turn);
              setPlayers.getPlayer(userId).turn = !(setPlayers.getPlayer(userId).turn);
              let ret = {};
              ret.success = true;
              ret.message = "newCard";
              updateStatus();
              return ret;
            } else {
              if(setPlayers.getPlayer(userId).hand["handcards"].length == 0){
                setPlayers.getPlayer(userId).hand.init();
                //setInterval(function() {
                  updateStatus();//},
                //2000);
                handCheck();
              }
              let ret = {};
              ret.success = true;
              ret.message = "goAgain";
              return ret;
            }
          } else {
            let ret = {};
            ret.success = false;
            ret.message = "Unsuccesful";
            return ret;
          }
        }
      }
    }
  }
}

/* Socket Calls */
function startGame() {
  io.sockets.emit("startGame", setPlayers.players);
}
function updateDeck() {
  io.sockets.emit("deck", setDeck["cards"].length);
}
//Broadcast the current player list to all players.
function updateStatus() {
  io.sockets.emit("updateStatus", setPlayers.players);
}


var publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/login", (req, res) => {
  let uname = req.query.username;
  if (typeof uname == "undefined") {
    res.send({ success: false });
  } else {
    let ret = processLogin(req, uname);
    res.send(ret);
  }
});

app.get("/submit", (req,res) =>{
  let id = req.query.playerId
  let value = req.query.cardValue
  if(typeof id == "undefined" || value < 0){
    res.send({success: false});
  } else {
    let ret = guessingCard(id, value);
    res.send(ret);
  }
});

app.get("/addcard", (req, res) => {
  let id = req.query.playerId;
  if (typeof id == "undefined") {
    res.send({ success: false });
  } else {
    let ret = processAddCard(id);
    res.send(JSON.stringify(ret));
  }
});

app.use((req, res) => {
  res.writeHead(404);
  res.end("Not found.");
  console.log("Error: Invalid Request: " + req.url);
});

var server = http.createServer(app);
io = require("socket.io").listen(server);
server.listen(PORT, () => {
  //console.log(`Server running at http://${HOST}:${PORT}/`);
});

// Set up socket.io connection for sending card grids and player lists
var clientList = new Object();
io.sockets.on("connection", function(socket) {
  var clientIPAddress = socket.request.connection.remoteAddress;
  console.log("New Connection from " + clientIPAddress);
  clientList[clientIPAddress] = socket;
});
