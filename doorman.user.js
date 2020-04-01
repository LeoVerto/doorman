// ==UserScript==
// @name         Doorman - Imposter Helper
// @namespace    https://leoverto.github.io
// @version      0.1
// @author       Leo Verto
// @include      *
// @grant        GM.xmlHttpRequest
// ==/UserScript==

function getAnswers() {
    var notes = document.getElementsByTagName("gremlin-note");

    if (notes) {
        var answers = [];
        for (let note of notes) {
            var aid = note.getAttribute("id");
            var answer = note.getAttribute("aria-label").substr(19);
            answers[aid] = answer;
            checkDetector(answer, function(percentage) { return addPercentage(note, percentage); });
        }
        return answers;
    }
}

function addPercentage(note, percentage) {
    //var icon = document.createElement("g-icon");
    //icon.setAttribute("role", "presentation");
    //icon.appendChild(document.createTextNode(percentage));
    //note.appendChild(icon);
    note.appendChild(document.createTextNode(percentage));
}

function checkDetector(answer, callback) {
    var requestOptions = {
        method: 'GET',
        redirect: 'follow'
      };
      
      fetch("https://detector.abra.me/?" + answer, requestOptions)
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
    console.log(getAnswers());
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