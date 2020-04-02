// ==UserScript==
// @name         Doorman - Imposter Helper
// @namespace    https://leoverto.github.io
// @version      0.4
// @author       Leo Verto
// @include      *
// @grant        GM.xmlHttpRequest
// @updateurl    https://github.com/LeoVerto/doorman/raw/master/doorman.user.js
// ==/UserScript==

const DETECTOR_URL = "https://detector.abra.me/?";
const CHECK_URL = "https://librarian.abra.me/check";
const SUBMIT_URL = "https://librarian.abra.me/submit";

function addText(note, text) {
    note.appendChild(document.createTextNode(text));
}

function getAnswers() {
    var notes = document.getElementsByTagName("gremlin-note");

    if (notes) {
        var answers = [];
        for (let note of notes) {
            var aid = note.getAttribute("id");
            var answer = note.getAttribute("aria-label").substr(19);
            answers[aid] = answer;
        }
        return answers;
    }
}

function processAnswers(answers) {
    var notes = document.getElementsByTagName("gremlin-note");
    if (notes.length > 0) {
        checkExisting(Object.keys(answers), function(result) { return handleExisting(notes, result)});
    }
}

function handleExisting(notes, results) {
    var i = 0;
    for (let note of notes) {
        if (results[i] === "unknown") {
            // Send previously unseen answers to detector
            checkDetector(note, function(percentage) { return addText(note, Math.round(Number(percentage)*100)+"% bot"); });
        } else {
            // Otherwise add result to note
            addText(note, results[i]);
        }
        i++;
    }
}

function checkExisting(msgs, callback) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({"texts": msgs});

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    fetch(CHECK_URL, requestOptions)
        .then(response => response.json())
        .then(result => callback(result.results))
        .catch(error => console.log('error', error));
}

function checkDetector(note, callback) {
    var answer = note.getAttribute("aria-label").substr(19);

    var requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };
      
    fetch(DETECTOR_URL + answer, requestOptions)
        .then(response => response.json())
        .then(result => callback(result.fake_probability))
        .catch(error => console.log('error', error));
}

function submitResults() {
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

        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        var raw = JSON.stringify({"chosen_text": chosen_text, option_texts, "result": result});

        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: raw,
            redirect: 'follow'
        };

        console.log("Submitting results");
        fetch(SUBMIT_URL, requestOptions)
            .then(response => response.text())
            .then(result => console.log(result))
            .catch(error => console.log('error', error));
        }
}

function handleGremlinAction(e) {
    const type = e.detail.type;
    console.log(type);
    switch (type) {
        case "begin":
            console.log("begin");
            break;
        case "link":
            // We don't want to handle this when a new round is started
            if (!window.location.href.startsWith("https://gremlins-api.reddit.com/results")) {
                console.log("Submitting results in 250ms");
                setTimeout(submitResults, 250);
            }
            break;
        default:
            console.log("default");
    }
    
}

function run() {
    var app = document.getElementsByTagName("gremlin-app")[0];
    if (app) {
        var answers = getAnswers();
        console.log(answers);
        processAnswers(answers);
        app.addEventListener("gremlin-action", handleGremlinAction);
    }
}

(function() {
    if (window.location.hostname === "gremlins-api.reddit.com") {
        setTimeout(run, 100);
    }
})();