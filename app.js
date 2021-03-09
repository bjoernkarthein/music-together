require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const app = express();
const serv = require('http').Server(app);
const io = require('socket.io')(serv);
const PORT = process.env.PORT || 2000;

const random_id = require('./random-id');
const globals = require('./globals');

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(PORT);
console.log("Server started");

/* --------------- Node Server ----------------------- */

let SOCKET_LIST = {};
let PLAYER_LIST = {};
let ROOM_LIST = {};
let PLAYERACCESS;
let CONTAINER;

class Room {
    constructor(_id, _creator) {
        this.id = _id;
        this.creator = _creator;
        this.players = {};
        this.players[_creator] = _creator;
    }

    messagePlayers(channel, data) {
        for (let id in this.players) {
            let socket = SOCKET_LIST[id];
            if (socket == undefined) {
                continue;
            }
            socket.emit(channel, data);
        }
    }

    messagePlayersButNotSelf(self, channel, data) {
        for (let id in this.players) {
            if (id == self) {
                continue;
            }
            let socket = SOCKET_LIST[id];
            socket.emit(channel, data);
        }
    }
}

class Player {
    constructor(_id, _room, _name) {
        this.id = _id;
        this.room = _room;
        this.name = _name;
        this.access_token;
    }

    getRoomId() {
        return this.room.id;
    }

    authenticate() {
        if (this.access_token == "") {
            return 1;
        }

        spotifyApi.setAccessToken(this.access_token);

    }
}

function sendMessageToast(room, NOTSELF_FLAG, self, message) {
    if (NOTSELF_FLAG) {
        room.messagePlayersButNotSelf(self, 'messageToast', message);
    } else {
        room.messagePlayers('messageToast', message);
    }
}

function setProfilePicture(token) {
    spotifyApi.setAccessToken(token);
    (async () => {
        const me = await spotifyApi.getMe();
        let user = me.body;
        console.log(user);
        let imgUrl = "";
        if (user.images.length > 0) {
            imgUrl = user.images[0].url;
        }
        console.log(imgUrl);

        PLAYERACCESS.room.messagePlayers('connectedSpotify', ({
            url: imgUrl,
            alt: user.display_name,
            container: CONTAINER
        }));

        let socket = SOCKET_LIST[PLAYERACCESS.id];
        socket.emit('messageToast', "You connected to Spotify.");
        socket.emit('accessControls');
        sendMessageToast(PLAYERACCESS.room, true, PLAYERACCESS.id, PLAYERACCESS.name + " connected to spotify.");
    })().catch(e => {
        console.error(e);
    });
}

io.on('connection', (socket) => {
    console.log('a user connected');

    SOCKET_LIST[socket.id] = socket;
    let room = new Room(random_id.getUniqueId(), socket.id);
    let player = new Player(socket.id, room, "Player1");
    ROOM_LIST[room.id] = room;
    PLAYER_LIST[socket.id] = player;
    console.log(ROOM_LIST);

    socket.emit('invitation-code', (room.id));
    socket.emit('name');

    socket.on('disconnect', () => {
        console.log('user disconnected');

        delete ROOM_LIST[PLAYER_LIST[socket.id].getRoomId()];
        delete PLAYER_LIST[socket.id];
        delete SOCKET_LIST[socket.id];
    });

    socket.on('joinRoom', roomId => {
        roomId = roomId.replace(/\s/g, '');
        let player = PLAYER_LIST[socket.id];

        let room = ROOM_LIST[roomId];

        if (room === undefined) {
            socket.emit('messageToast', "Can not find room " + roomId);
            return;
        }

        if (player.room.id === roomId) {
            return;
        }

        console.log("Player wants to join room " + roomId);

        let originRoom = player.room;
        delete originRoom.players[socket.id];

        if (Object.keys(originRoom.players).length === 0) {
            delete ROOM_LIST[PLAYER_LIST[socket.id].getRoomId()];
        }

        room.players[player.id] = player.id;
        player.room = room;

        room.messagePlayers('joinRoom', {
            player: player,
            room: room
        });
        console.log(ROOM_LIST);

        socket.emit('messageToast', "You joined the room " + roomId + ".");
        sendMessageToast(player.room, true, socket.id, player.name + " joined your room.");
    });

    socket.on('chatMessage', msg => {
        let room = PLAYER_LIST[socket.id].room;
        let name = PLAYER_LIST[socket.id].name;
        room.messagePlayers('chatMessage', {
            msg: msg,
            name: name
        })
    });

    socket.on('name', name => {
        let player = PLAYER_LIST[socket.id];
        player.name = name;
        socket.emit('messageToast', "Welcome " + name + ".");
    });

    socket.on('saveToken', container => {
        PLAYERACCESS = PLAYER_LIST[socket.id];
        CONTAINER = container;
    });

    socket.on('nextTrack', () => {
        let player = PLAYER_LIST[socket.id];

        player.authenticate();

        spotifyApi.skipToNext()
            .then(function () {
                console.log('Skip to next');
            }, function (err) {
                //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
                console.log('Something went wrong!', err);
            });
    });

    socket.on('prevTrack', () => {
        let player = PLAYER_LIST[socket.id];

        player.authenticate();

        spotifyApi.skipToPrevious()
            .then(function () {
                console.log('Skip to previous');
            }, function (err) {
                //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
                console.log('Something went wrong!', err);
            });
    });

    socket.on('getCurrentTrack', (updateOnly) => {
        let player = PLAYER_LIST[socket.id];

        player.authenticate();

        if (!updateOnly) {
            spotifyApi.getMyCurrentPlaybackState()
                .then(function (data) {
                    // Output items
                    if (data.body && data.body.is_playing) {
                        spotifyApi.pause()
                            .then(function () {
                                console.log('Playback paused');
                            }, function (err) {
                                //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
                                console.log('Something went wrong!', err);
                            });
                    } else {
                        spotifyApi.play()
                            .then(function () {
                                console.log('Playback started');
                            }, function (err) {
                                //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
                                console.log('Something went wrong!', err);
                                socket.emit('messageToast', "Open Spotify and select a song.");
                            });
                    }
                }, function (err) {
                    console.log('Something went wrong!', err);
                });
        }

        spotifyApi.getMyCurrentPlayingTrack()
            .then(function (data) {
                if (data.body.item == undefined) {
                    console.log("No active device");
                } else {
                    console.log(data.body.item.name);
                    player.room.messagePlayers('getCurrentTrack', data.body.item.uri);
                }
            }, function (err) {
                console.log('Something went wrong!', err);
            });

    });

    socket.on('moveMouse', data => {
        let player = PLAYER_LIST[socket.id];
        player.room.messagePlayers('moveMouse', data);
    });
});

/* ---------------- SpotifyWebApi ------------------------ */

var SpotifyWebApi = require('spotify-web-api-node');
const { url } = require('inspector');

const scopes = [
    'ugc-image-upload',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'app-remote-control',
    'user-read-email',
    'user-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-read-private',
    'playlist-modify-private',
    'user-library-modify',
    'user-library-read',
    'user-top-read',
    'user-read-playback-position',
    'user-read-recently-played',
    'user-follow-read',
    'user-follow-modify'
];

const spotifyApi = new SpotifyWebApi({
    redirectUri: globals.URI + '/callback/',
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
});

app.get('/login', (req, res) => {
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', (req, res) => {
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;

    if (error) {
        console.error('Callback Error:', error);
        res.send(`Callback Error: ${error}`);
        return;
    }

    spotifyApi
        .authorizationCodeGrant(code)
        .then(data => {
            const access_token = data.body['access_token'];
            const refresh_token = data.body['refresh_token'];
            const expires_in = data.body['expires_in'];

            spotifyApi.setAccessToken(access_token);
            spotifyApi.setRefreshToken(refresh_token);

            console.log('access_token:', access_token);
            console.log('refresh_token:', refresh_token);
            PLAYERACCESS.access_token = access_token;
            console.log(PLAYERACCESS);
            setProfilePicture(access_token);

            console.log(
                `Sucessfully retreived access token. Expires in ${expires_in} s.`
            );
            res.send('Success! You can now close the window.');

            setInterval(async () => {
                const data = await spotifyApi.refreshAccessToken();
                const access_token = data.body['access_token'];

                console.log('The access token has been refreshed!');
                console.log('access_token:', access_token);
                spotifyApi.setAccessToken(access_token);
            }, expires_in / 2 * 1000);
        })
        .catch(error => {
            console.error('Error getting Tokens:', error);
            res.send(`Error getting Tokens: ${error}`);
        });
});
