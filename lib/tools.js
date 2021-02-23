const config = require("../config.json");
const fs = require('fs');
const util = require('util');
const glob = require('fast-glob');
const crypto = require("crypto");
const Axios = require('axios');
const ProgressBar = require('progress');

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFileSync);
const renameFile = util.promisify(fs.renameSync);

async function cleanFileTemp(id) {
    const search_dir = await glob(`./temp/*${id}*`, { dot: true, onlyFiles: false, markDirectories: true });
    search_dir.forEach(async (elem) => {
        if (elem[elem.length - 1] === "/") {
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

async function download(url, dir, name) {
    const writer = fs.createWriteStream(dir);

    const response = await Axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    const totalLength = response.headers['content-length'];

    const progressBar = new ProgressBar(`-> Downloading ${name} [:bar] :percent :etas`, {
        width: 40,
        complete: '=',
        incomplete: ' ',
        renderThrottle: 16,
        total: parseInt(totalLength)
    });

    response.data.on('data', (chunk) => {
        progressBar.tick(chunk.length);
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', (err) => {
            reject(err);
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
    return num / Math.pow(1024, 2);
}

function getExtensionFile(str) {
    return str.split(".").pop();
}

module.exports = {
    writeFile,
    readFile,
    renameFile,
    cleanFileTemp,
    download,
    validURL,
    genId,
    conlog_info,
    conlog_info_force,
    conlog_error,
    bytesToMegas,
    getExtensionFile
};