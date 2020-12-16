const config = require("../config.json");
const fs = require('fs');
const util = require('util');
const glob = require('fast-glob');
const crypto = require("crypto");

async function cleanFileTemp(id) {
    const search_dir = await glob(`./temp/*${id}*`, { dot: true, onlyFiles: false, markDirectories: true  });
    search_dir.forEach(async (elem) => {
        if(elem[elem.length -1] === "/"){
            await fs.rmdirSync(elem, {
                recursive: true
        });
        }
    });

    const search_files = await glob(`./temp/*${id}*`, { dot: true, onlyFiles: true, markDirectories: false });

    search_files.forEach((elem) => {
        fs.unlinkSync(elem);
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