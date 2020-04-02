// ==UserScript==
// @name         Doorman - Imposter Helper
// @namespace    https://leoverto.github.io
// @version      0.8
// @author       Leo Verto
// @include      https://gremlins-api.reddit.com/*
// @grant        GM.xmlHttpRequest
// @updateurl    https://github.com/LeoVerto/doorman/raw/master/doorman.user.js
// @require      https://github.com/LeoVerto/doorman/raw/master/doorman-lib.js?v=0.8
// ==/UserScript==

const SUBMIT_URL = "https://librarian.abra.me/submit";

function setHint(note, text, overwriteable=false) {
    let hint = note.getElementsByClassName("doorman-hint")[0];

    // Hint tag does not already exist
    if (!hint) {
        hint = document.createElement("i");
        hint.setAttribute("class", "doorman-hint");

        // Set overwriteable attribute so we can check later
        if (overwriteable) {
            hint.setAttribute("overwriteable", "");
        }

        note.appendChild(hint);
        hint.textContent = text;

    // Only overwrite if previously set as overwriteable
    } else if (hint.hasAttribute("overwriteable")) {
        hint.textContent = text;
    }
}

function getAnswers() {
    var notes = document.getElementsByTagName("gremlin-note");

    if (notes) {
        var answers = [];
        for (let note of notes) {
            let id = note.getAttribute("id");
            let msg = note.getAttribute("aria-label").substr(19);
            answers.push({id: id, msg: msg});
        }
        return answers;
    }
}

async function processAnswers(answers) {
    var notes = document.getElementsByTagName("gremlin-note");
    if (notes.length > 0) {
        let results = await checkExistingAbra(Object.values(answers.map(x => x.msg)))
                                .catch(error => console.log('error', error));
        for (let i = 0; i < notes.length; i++) {
            // Handle results from own db
            console.log(results[i]);
            if (results[i] !== "unknown") {
                await handleExisting(notes[i], results[i], "abra.me, own db");
                continue;
            }

            // Check spacescience.tech
            checkExistingSpacescience(answers[i].id)
                .then(result => handleExisting(notes[i], result, "spacescience.tech"));

            // Check ocean.rip
            checkExistingOcean(answers[i].msg)
                .then(result => handleExisting(notes[i], result, "ocean.rip"));

            // Check detector
            checkDetector(answers[i].msg)
                .catch(error => console.log('error', error))
                .then(percentage => setHint(notes[i], Math.round(Number(percentage)*100)+"% bot", true));
        }
    }
}

async function handleExisting(note, result, source) {
    if (result === "known fake") {
        setHint(note, result  + " (" + source + ")");
        note.setAttribute("style", "background-color: green;")
    } else if (result === "known human") {
        setHint(note, result + " (" + source + ")");
        note.setAttribute("style", "background-color: darkred;")
    }
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
