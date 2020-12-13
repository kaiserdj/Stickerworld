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
    const regex = /(?:(?:https?|ftp):\/\/|\b(?:[a-z\d]+\.))(?:(?:[^\s()<>]+|\((?:[^\s()<>]+|(?:\([^\s()<>]+\)))?\))+(?:\((?:[^\s()<>]+|(?:\(?:[^\s()<>]+\)))?\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))?/gm;

    return !!regex.test(str);
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