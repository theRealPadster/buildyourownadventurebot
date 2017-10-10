var express = require('express');
var path = require('path');
var app = express();

var bodyParser = require('body-parser');
var twilio = require('twilio');
var oConnections = {};

// Define the port to run on
app.set('port', process.env.PORT || parseInt(process.argv.pop()) || 5100);

// Define the Document Root path
var sPath = path.join(__dirname, '.');

app.use(express.static(sPath));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// msg += "You hear a noise coming from deep within the house. "

function fLivingRoom_LightOrDoorway(req, res){
  var sFrom = req.body.From;
  var sAction = req.body.Body;
  var twiml = new twilio.twiml.MessagingResponse();
  var msg = "";

  //TODO - does this work?
  if (oConnections[sFrom].fBleedingStatus){
    msg += "Your cut is worse than you thought, and it's starting to bleed more. "
  }

  if(sAction.toLowerCase().search("light") != -1){
    msg += "You trip on some debris, and run your hand along the wall. It feels...slimy. There is a light switch, but it stopped working years ago. ";
    msg += "You find a candle and some matches. The room is illuminated in a bright flash as you light the candle. ";
    msg += "The first thing you notice is all the dust everywhere. Then you see an axe, just sitting there on the coffee table. Do you take it?";
    oConnections[sFrom].fCurState = fLivingRoom_LightOrDoorway;
  }else if(sAction.toLowerCase().search("door") != -1){
    msg += "You trip on some debris and stumble through the doorway. TODO - can I have a 'hall' function that's not hooked up to the window?";
    // oConnections[sFrom].fCurState = fLivingRoom_LightOrDoorway;
  }else{
    var msg = "You stand around in the dark for a bit, hyperventilating. You take some time to think, look for a light, or take the door?";
  }

  twiml.message(msg)
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
}

function fOutside_WindowOrDoor(req, res){
  var sFrom = req.body.From;
  var sAction = req.body.Body;
  var twiml = new twilio.twiml.MessagingResponse();
  if(sAction.toLowerCase().search("window") != -1){
    twiml.message("You pull yourself up, through the window, but cut yourself on the glass. It's not too deep, but it stings. The house is dark. You find yourself in a living room. Do you fumble around around looking for a light, or look for a doorway?");
    oConnections[sFrom].fBleedingStatus = true;
    oConnections[sFrom].fCurState = fLivingRoom_LightOrDoorway;
  }else if(sAction.toLowerCase().search("door") != -1){  
    twiml.message("The door creaks loudly as you pull it open. You step inside. It is dark and the house smells of death. There is a door on your right. Take the door or go down the hall?");
    oConnections[sFrom].fCurState = fFrontDoor_HallOrDoor;
  }else {
    twiml.message("Alright, whatever, man. Go and do " + sAction + " if you want. But when you're done, window or door?")
  }
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
}

function fBeginning(req, res){
  var sFrom = req.body.From;
  oConnections[sFrom].fCurState = fOutside_WindowOrDoor;
  var twiml = new twilio.twiml.MessagingResponse();
  twiml.message('You see a dark and scary abandoned house. There is a broken window on the right side, by the corner. The door is slightly ajar. Do you take the window or use front door?');
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
}

//define a method for the twilio webhook
app.post('/sms', function(req, res) {
  var sFrom = req.body.From;
  if(!oConnections.hasOwnProperty(sFrom)){
    oConnections[sFrom] = {"fCurState":fBeginning};
  }
  oConnections[sFrom].fCurState(req, res);
});

// Listen for requests
var server = app.listen(app.get('port'), () =>{
  var port = server.address().port;
  console.log('Listening on localhost:' + port);
  console.log("Document Root is " + sPath);
});