const version = require("../package.json").version;
const config = require("../config.json");
const tools = require("./tools");
const winston = require("winston");
const Axios = require('axios');
const semver = require('semver');
const ffmpeg = require("./ffmpeg");
const fs = require('fs');
const i18next = require("i18next");

async function check() {
    logger();

    Axios({
        url: "https://raw.githubusercontent.com/kaiserdj/Stickerworld/master/package.json",
        method: 'GET',
        response: 'blob'
    }).then((res) => {
        if (semver.gte(version, res.data.version)) {
            tools.conlog_info("Version check completed")
        } else {
            tools.conlog_info_force("Newer version detected, please update Stickerworld");
            tools.conlog_info_force(`Local version of Stickerworld: ${version}`);
            tools.conlog_info_force(`Current version of Stickerworld: ${res.data.version}`);
        }
    });

    if (!fs.existsSync("./temp")) {
        tools.conlog_info("Temp folder not detected");

        fs.mkdirSync("./temp");

        tools.conlog_info("Temp folder created");
    }

    if (!fs.existsSync("./tools/ffmpeg/ffmpeg.exe")) {
        tools.conlog_info_force("ffmpeg.exe not detected");

        await ffmpeg.download();

        tools.conlog_info("Download completed");
        tools.conlog_info("Starting ffmpeg.exe extract");

        let extract = await ffmpeg.extract();

        tools.conlog_info(extract);

        tools.conlog_info("Deleting temporary files from the download");
        await tools.cleanFileTemp("ffmpeg");
    }

    if (config.cleanTemp) {
        tools.conlog_info("Cleaning Temp folder");

        await fs.rmdirSync("./temp", {
            recursive: true
        });

        await fs.mkdirSync("./temp");

        tools.conlog_info("Temp folder cleaned");
    }

    global._ = language();
}

function logger() {
    const date = new Date();

    global.log = winston.createLogger({
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'DD/MM/YYYY HH:mm:ss'
            }),
            winston.format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
        ),
        transports: [
            new winston.transports.File({
                filename: `./logs/${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}--${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}-${date.getMilliseconds()}.log`,
                level: 'info',
                timestamp: true
            })
        ]
    });

    tools.conlog_info(`Config Stickerworld: ${JSON.stringify(config)}`);
}

function language() {
    let resources = {};
    let langs = fs.readdirSync("./lib/lang");

    langs.forEach((lang) => {
        let name = lang.split(".")[0];

        resources[name] = {
            translation: require(`./lang/${lang}`)
        }
    });

    i18next.init({
        lng: config.lang,
        debug: config.debug,
        resources
    });

    return i18next;
}

module.exports = {
    check
}