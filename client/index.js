import 'https://cdn.jsdelivr.net/npm/socket.io-client@3.1.0/dist/socket.io.js';
let socket = io();

let modal = document.getElementById("myModal");
let btn1 = document.getElementById("user1");
let btn2 = document.getElementById("user2");

let span = document.getElementsByClassName("close")[0];
let modalTitle = document.getElementById("modal-title");
let modalText = document.getElementById("modal-text");
const notifications = document.getElementById("notifications");
let controls = document.getElementById("controls");
let player = document.getElementById("player");
let update = false;
let timerExists = false;

btn1.addEventListener("click", getAccessToken);
btn2.addEventListener("click", getAccessToken);

span.onclick = function () {
    modal.style.display = "none";
}

window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }

    if (event.target == chatInput || event.target == chatWindow || event.target == sendButton) {
        return;
    }

    chatWindow.classList.add("invisible");
}

function showChat() {
    chatWindow.classList.remove("invisible");
}

function showMessageToast(msg) {
    notifications.innerHTML += "<li id ='" + msg + "'><div id='messageToast'>" + msg + "</div></li>";
    setTimeout(() => { document.getElementById(msg).remove() }, 3000);
}

let copyButton = document.getElementById("copy");
let joinButton = document.getElementById("join");
let visible = true;
let chatWindow = document.getElementById("chat-window");
let sendButton = document.getElementById("send");
let playButton = document.getElementById("accessBtn");
let nextButton = document.getElementById("nextBtn");
let prevButton = document.getElementById("prevBtn");
let nameInput;

copyButton.onclick = function () {
    let code = document.getElementById("invitation-code");

    if (document.selection) {
        let range = document.body.createTextRange();
        range.moveToElementText(code);
        range.select().createTextRange();
        document.execCommand("copy");
    } else if (window.getSelection) {
        let range = document.createRange();
        range.selectNode(code);
        window.getSelection().addRange(range);
        document.execCommand("copy");
    }
}

joinButton.onclick = function () {
    let code = document.getElementById("code");
    let input = document.getElementById("code-input");

    if (visible) {
        code.classList.add("invisible");
        input.classList.remove("invisible");
    } else {
        code.classList.remove("invisible");
        input.classList.add("invisible");
    }

    visible = !visible;
}

playButton.onclick = function () {
    getTrack();
}

nextButton.onclick = function () {
    nextTrack();
}

prevButton.onclick = function () {
    prevTrack();
}

const codeInput = document.getElementById("code-input");
codeInput.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
        joinRoom(codeInput.value);
    }
});

const chatInput = document.getElementById("chat-input");
chatInput.addEventListener ("click", showChat);
chatInput.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
        if (chatInput.value == "") {
            return;
        }
        sendMessage(chatInput.value);
        chatInput.value = "";
    }
});

sendButton.onclick = function () {
    if (chatInput.value == "") {
        return;
    }
    sendMessage(chatInput.value);
    chatInput.value = "";
}

function getAccessToken(event) {
    let id = event.target.id
    saveAccessTokenForUser(id);
    window.open(window.location.href + 'login');
}

function displayControls() {
    controls.classList.remove("invisible");
}

function setCurrentTrack(uri) {
    let uriParts = uri.split(':');
    let trackId = uriParts[2];
    if (player.src != "https://open.spotify.com/embed/track/" + trackId) {
        player.src = "https://open.spotify.com/embed/track/" + trackId;
    }
    player.classList.remove("invisible");
}

/* ------------------------------ Client Side Socket Stuff -------------------------------*/

socket.on('invitation-code', function (code) {
    let code_span = document.getElementById('code');
    code_span.innerHTML = code;
});

socket.on('name', function () {
    modalTitle.innerHTML = "Welcome to Play Together";
    modalText.innerHTML = "This is the App to play DJ for your friends. <br /> Note: You need to allow popups and this only works with a spotify premium membership. <br /> If Spotify Web Player wasn't opened in a new tab click <a href='http://play.spotify.com' target='_blank'>here</a> to open it. <br /> Choose a name to be displayed so people recognize you. If you don't choose a name a random one will be created.<br /><br />";
    modalText.innerHTML += "<input type='text' placeholder='Your name here' id='name-input'>";
    modal.style.display = "block";

    nameInput = document.getElementById("name-input");
    nameInput.addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
            if (nameInput.value == "") {
                return;
            }
            modal.style.display = "none";
            socket.emit('name', nameInput.value);
        }
    });
});

function joinRoom(code) {
    socket.emit('joinRoom', code);
}

socket.on('joinRoom', function (data) {
    let code_span = document.getElementById('code');
    code_span.innerHTML = data.room.id;

    let input = document.getElementById("code-input");
    input.classList.add("invisible");
    code_span.classList.remove("invisible");

    visible = !visible;
});

function sendMessage (msg) {
    socket.emit('chatMessage', msg);
}

function saveAccessTokenForUser (id) {
    socket.emit('saveToken', id);
}

function getTrack () {
    socket.emit('getCurrentTrack', false);
}

function nextTrack () {
    socket.emit('nextTrack');
    setTimeout(function () { socket.emit('getCurrentTrack', true); }, 1000);
}

function prevTrack () {
    socket.emit('prevTrack');
    setTimeout(function () { socket.emit('getCurrentTrack', true); }, 1000);
}

socket.on('chatMessage', function (data) {
    let msg = data.msg;
    let name = data.name;

    let messages = document.getElementById('messages');

    var item = document.createElement('li');
    item.textContent = name + ": " + msg;
    messages.appendChild(item);
    chatWindow.classList.remove("invisible");
});

socket.on('messageToast', function (message) {
    showMessageToast(message);
});

socket.on('connectedSpotify', function (data) {
    let url = data.url;
    let alt = data.alt;
    let container = document.getElementById(data.container);

    container.classList.add('user-container-locked');
    container.innerHTML = "<img src='" + url + "' alt='" + alt + "' style='max-width: 100%; max-height: 100%; display: block;' />";
});

socket.on('accessControls', function () {
    displayControls();
});

socket.on('getCurrentTrack', function (uri) {
    setCurrentTrack(uri);
    // update = !update;

    // if (update && !timerExists) {
    //     var timerId = setInterval(function() {socket.emit('getCurrentTrack', true);}, 5000);
    //     timerExists = true;
    // } else {
    //     clearInterval(timerId);
    //     timerExists = false;
    // }
});


