// ==UserScript==
// @name         Doorman - Imposter Helper
// @namespace    https://leoverto.github.io
// @version      0.5
// @author       Leo Verto
// @include      https://gremlins-api.reddit.com/*
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

async function processAnswers(answers) {
    var notes = document.getElementsByTagName("gremlin-note");
    if (notes.length > 0) {
        let results = await checkExisting(Object.values(answers))
                                .catch(error => console.log('error', error));

        await handleExisting(notes, results);
    }
}

async function handleExisting(notes, results) {
    for (let i = 0; i < notes.length; i++) {
        let result = results[i];
        let note = notes[i];
        if (result === "unknown") {
            // Send previously unseen answers to detector
            let percentage = await checkDetector(note)
                                       .catch(error => console.log('error', error));
            addText(note, Math.round(Number(percentage)*100)+"% bot");
        } else if (result === "known fake") {
            addText(note, result);
            note.setAttribute("style", "background-color: green;")
        } else {
            addText(note, result);
            note.setAttribute("style", "background-color: darkred;")
        }
    }
}

async function checkExisting(msgs) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    let raw = JSON.stringify({"texts": msgs});

    let requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    let json = await fetch(CHECK_URL, requestOptions)
                         .then(response => response.json());
    return json.results;
}

async function checkDetector(note) {
    let answer = note.getAttribute("aria-label").substr(19);

    let requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };
      
    let json = await fetch(DETECTOR_URL + answer, requestOptions)
                         .then(response => response.json());
    return json.fake_probability;
        
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
    setTimeout(run, 100);
})();
