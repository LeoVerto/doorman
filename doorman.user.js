// ==UserScript==
// @name         Doorman - Imposter Helper
// @namespace    https://leoverto.github.io
// @version      1.4
// @author       Leo Verto
// @include      https://gremlins-api.reddit.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @updateurl    https://github.com/LeoVerto/doorman/raw/master/doorman.user.js
// @require      https://github.com/LeoVerto/doorman/raw/master/doorman-lib.js?v=1.4
// ==/UserScript==

const VERSION = "1.4";
const SUBMIT_ABRA_URL = "https://librarian.abra.me/submit";
const SUBMIT_SPACESCIENCE_URL = "https://spacescience.tech/api.php";

function setState(note, hint, state) {
    if (state === "") {
        return;
    }

    // State conflict
    if (hint.hasAttribute("state") && hint.getAttribute("state") !== state) {
        state = "conflict";
    }

    if (state === "bot") {
        note.setAttribute("style", "background-color: green;");
    } else if (state === "human") {
        note.setAttribute("style", "background-color: darkred;");
    // State conflict
    } else {
        note.setAttribute("style", "background-color: orange;");
        hint.textContent("Database conflict!");
    }

    hint.setAttribute("state", state);
}

function setHint(note, text, state="", overwriteable=false) {
    let hint = note.getElementsByClassName("doorman-hint")[0];

    // Hint tag does not already exist
    if (!hint) {
        hint = document.createElement("i");
        hint.setAttribute("class", "doorman-hint");

        // Set overwriteable attribute so we can check later
        if (overwriteable) {
            hint.setAttribute("overwriteable", "");
        }

        setState(note, hint, state);

        note.appendChild(hint);
        hint.textContent = text;

    // Only overwrite if previously set as overwriteable
    } else if (hint.hasAttribute("overwriteable")) {
        hint.textContent = text;
        setState(note, hint, state);
    }
    /*// Add to message
    } else {
        let regex = /\(.*\)/
        hint.textContent = `(${regex.exec(hint.textContent)}, ${text})`;
        setState(note, hint, state);
    }*/
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
    let notes = document.getElementsByTagName("gremlin-note");
    if (notes.length > 0) {
        let abra = await checkExistingAbra(Object.values(answers.map(x => x.msg)))
                             .catch(error => console.log('error', error));

        let promises = [];
        for (let i = 0; i < notes.length; i++) {
            // Handle results from own db
            if (abra[i] !== "unknown") {
                promises.append(handleExisting(notes[i], abra[i], "abra.me, own db"));
            }

            // Check if the message is a backronym
            promises.push(checkBackronym(answers[i].msg)
                              .then(handleExisting(notes[i], "", "spells HUMAN")));

            // Check spacescience.tech
            promises.push(checkExistingSpacescience(answers[i].id, false)
                              .then(result => handleExisting(notes[i], result, "spacescience.tech")));

            // Check ocean.rip
            promises.push(checkExistingOcean(answers[i].msg)
                              .then(result => handleExisting(notes[i], result, "ocean.rip")));

        }

        // Wait until all requests have been handled
        await Promise.all(promises.map(p => p.catch(e => e)))
            .catch(e => console.log(e));

        let bot_answers = [];
        let unknown_answers = [];
        let conflicts = false;
        for (let note of notes) {
            // If note hint is not set
            let hint = note.getElementsByClassName("doorman-hint")[0];
            if (!hint) {
                unknown_answers.push(note);
            } else if (hint.getAttribute("state") === "bot") {
                bot_answers.push(note);
            } else if (hint.getAttribute("state") === "conflict") {
                conflicts = true;
            }
        }
        console.log(unknown_answers.length + " unknown answers left.");

        // Autoclicker
        if (GM_getValue("autoclick", false) && !conflicts) {
            // Click known bot answer
            if (bot_answers.length > 0) {
                bot_answers[0].click();
                return;

            // Click unknown answer
            } else if (unknown_answers.length == 1) {
                unknown_answers[0].click();
                return;
            }
        }

        // Only check detector when there's more than one unknown answer left
        if (unknown_answers.length > 1){
            // Check detector
            for (let i = 0; i < notes.length; i++) {
                if (unknown_answers.includes(notes[i])) {
                    checkDetector(answers[i].msg)
                        .catch(error => console.log('error', error))
                        .then(percentage => setHint(notes[i], Math.round(Number(percentage)*100)+"% bot", "", true));
                }
            }
        }
    }
}

async function handleExisting(note, result, source) {
    if (result === "known fake") {
        setHint(note, result + " (" + source + ")", "bot");
    } else if (result === "known human") {
        setHint(note, result + " (" + source + ")", "human");
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
    let room = {"options": options};

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
    switch (type) {
        case "begin":
            console.log("begin");
            break;
        case "link":
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

async function addMenu(app) {
    let html = `
        <p style="float: right; margin-top: 0;">Doorman ${VERSION}</p>
        <input type="checkbox" id="doorman-autoclick">
        <label for="doorman-autoclick">Enable Doorman autoclicker</label>
    `
    let div = document.createElement("div");
    div.setAttribute("id", "doorman-options");
    div.innerHTML = html;
    app.appendChild(div);

    let checkbox = document.getElementById("doorman-autoclick");
    checkbox.checked = GM_getValue("autoclick", false);
    checkbox.addEventListener("change", function () {
        GM_setValue("autoclick", this.checked);
    });
}

function run() {
    var app = document.getElementsByTagName("gremlin-app")[0];
    if (app) {
        addMenu(app);
        var answers = getAnswers();
        console.log(answers);
        processAnswers(answers);
        app.addEventListener("gremlin-action", handleGremlinAction);

        // Autoclick "Keep Going!" if we're on the results page
        if (window.location.href.startsWith("https://gremlins-api.reddit.com/results")) {
            if (GM_getValue("autoclick", false)) {
                for (let a of app.getElementsByTagName("a")) {
                    if (a.textContent === "Keep Going!") {
                        a.click();
                    }
                }
            }
        }
    }
}

(function() {
    setTimeout(run, 100);
})();
