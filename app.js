var express = require('express');
var path = require('path');
var app = express();

var bodyParser = require('body-parser');
var twilio = require('twilio');
var oConnections = {};

var defaultState = {
    // "fCurState": fBeginning,
    "isBleeding": false,
    "hasRat": true,
    "hasMushroom": false,
    "hasSlime": false,
    "hasAxe": false,
    "hasCandle": false
};

// Define the port to run on
app.set('port', process.env.PORT || parseInt(process.argv.pop()) || 5100);

// Define the Document Root path
var sPath = path.join(__dirname, '.');

app.use(express.static(sPath));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
    extended: true
})); // for parsing application/x-www-form-urlencoded

// msg += "You hear a noise coming from deep within the house. "

function fHallEnd(req, res) {
    var sFrom = req.body.From;
    var sAction = req.body.Body;
    var msg = "";

    if (sAction.toLowerCase().search(/left|kitchen/) != -1) {
        msg += "You're in the kitchen!";
    }
    else if (sAction.toLowerCase().search(/right|bedroom|bed room/) != -1) {
        msg += "You're in the bedroom!";
    }
    else if (sAction.toLowerCase().search(/down|stair/) != -1) {
        msg += "You're downstairs!";
    }
    else {

    }

    var twiml = new twilio.twiml.MessagingResponse();
    twiml.message(msg)
    res.writeHead(200, {
        'Content-Type': 'text/xml'
    });
    res.end(twiml.toString());
}

function fLivingRoom(req, res) {
    var sFrom = req.body.From;
    var sAction = req.body.Body;
    var msg = "";

    if (oConnections[sFrom].fBleedingStatus) {
        msg += "Your cut is worse than you thought, and it's starting to bleed more. ";
    }

    //look for light
    if (sAction.toLowerCase().search("light") != -1) {
        msg += "You trip on some debris, and run your hand along the wall. It feels...slimy. There is a light switch, but it stopped working years ago. ";
        msg += "You find a candle and some matches. The room is illuminated in a bright flash as you light the candle. ";
        msg += "The first thing you notice is all the dust everywhere. Then you see an axe, just sitting there on the coffee table. Do you take it, or just leave?";
        oConnections[sFrom].hasCandle = true;
    } //leave living room (go to hall end)
    else if (sAction.toLowerCase().search(/door|leave|exit/) != -1) {
        msg += "You trip on some debris and stumble through the doorway. ";

        //TODO - make this only once...1
        msg += "You're in the main hall. It's also dark and dusty. You head down the hall and hear a long shrill wail. ";
        msg += "There is a kitchen to your left, a bedroom to your right, and a long dark staircase downwards. Which do you choose?";
        oConnections[sFrom].fCurState = fHallEnd;
    } //take axe
    else if (sAction.toLowerCase().search(/take|axe/) != -1) {
        msg += "You take the axe. It's hefty in your hands and has a little blood on the blade.";
        msg += "You then head out the doorway, axe in hand.";

        //TODO - make this only once...1
        msg += "You're in the main hall. It's also dark and dusty. You head down the hall and hear a long shrill wail. ";
        msg += "There is a kitchen to your left, a bedroom to your right, and a long dark staircase downwards. Which do you choose?";
        oConnections[sFrom].hasAxe = true;
        oConnections[sFrom].fCurState = fHallEnd;
    } else {
        var msg = "You stand around in the dark for a bit, hyperventilating. You take some time to think, look for a light, or take the door?";
    }

    var twiml = new twilio.twiml.MessagingResponse();
    twiml.message(msg)
    res.writeHead(200, {
        'Content-Type': 'text/xml'
    });
    res.end(twiml.toString());
}

function fOutside(req, res) {
    var sFrom = req.body.From;
    var sAction = req.body.Body;
    var msg = "";

    //go through window
    if (sAction.toLowerCase().search("window") != -1) {
        msg = "You pull yourself up, through the window, but cut yourself on the glass. It's not too deep, but it stings. The house is dark. You find yourself in a living room. Do you fumble around around looking for a light, or look for a doorway?";
        oConnections[sFrom].fCurState = fLivingRoom;
    } //enter door
    else if (sAction.toLowerCase().search("door") != -1) {
        msg = "The door creaks loudly as you pull it open. You step inside. It is dark and the house smells of death. There is a door on your right. Take the door or go down the hall?";
        oConnections[sFrom].fCurState = fHall;
    } //first time here, or invalid
    else {
        msg = "You see a dark and scary abandoned house. There is a broken window on the right side, by the corner. The door is slightly ajar. Do you take the window or use front door?";
    }

    var twiml = new twilio.twiml.MessagingResponse();
    twiml.message(msg);
    res.writeHead(200, {
        'Content-Type': 'text/xml'
    });
    res.end(twiml.toString());
}

//define a method for the twilio webhook
app.post('/sms', function(req, res) {
    var sFrom = req.body.From;
    console.log("hit, sFrom:" + sFrom);
    if (!oConnections.hasOwnProperty(sFrom)) {
        oConnections[sFrom] = JSON.parse(JSON.stringify(defaultState));
        oConnections[sFrom].fCurState = fBeginning;
    }

    var sAction = req.body.Body;
    var status = "";
    if (sAction.toLowerCase().search("status") != -1) {
        status += "You have: \n"
        if (oConnections[sFrom].hasAxe) {
            status += "- a candle\n";
        }
        if (oConnections[sFrom].hasRat) {
            status += "- a dead rat\n";
        }
        if (oConnections[sFrom].hasSlime) {
            status += "- some nasty slime\n";
        }
        if (oConnections[sFrom].hasMushroom) {
            status += "- a moldy mushroom\n";
        }
        if (oConnections[sFrom].hasAxe) {
            status += "- an axe\n";
        }
        if (oConnections[sFrom].isBleeding) {
            status += "oh, and you're bleeding\n";
        }

        status += "Now just resume where you left off..."

        var twiml = new twilio.twiml.MessagingResponse();
        twiml.message(status);
        res.writeHead(200, {
            'Content-Type': 'text/xml'
        });
        res.end(twiml.toString());
    } else {
        oConnections[sFrom].fCurState(req, res);
    }

});

// Listen for requests
var server = app.listen(app.get('port'), () => {
    var port = server.address().port;
    console.log('Listening on localhost:' + port);
    console.log("Document Root is " + sPath);
});
