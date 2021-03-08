let modal = document.getElementById("myModal");

let btn1 = document.getElementById("user1");
let btn2 = document.getElementById("user2");

let span = document.getElementsByClassName("close")[0];
let modalTitle = document.getElementById("modal-title");
let modalText = document.getElementById("modal-text");
const notifications = document.getElementById("notifications");
let controls = document.getElementById("controls");
let player = document.getElementById("player");

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

showChat = function () {
    chatWindow.classList.remove("invisible");
}

showMessageToast = function (msg) {
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

function getAccessToken(id) {
    console.log(id);
    saveAccessTokenForUser(id);
    window.open(window.location.href + 'login');
}

function displayControls() {
    controls.classList.remove("invisible");
}

function setCurrentTrack(uri) {
    let uriParts = uri.split(':');
    let trackId = uriParts[2];
    player.src = "https://open.spotify.com/embed/track/" + trackId;
    player.classList.remove("invisible");
}

$(document).on('mousemove', function (event) {
    sendMouseCoordinates(event.pageX, event.pageY);
});

