const express = require('express');
const app = express();
const serv = require('http').Server(app);
const io = require('socket.io')(serv);
const PORT = process.env.PORT || 2000;

const random_id = require('./random-id');

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
}

function sendMessageToast(room, message) {
    room.messagePlayers('messageToast', message);
}

function setProfilePicture(token) {
    spotifyApi.setAccessToken(token);
    (async () => {
        const me = await spotifyApi.getMe();
        let user = me.body;
        console.log(user);
        let imgUrl = user.images[0].url;
        console.log(imgUrl);

        PLAYERACCESS.room.messagePlayers('connectedSpotify', ({
            url: imgUrl,
            alt: user.display_name,
            container : CONTAINER
        }));
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

    socket.on('click', () => {
        io.emit('test');
    });

    socket.on('joinRoom', data => {
        let player = PLAYER_LIST[data.requester];
        let roomId = data.room;
        roomId = roomId.replace(/\s/g, '');

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

        sendMessageToast(player.room, player.name + " joined your room.");
    });

    socket.on('chatMessage', data => {
        let sender = data.sender;
        let msg = data.msg;

        let room = PLAYER_LIST[sender].room;
        let name = PLAYER_LIST[sender].name;
        room.messagePlayers('chatMessage', {
            msg: msg,
            name: name
        })
    });

    socket.on('name', data => {
        let socketId = data.sender;
        let name = data.name;

        let player = PLAYER_LIST[socketId];
        player.name = name;
        sendMessageToast(player.room, "Welcome " + name + ".");
    });

    socket.on('saveToken', data => {
        sender = data.sender;
        container = data.container;
        PLAYERACCESS = PLAYER_LIST[sender];
        CONTAINER = container;
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
    redirectUri: 'http://localhost:2000/callback/',
    clientId: '603774c1ea1d433f84d34ec5438a025c',
    clientSecret: 'c50d849c942444eaa0c3cc1a75c83797'
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
