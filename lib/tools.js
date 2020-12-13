const config = require("../config.json");
const fs = require('fs');
const glob = require("glob");
const crypto = require("crypto");

async function cleanFileTemp(id) {
    await glob.Glob(`../temp/*${id}*`, async function (er, files) {
        files.forEach(file => {
            fs.unlinkSync(file);
        });
    });
}

function validURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}

function genId() {
    return crypto.randomBytes(16).toString("hex");
}

function conlog_info(str) {
    if (config.debug) {
        console.log(str);
    }
    global.log.info(str);
}

function conlog_info_force(str) {
    console.log(str);
    global.log.info(str);
}

function conlog_error(str) {
    console.log(str);
    global.log.error(str);
}

function bytesToMegas(num) {
    return num / Math.pow(1024, 2)
}

module.exports = {
    cleanFileTemp,
    validURL,
    genId,
    conlog_info,
    conlog_info_force,
    conlog_error,
    bytesToMegas
};