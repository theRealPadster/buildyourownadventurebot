var express = require('express');
var path = require('path');
var app = express();

var bodyParser = require('body-parser');
var twilio = require('twilio');
var oConnections = {};

const TOO_SLOW_YOU_DIE = "Eeuuarrggghhfsefgggssss! You're just a wee bit too slow, and the monster claws your face off. You bleed out on the ground as it feasts upon your flesh. ";
const IN_THE_HALL = "You're in the main hall. It's also dark and dusty. You head down the hall and hear a long shrill wail. There is a kitchen to your left, a bedroom to your right, a living room, and a long dark staircase downwards. Which do you choose?";
const ENTER_BEDROOM = "The bedroom is gross. There's a pizza box with some fuzzy growth inside it and moth-eaten clothes strewn across the floor. And a dead rat in the corner. Look at the 'pizza', clothes, or the rat?";

var defaultState = {
    // "fCurState": fBeginning,
    "bleedingStatus": 0,
    "hasRat": false,
    "hasMushroom": false,
    "hasSlime": false,
    "hasAxe": false,
    "hasCandle": false,
    "hasRecipe": false,
    "isInvincible": false
};

//TODO - implement bleeding
//TODO - implement more candle stuff

// Define the port to run on
app.set('port', process.env.PORT || parseInt(process.argv.pop()) || 5100);

// Define the Document Root path
var sPath = path.join(__dirname, '.');

app.use(express.static(sPath));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
    extended: true
})); // for parsing application/x-www-form-urlencoded

function resetGame(sFrom) {
    oConnections[sFrom] = JSON.parse(JSON.stringify(defaultState));
    oConnections[sFrom].fCurState = fOutside;
}

function fEndGame(req, res) {
    var sFrom = req.body.From;
    var sAction = req.body.Body;
    var msg = "";

    if (sAction.toLowerCase().search(/drink|potion/) != -1) {
        msg += "The potion tastes fowl, but you feel the strength of a thousand men flow through your veins and know that right now, you are invincible. ";
        oConnections[sFrom].isInvincible = true;
        msg += oConnections[sFrom].hasAxe ? "Take out the axe " : "Stay ";
        msg += "and fight, or run like a coward?";
    }
    else if (sAction.toLowerCase().search(/axe|fight/) != -1) {
        msg += "You drop the bowl to the floor with a clatter and ";
        if (oConnections[sFrom].hasAxe) {
            msg += "pull out the axe. The beast rounds the corner as you raise the axe above your head for a strike. ";
        }
        else {
            msg += "realise you really should have taken that axe. ";
        }

        if (oConnections[sFrom].isInvincible && oConnections[sFrom].hasAxe) {
            msg += "Gaahrhgfushgsg!! It howls as you cleave its head in two. ";
            msg += "Now, feeling weak, as though the effort has sapped your strength, you head back outside. ";
            msg += "You have defeated the monster. You win. Now go have a nap. ";
            resetGame(sFrom);
        }
        else {
            msg += TOO_SLOW_YOU_DIE;
            resetGame(sFrom);
        }
    }
    else if (sAction.toLowerCase().search(/run|leave|exit|flee/) != -1) {
        if (oConnections[sFrom].isInvincible) {
            msg += "Gogogogogogogo! You book it through the old house and burst through the front door. The monster follows you and chases you down the street. ";
            msg += "Eventually you will tire, and then you will be eaten. The massacre of the town will be on your hands. ";
            msg += "Proud of yourself?";
            resetGame(sFrom);
        }
        else {
            msg += TOO_SLOW_YOU_DIE;
            resetGame(sFrom);
        }
    }
    else {
        msg += TOO_SLOW_YOU_DIE;
        resetGame(sFrom);
    }

    var twiml = new twilio.twiml.MessagingResponse();
    twiml.message(msg)
    res.writeHead(200, {
        'Content-Type': 'text/xml'
    });
    res.end(twiml.toString());
}


function fBedRoom(req, res) {
    var sFrom = req.body.From;
    var sAction = req.body.Body;
    var msg = "";

    if (sAction.toLowerCase().search(/pizza|food|growth|mold/) != -1) {
        msg += "You spy some spotted mushrooms in the moldy mess. ";
        if (oConnections[sFrom].hasRecipe && !oConnections[sFrom].hasMushroom) {
            msg += "Perfect. You pocket a few mushrooms for the potion.";
            oConnections[sFrom].hasMushroom = true;
        }
        msg += "Wait, did that one fuzzy glob just move? Eww...";
        msg += "Take a look at the rat, clothes, or get out of here?";
    }
    else if (sAction.toLowerCase().search("rat") != -1) {
        msg += "It's a rat long past his prime. Or his time at all. ";
        if (!oConnections[sFrom].hasRat) {
            if (oConnections[sFrom].hasRecipe) {
                msg += "Perfect. You pocket the rat skull for the potion.";
                oConnections[sFrom].hasRat = true;
            }
            else {
                msg += "Why are you even looking? It looks dreadful, and not to mention the smell...";
            }
        }
        else {
            msg += "You've removed the skull. You monster. ";
        }
        msg += "Take a look at the pizza, clothes, or get out of here?";
    }
    else if (sAction.toLowerCase().search("cloth") != -1) {
        msg += "On closer inspection, the clothes aren't just moth-eaten, they've been ripped to shreds. By something big, by the looks of it. ";
        msg += "Take a look at the pizza, the rat, or get out of here?";
    }
    else if (sAction.toLowerCase().search(/leave|out|exit|hall|door/) != -1) {
        msg += "You head back into the hall. ";
        msg += "Do you check the living room, kitchen or the basement?";
        oConnections[sFrom].fCurState = fHallEnd;
    }
    else {
        msg += ENTER_BEDROOM;
    }

    var twiml = new twilio.twiml.MessagingResponse();
    twiml.message(msg)
    res.writeHead(200, {
        'Content-Type': 'text/xml'
    });
    res.end(twiml.toString());
}

function fHallEnd(req, res) {
    var sFrom = req.body.From;
    var sAction = req.body.Body;
    var msg = "";

    if (sAction.toLowerCase().search("living") != -1) {
        //TODO - implement candle better, and in other rooms?...
        if (!oConnections[sFrom].hasCandle) {
            msg += "You see a candle and some matches. There is a bright flare as you light it up. ";
            oConnections[sFrom].hasCandle = true;
        }
        msg += "The living room is full of junk and the walls are grimy. ";
        if (oConnections[sFrom].hasRecipe && !oConnections[sFrom].hasSlime) {
            msg += " But oh, the slime on the walls could work for the potion maybe, you scoop some off. Ick.";
            oConnections[sFrom].hasSlime = true;
        }
        if (!oConnections[sFrom].hasAxe) {
            msg += "There is an axe on the table. Take the axe or just leave?";
            oConnections[sFrom].fCurState = fLivingRoom;
        }
        else {
            msg += "Nothing much left here, so you head back into the hall.";
            msg += "Head to the kitchen, bedroom, or stairs?";
        }
    }
    else if (sAction.toLowerCase().search(/left|kitchen/) != -1) {
        msg += "You enter the kitchen. It smells like something died in here. And then came back from the dead. And died again. ";
        msg += "You cover your mouth and look around. There is an old book lying on the table, open to a page. ";

        //if have everything
        if (oConnections[sFrom].hasRecipe
            && oConnections[sFrom].hasRat
            && oConnections[sFrom].hasMushroom
            && oConnections[sFrom].hasSlime ) {
            msg += "You've got all the ingredients now, so you find a bowl and dump everything in. You light it with the candle and a LOUD pop sounds! ";
            msg += "The smoke clears and the bowl is now full of dark purple liquid.";
            msg += "You hear a gutteral, inhuman roar coming from the cellar, and claws scrabbling up the stairs. "
            msg += "Something's coming! Drink it, "
            if (oConnections[sFrom].hasAxe) {
                msg += "take the axe, "
            }
            msg += "or run?";
            oConnections[sFrom].fCurState = fEndGame;
        }
        else {
            if (oConnections[sFrom].hasCandle) {
                msg += "You hold out your candle and take a look. ";
                msg += "It's a recipe for a potion! Calls for a rat skull, a mushroom, and some slime. ";
                oConnections[sFrom].hasRecipe = true;
            }
            else {
                msg += " You can't make it out in the dark. You need a light. ";
            }
            msg += "You head back into the hall. ";
            msg += "Do you check the living room, bedroom or the basement?";
        }
    }
    else if (sAction.toLowerCase().search(/right|bed/) != -1) {
        msg += ENTER_BEDROOM;
        oConnections[sFrom].fCurState = fBedRoom;
    }
    else if (sAction.toLowerCase().search(/down|stair|basement|cellar/) != -1) {
        msg += "With a great roar, a massive hairy beast lurches from the shadows and devours your entire being in one bite! Welp. GG. ";
        resetGame(sFrom);
    }
    else {
        msg += IN_THE_HALL;
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

    if (oConnections[sFrom].fBleedingStatus > 0) {
        msg += "Your cut is worse than you thought, and it's starting to bleed more. ";
    }

    //look for light
    if (sAction.toLowerCase().search("light") != -1) {
        msg += "You trip on some debris, and run your hand along the wall. It feels...slimy. There is a light switch, but it stopped working years ago. ";
        msg += "You find a candle and some matches. The room is illuminated in a bright flash as you light the candle. ";
        msg += "The first thing you notice is all the dust everywhere. Then you see an axe, just sitting there on the coffee table. Do you take it, or just leave?";
        oConnections[sFrom].hasCandle = true;
    } //leave living room (go to hall end)
    else if (sAction.toLowerCase().search(/door|leave|exit|go|out/) != -1) {
        msg += "You trip on some debris and stumble through the doorway. ";
        msg += IN_THE_HALL;
        oConnections[sFrom].fCurState = fHallEnd;
    } //take axe
    else if (sAction.toLowerCase().search(/take|axe/) != -1) {
        msg += "You take the axe. It's hefty in your hands and has a little blood on the blade.";
        msg += "You then head out the doorway, axe in hand.";
        msg += IN_THE_HALL;
        oConnections[sFrom].hasAxe = true;
        oConnections[sFrom].fCurState = fHallEnd;
    } else {
        var msg = "You stand around in the dark for a bit, hyperventilating. You take some time to think, what do you do?";
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
        oConnections[sFrom].bleedingStatus = 1;
        oConnections[sFrom].fCurState = fLivingRoom;
    } //enter door
    else if (sAction.toLowerCase().search("door") != -1) {
        msg = "The door creaks loudly as you pull it open. You step inside. It is dark and the house smells of death. You're in the main hallway, and take a quick look around. There is a living room, a bedroom, a kitchen, and a dark staircase. Where do you go?";
        oConnections[sFrom].fCurState = fHallEnd;
    } //first time here, or invalid
    else {
        msg = "You see a dark and scary abandoned house. There is a broken window on the right side, by the corner. The door is slightly ajar. Do you take the window or use front door? (You can also type 'status' to see your inventory at any time, just resume for the previous message afterwards)";
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
        resetGame(sFrom);
    }

    var sAction = req.body.Body;
    var status = "";
    if (sAction.toLowerCase().search("status") != -1) {
        status += "You have: \n"
        if (oConnections[sFrom].hasCandle) {
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
        if (oConnections[sFrom].hasRecipe) {
            status += "- a potion recipe memorised (rat skull, mushroom, slime)\n";
        }
        if (oConnections[sFrom].bleedingStatus > 0) {
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
