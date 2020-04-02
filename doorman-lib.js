const DETECTOR_URL = "https://detector.abra.me/?";
const ABRA_URL = "https://librarian.abra.me/check";
const SPACESCIENCE_URL = "https://spacescience.tech/check.php?id=";
const OCEAN_URL = "https://wave.ocean.rip/answers/answer?text=";

async function checkBackronym(msg) {
    return msg.split(" ").map(x => x.charAt(0)).join("").startsWith("human");
}

async function checkExistingAbra(msgs) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    let raw = JSON.stringify({"texts": msgs});

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

async function checkExistingSpacescience(id, strict=True) {
    let requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };

    let json = await fetch(SPACESCIENCE_URL+id, requestOptions)
                         .then(response => response.json());

    console.log(json);

    for (let key in json) {
        if (json[key].hasOwnProperty("flag")) {
            if (json[key].flag == 1 && json[key].result === "LOSE") {
                return "known human";
            } else if (!strict && json[key].flag == 1 && json[key].result === "LOSE") {
                return "known human;"
            }
        }
    }
    return "unknown";
}

async function checkExistingOcean(msg) {
    let requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };

    let json = await fetch(OCEAN_URL+msg, requestOptions)
                         .then(response => response.json());

    console.log(json);

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
