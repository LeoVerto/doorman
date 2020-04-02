// ==UserScript==
// @name         Doorman 2 - Imposter Helper
// @namespace    https://leoverto.github.io
// @version      0.2
// @author       Leo Verto
// @include      *
// @grant        GM.xmlHttpRequest
// @updateurl    https://github.com/LeoVerto/doorman/raw/master/doorman2.user.js
// I'm not great at js, so I'll just say I modified this to use a different service to check if it's a bot or not. -cg
// ==/UserScript==

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
        //checkExisting(Object.keys(answers), function(result) { return handleExisting(notes, result)});
        for (let note of notes) {
            checkDetector(note, function(percentage) { return addText(note, Math.round(Number(percentage)*100)+"% bot"); });
        }
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

function checkExisting(ids, callback) {
    var requestOptions = {
        method: 'GET',
        redirect: 'follow'
      };
      fetch("https://huggingface.co/openai-detector/check?ids="+ids.join(","), requestOptions)
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

      fetch("https://huggingface.co/openai-detector/?" + answer, requestOptions)
        .then(response => response.json())
        .then(result => callback(result.fake_probability))
        .catch(error => console.log('error', error));
}

function handleGremlinAction(e) {
    const type = e.detail.type;
    switch (type) {
        case "begin":
            console.log("begin!");
            console.log(getAnswers());
            break;
        default:
            console.log("default");
    }

}

function run() {
    var answers = getAnswers();
    console.log(answers);
    processAnswers(answers);
    var app = document.getElementsByTagName("gremlin-app")[0];
    if (app) {
        app.addEventListener("gremlin-action", handleGremlinAction);
    }
}

(function() {
    if (window.location.hostname === "gremlins-api.reddit.com") {
        setTimeout(run, 100);
    }
})();
