// ==UserScript==
// @name         Doorman - Imposter Helper
// @namespace    https://qqii.github.io
// @version      0.0.1
// @author       qqii
// @include      *
// @grant        GM.xmlHttpRequest
// @match        https://gremlins-api.reddit.com/room?nightmode=1&platform=desktop
// @match        https://gremlins-api.reddit.com/room?nightmode=1&platform=desktop*
// @match        https://gremlins-api.reddit.com/results?*
// ==/UserScript==

// @updateurl    https://github.com/LeoVerto/doorman/raw/master/doorman.user.js

const DETECTOR_URL = "https://detector.abra.me/?";
const CHECK_URL = "https://librarian.abra.me/check";
const SUBMIT_URL = "https://librarian.abra.me/submit";

async function processAnswers(answers) {
    var notes = document.getElementsByTagName("gremlin-note");
    if (notes.length > 0) {
        var result = await checkExisting(Object.keys(answers));
        handleExisting(notes, result);
    }
}

async function handleExisting(notes, results) {
    // console.log("results: ", results);
    var i = 0;
    for (let note of notes) {
        var result = results[i];
        if (results[i] === "unknown") {
            // Send previously unseen answers to detector
            var percentage = await checkDetector(note);
            addText(note, Math.round(Number(percentage)*100)+"% bot");
        } else if (result === "known fake") {
            addText(note, result);
            note.setAttribute("style", "background-color: green;")
        } else {
            addText(note, result);
            note.setAttribute("style", "background-color: darkred;")
        }
        i++;
    }
}

async function checkExisting(msgs) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({"texts": msgs});

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    var response = await fetch(CHECK_URL, requestOptions);
    var result = await response.json();
    return result.results;
}

async function checkDetector(note) {
    var answer = note.getAttribute("aria-label").substr(19);
    return checkDetectorAnswerTXT(answer);
}

async function checkDetectorAnswerTXT(answer) {
    var requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };
      
    var response = await fetch(DETECTOR_URL + answer, requestOptions);
    var result = await response.json();
    return result.fake_probability;
}

async function submitResults() {
    var notes = document.getElementsByTagName("gremlin-note");

    if (notes) {
        var chosen_text = "";
        var result = "";
        var option_texts = [];
        for (let note of notes) {
            var state = note.getAttribute("state");
            var text_regex = /^\s*(.*)\n/
            var text = text_regex.exec(note.innerHTML)[1];

            option_texts.push(text);
            if (state !== "none") {
                // Selected answer
                chosen_text = text;
                result = state === "correct" ? "WIN" : "LOSE";
            }

        }
        
        submitResultsFetch(chosen_text, option_texts, result);
    }
}

async function submitResultsFetch(chosen_text, option_texts, result) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({"chosen_text": chosen_text, option_texts, "result": result});
    // console.log("raw: ", {"chosen_text": chosen_text, option_texts, "result": result});
    // console.log(option_texts);
    // window.alert("raw: ", {"chosen_text": chosen_text, option_texts, "result": result});

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    // console.log("Submitting results");
    
    var response = await fetch(SUBMIT_URL, requestOptions);
    // console.log(await response.text());
}

// imposterbot.user.js

document.getElementsByTagName("head")[0].insertAdjacentHTML(
    "beforeend",
    "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css\" />");

var imported = document.createElement('script');
imported.src = 'https://cdn.jsdelivr.net/npm/toastify-js';
document.head.appendChild(imported);

async function getRoom() {
    let res = await (await fetch("https://gremlins-api.reddit.com/room?nightmode=1&platform=desktop")).text();
    let parser = new DOMParser();
    let doc = parser.parseFromString(res, "text/html");

    return {
        token: doc.getElementsByTagName("gremlin-app")[0].getAttribute("csrf"),
        options: Array.from(doc.getElementsByTagName("gremlin-note")).map(e => [e.id, e.innerText])
    };
};

async function submitAnswer(token, id) {
    let body = new FormData();
    body.append("undefined", "undefined");
    body.append("note_id", id);
    body.append("csrf_token", token);
    let res = await (await fetch("https://gremlins-api.reddit.com/submit_guess", {
        method: "post",
        body
    })).text();

    return JSON.parse(res);
}

async function submitAnswerToDB(answer, result, room) {
    let body = new FormData();
    delete room.token;
    body.append("answer", answer);
    body.append("result", result);
    body.append("room", JSON.stringify(room));
    let res = await (await fetch("https://spacescience.tech/api.php", {
        method: "post",
        body
    })).text();
    
    return JSON.parse(res);
}

function getStats() {
    console.log(wins);
    return `All: ${wins.length+loses.length}
Wins: ${wins.length} (${((wins.length/(wins.length+loses.length))*100).toFixed(1)}%)
Loses: ${loses.length} (${((loses.length/(wins.length+loses.length))*100).toFixed(1)}%)
`;
}

async function play() {
    let room = await getRoom();
    let answers = room.options.flatMap(x => x[0]);
    var results = await checkExisting(answers);

    for (var i = 0; i < results.length; i++) {
        if (results[i] == "unknown") {
            var percentage = await checkDetectorAnswerTXT(room.options[i][1]);
            results[i] = Math.round(Number(percentage)*100);
        } else if (results[i] == "known fake") {
            results[i] = 100;
        }
    }

    let answer = 0;
    let maxBot = 0;
    for (var i = 0; i < results.length; i++) {
        if (results[i] > maxBot) {
            answer = i;
            maxBot = results[i];
        }
    }

    let result = await submitAnswer(room.token, room.options[answer][0]);
    let _ = submitResultsFetch(room.options[answer][1], room.options.flatMap(x => x[1].trim()), result.result)

    return [room.options[answer][1], result.result, room];
};

window.wins = []; window.loses = [];
setInterval(async () => {
    let game = await play();
    let submit = await submitAnswerToDB(game[0].trim(), game[1], game[2]);
    game[0] = game[0].trim();
    if(game[1] === "WIN") wins.push(game[0]);
    else if(game[1] === "LOSE") loses.push(game[0]);
Toastify({
  text: game[0] + " "+ game[1],
  duration: 1000, 
  newWindow: true,
  close: true,
  gravity: "top", // `top` or `bottom`
  position: 'left', // `left`, `center` or `right`
  backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
  stopOnFocus: false, // Prevents dismissing of toast on hover
}).showToast();
}, 4000)

setInterval(() => {
    let curstatus = getStats();
Toastify({
  text: curstatus,
  duration: 10000, 
  newWindow: true,
  close: true,
  gravity: "top", // `top` or `bottom`
  position: 'left', // `left`, `center` or `right`
  backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
  stopOnFocus: false, // Prevents dismissing of toast on hover
}).showToast();
}, 5000);
