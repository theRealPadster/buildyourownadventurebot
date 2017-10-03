var accountSid = 'AC3c5960aeeedd94583ab40883a1cff151'; // Your Account SID from www.twilio.com/console
var authToken = '478bdefb600af20f18a41beebd58c71d';   // Your Auth Token from www.twilio.com/console

var twilio = require('twilio');
var client = new twilio(accountSid, authToken);

client.messages.create({
    body: 'Hello from Node',
    to: '+12265052416',  // Text this number
    from: '+12267820810' // From a valid Twilio number
})
.then((message) => console.log(message.sid));