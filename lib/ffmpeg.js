const tools = require("./tools");
const config = require("../config.json");
const fs = require('fs');
const path = require("path");
const Axios = require('axios');
const ProgressBar = require('progress');
const Zip = require('node-7z');
const ffmpeg_ = require("fluent-ffmpeg");

async function download() {
    let url;
    if (process.arch === "x64") {
        url = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.7z';
    } else {
        url = 'https://github.com/LussacZheng/video-downloader-deploy/releases/download/v1.6.0/ffmpeg-20200831-4a11a6f-win32-static.zip';
    }
    const writer = fs.createWriteStream('./temp/ffmpeg.7z');

    const response = await Axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    const totalLength = response.headers['content-length'];

    tools.conlog_info('Starting ffmpeg.zip download');

    const progressBar = new ProgressBar('-> Downloading ffmpeg.exe [:bar] :percent :etas', {
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
        writer.on('error',(err) => {
            reject(err);
        });
    });
};

async function extract() {
    return await new Promise((resolve, reject) => {
        let files = [];
        const extract = Zip.extractFull('./temp/ffmpeg.7z', './temp/', {
            $progress: true,
            $bin: "./tools/7zip/7za.exe",
            recursive: true,
            $cherryPick: ['ffmpeg.exe', 'ffprobe.exe']
        });
        extract.on('data', data => files.push(data));
        extract.on('end', async () => {
            if (!fs.existsSync("./tools/ffmpeg")) {
                fs.mkdirSync("./tools/ffmpeg");
            }

            files.forEach(async file => {
                if (file.status === "extracted") {
                    if (config.debug) {
                        console.log(file);
                    }

                    let filename = file.file.split("/").slice(-1)[0];

                    await tools.renameFile(`./temp/${file.file}`, `./tools/ffmpeg/${filename}`, async (err) => {
                        if (err) {
                            reject(err);
                        }
                    });
                    tools.conlog_info(`File ${filename} successfully extracted`);
                }
            });
            resolve("Extract completed");
        });
        extract.on('error', (err) => {
            reject(err);
        });
    })
}

async function ffprobe(file) {
    ffmpeg_.setFfprobePath('./tools/ffmpeg/ffprobe.exe');
    return new Promise((resolve, reject) => {
        ffmpeg_.ffprobe(file, (err, metadata) => {
            if (err) {
                return reject(err)
            }
            return resolve(metadata);
        });
    });
}

async function ffmpeg(file, save) {
    return await new Promise((resolve, reject) => {
        ffmpeg_(file)
            .setFfmpegPath('./tools/ffmpeg/ffmpeg.exe')
            .save(save)
            .on('error', (err) => {
                reject(err);
            })
            .on('end', () => {
                resolve();
            });
    });
}

async function ffmpeg_complex(file, inputOptions, complexFilter, outputOptions, save) {
    return await new Promise((resolve, reject) => {
        ffmpeg_(file)
            .setFfmpegPath('./tools/ffmpeg/ffmpeg.exe')
            .inputOptions(inputOptions)
            .complexFilter(complexFilter)
            .outputOptions(outputOptions)
            .save(save)
            .on('error', (err) => {
                reject(err);
            })
            .on('end', () => {
                resolve();
            });
    });
}

async function ffmpeg_options(file, inputOptions, outputOptions, save) {
    return await new Promise((resolve, reject) => {
        ffmpeg_(file)
            .setFfmpegPath('./tools/ffmpeg/ffmpeg.exe')
            .inputOptions(inputOptions)
            .outputOptions(outputOptions)
            .save(save)
            .on('error', (err) => {
                reject(err);
            })
            .on('end', () => {
                resolve();
            });
    });
}

module.exports = {
    download,
    extract,
    ffprobe,
    ffmpeg,
    ffmpeg_complex,
    ffmpeg_options
};