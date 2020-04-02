// ==UserScript==
// @name         Doorman - Imposter Helper
// @namespace    https://leoverto.github.io
// @version      0.7
// @author       Leo Verto
// @include      https://gremlins-api.reddit.com/*
// @grant        GM.xmlHttpRequest
// @updateurl    https://github.com/LeoVerto/doorman/raw/master/doorman.user.js
// ==/UserScript==

const DETECTOR_URL = "https://detector.abra.me/?";
const CHECK_URL = "https://librarian.abra.me/check";
const SUBMIT_URL = "https://librarian.abra.me/submit";
const SPACESCIENCE_URL = "https://spacescience.tech/check.php?id=";

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
        let results = await checkExisting(Object.values(answers.map(x => x.msg)))
                                .catch(error => console.log('error', error));
        for (let i = 0; i < notes.length; i++) {
            // Handle results from own db
            console.log(results[i]);
            if (results[i] !== "unknown") {
                await handleExisting(notes[i], results[i], "abra.me, own db");
                continue;
            }

            // Check https://spacescience.tech
            checkExistingSpacescience(answers[i].id)
                .then(result => handleExisting(notes[i], result, "spacescience.tech"));

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

async function checkExistingSpacescience(id) {
    let requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };

    let json = await fetch(SPACESCIENCE_URL+id, requestOptions)
                         .then(response => response.json());

    console.log(json);

    for (key in json) {
        if (json[key].hasOwnProperty("flag")) {
            if (json[key].flag = 1) {
                console.log(json[key]);
                switch(json[key].result) {
                    /*case "WIN":
                        return "known fake";
                        Known bot data is completely unrealiable.
                    */
                    case "LOSE":
                        return "known human";
                }
            }
        }
    }
    return "unknown";
}

async function checkDetector(msg) {
    let requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };
      
    let json = await fetch(DETECTOR_URL + msg, requestOptions)
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
