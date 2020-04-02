// ==UserScript==
// @name         Doorman - Imposter Helper
// @namespace    https://leoverto.github.io
// @version      1.0
// @author       Leo Verto
// @include      https://gremlins-api.reddit.com/*
// @grant        GM.xmlHttpRequest
// @updateurl    https://github.com/LeoVerto/doorman/raw/master/doorman.user.js
// @require      https://github.com/LeoVerto/doorman/raw/master/doorman-lib.js?v=1.0
// ==/UserScript==

const SUBMIT_ABRA_URL = "https://librarian.abra.me/submit";
const SUBMIT_SPACESCIENCE_URL = "https://spacescience.tech/api.php";

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

            // Check if the message is a backronym
            checkBackronym(answers[i].msg)
                .then(handleExisting(notes[i], "", "spells HUMAN"));

            // Check spacescience.tech
            checkExistingSpacescience(answers[i].id, false)
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
        setHint(note, result + " (" + source + ")");
        note.setAttribute("style", "background-color: green;")
    } else if (result === "known human") {
        setHint(note, result + " (" + source + ")");
        note.setAttribute("style", "background-color: darkred;")
    }
}

function submitResults() {
    var notes = document.getElementsByTagName("gremlin-note");

    if (notes) {
        let chosen_text = "";
        let result = "";
        let answers = [];
        for (let note of notes) {
            let state = note.getAttribute("state");
            let id = note.getAttribute("id");
            let text_regex = /^\s*(.*)\n/
            let text = text_regex.exec(note.innerHTML)[1];

            answers.push({id: id, msg: text});
            if (state !== "none") {
                // Selected answer
                chosen_text = text;
                result = state === "correct" ? "WIN" : "LOSE";
            }
        }

        // Kick off submission in parallel, we don't care about the responses.
        submitResultsAbra(chosen_text, result, answers.map(x => x.msg));
        submitResultsSpacescience(chosen_text, result, answers.map(x => [x.id, x.msg]));
    }
}

async function submitResultsAbra(chosen_text, result, option_texts) {

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
    fetch(SUBMIT_ABRA_URL, requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
}

async function submitResultsSpacescience(answer, result, options) {
    let room =  {"options": options};

    let body = new FormData();
    body.append("answer", answer);
    body.append("result", result);
    body.append("room", JSON.stringify(room));
    let res = await (await fetch(SUBMIT_SPACESCIENCE_URL, {
        method: "post",
        body
    })).text();

    return JSON.parse(res);
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
                // We have to wait a bit for reddit to get the results but after 300ms they redirect us
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
