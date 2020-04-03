const DETECTOR_URL = "https://detector.abra.me/?";
const ABRA_URL = "https://librarian.abra.me/check";
const SPACESCIENCE_URL = "https://spacescience.tech/check.php";
const OCEAN_URL = "https://wave.ocean.rip/answers/answer";
const REPORT_URL = "http://spacescience.tech/report.php";

async function checkBackronym(msg) {
    return msg.split(" ").map(x => x.charAt(0)).join("").startsWith("human");
}

async function checkExistingAbra(msgs) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    let raw = JSON.stringify({"texts": msgs, "scriptname": getScriptname()});

    let requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    let json = await fetch(ABRA_URL, requestOptions)
                         .then(response => response.json());
    return json.results;
}

async function checkExistingSpacescience(id, strict=true, threshold=1) {
    let requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };

    let json = await fetch(`${SPACESCIENCE_URL}?id=${id}&scriptname=${getScriptname()}`, requestOptions)
                         .then(response => response.json());

    let lose_count = 0;
    let win_count = 0;
    for (let key in json) {
        if (json[key].hasOwnProperty("flag") && json[key].flag == 1) {
            if (json[key].result === "LOSE") {
                lose_count++;
            /*} else if (!strict && json[key].result === "LOSE") {
                lose_count++;*/
            } else if (json[key].result === "WIN") {
                win_count++;
            }
        }
    }

    // Conflict, bad data
    if (lose_count > 0 && win_count < 0) {
        reportConflict(id, "spacescience");
    } else if (lose_count > threshold) {
        return "known human";
    }


    return "unknown";
}

async function checkExistingOcean(msg) {
    let requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };

    let json = await fetch(`${OCEAN_URL}?text=${msg}&scriptname=${getScriptname()}`, requestOptions)
                         .then(response => response.json());

    if (json.status=200) {
        if (json.answer.is_correct) {
            return "known fake";
        } else {
            return "known human";
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

async function reportConflict(id, source) {
    console.log("Reporting conflict.")

    var requestOptions = {
        method: 'GET',
        redirect: 'follow'
      };

    let json = await fetch(`${REPORT_URL}?uuid=${id}&source=${source}&scriptname=${getScriptname()}`, requestOptions)
        .then(response => response.json())
        .catch(error => console.log('error', error));

    return json;
}

function getScriptname() {
    return `${GM_info.script.name} ${GM_info.script.version}`;
}