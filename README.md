# ircng

ircng is a javascript library for parsing IRC messages

There are zillions of IRC libraries for javascript, but none that do quite what I wanted, so I wrote one (isn't that what all good developers do?).

You are resposible for making the connection to the IRC server and feeding the parser data.  Later it wlil do connections for you but I don't need this functionality at this time.

Very much still a Work In Progess.

Usage:

```javascript
var stream = new IRCStream();

stream.register({
    nickname: 'cryogen',
    username: 'user',
    realname: 'Real Name'
});

stream.on('message', function(message) {
    // Do stuff with irc messages
});

stream.push('SOME IRC DATA');
```