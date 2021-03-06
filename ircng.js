'use strict';

const EventEmitter = require('events');

function parseMessage(line) {
    var split = line.split(' ');
    var command = '';
    var source = undefined;
    var argIndex = 1;
    var args = [];

    if(split[0][0] === ':') {
        source = split[0].slice(1);
        command = split[1];
        argIndex++;
    } else {
        command = split[0];
    }

    for(var i = argIndex; i < split.length; i++) {
        var currentArg = split[i];

        if(currentArg[0] === ':') {
            split[i] = split[i].slice(1);
            args.push(split.slice(i).join(' '));
            break;
        } else {
            args.push(currentArg);
        }
    }

    return {
        source: source,
        command: command,
        args: args
    };
}

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function parseSource(source) {
    var nickIndex = source.indexOf('!');
    var nick = source.substr(0, nickIndex);

    var userIndex = source.indexOf('@', nickIndex);
    var user = source.substr(nickIndex + 1, userIndex - nickIndex - 1);
    var host = source.substr(userIndex + 1);

    return { nick: nick, user: user, host: host };
}

function handleCommand(stream, command) {
    if(isNumber(command.command)) {
        stream.emit(command.command, {
            numeric: command.command,
            args: command.args
        });

        stream.emit('numeric', { number: command.command, args: command.args.slice(1) });
    }

    switch(command.command) {
        case 'PING':
            stream.emit('send', { message: 'PONG ' + command.args[0] + '\r\n' });
            break;
        case 'JOIN':
            stream.emit('join', { source: parseSource(command.source), channel: command.args[0] });
            break;
        case 'PART':
            stream.emit('part', { source: parseSource(command.source), channel: command.args[0], message: command.args[1] });
            break;
        case 'PRIVMSG':
            stream.emit('privmsg', { source: parseSource(command.source), target: command.args[0], message: command.args[1] });
            break;
        case 'NOTICE':
            stream.emit('notice', { source: parseSource(command.source), target: command.args[0], message: command.args[1] });
            break;
        case 'TOPIC':
            stream.emit('topic', { source: parseSource(command.source), channel: command.args[0], topic: command.args[1] });
            break;
        case 'QUIT':
            stream.emit('quit', { source: parseSource(command.source), message: command.args[0] });
            break;
        case 'NICK':
            stream.emit('nick', { source: parseSource(command.source), newnick: command.args[0] });
    }
}

function buildCommand(message) {
    return { message: message + '\r\n' };
}

class IRCStream extends EventEmitter {
    constructor() {
        super();
        this._buffer = '';
    }

    push(message) {
        if(!message || !message.length) {
            return;
        }

        var currentIndex = 0;

        this._buffer += message;
        var buffer = this._buffer;

        while(currentIndex <= buffer.length) {
            var newLineIndex = buffer.indexOf('\n', currentIndex);

            if(newLineIndex === -1) {
                this._buffer = buffer;
                return;
            }

            var messageLength = newLineIndex;
            var lastIndex = currentIndex;
            currentIndex += newLineIndex;

            if(buffer[newLineIndex - 1] === '\r') {
                messageLength--;
            }

            var line = buffer.substr(lastIndex, messageLength);
            buffer = buffer.slice(currentIndex + 1);
            var command = parseMessage(line);

            handleCommand(this, command);

            this.emit('message', command);

            currentIndex = 0;

            if(buffer.length === 0) {
                break;
            }
        }

        this._buffer = buffer;
    }

    register(params) {
        params = params || {};

        this.emit('send', buildCommand('USER ' + (params.username || 'WebIRC') + ' * * :' + (params.realname || 'WebIRC User')));
        this.emit('send', buildCommand('NICK ' + (params.nick || 'WebIRC')));
    }

    setNickname(newNickname) {
        if(!newNickname) {
            return;
        }

        this.emit('send', buildCommand('NICK ' + newNickname));
    }

    joinChannel(channel) {
        if(!channel) {
            return;
        }

        if(!channel.startsWith('#')) {
            channel = '#' + channel;
        }

        this.emit('send', buildCommand('JOIN ' + channel));
    }

    leaveChannel(channel) {
        if(!channel) {
            return;
        }

        if(!channel.startsWith('#')) {
            channel = '#' + channel;
        }

        this.emit('send', buildCommand('PART ' + channel));
    }

    sendMessage(target, message) {
        if(!target || !message) {
            return;
        }

        this.emit('send', buildCommand('PRIVMSG ' + target + ' :' + message));
    }
}

module.exports = IRCStream;
