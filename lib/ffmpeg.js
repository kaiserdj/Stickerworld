const tools = require("./tools");
const config = require("../config.json");
const fs = require('fs');
const Zip = require('node-7z');
const Zipath = require("7zip-bin");
const ffmpeg_ = require("fluent-ffmpeg");

async function download() {
    let url;
    switch (process.platform) {
        case "win32":
            tools.conlog_info('The windows version of ffmpeg will be downloaded');

            url = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.7z';

            tools.conlog_info('Starting ffmpeg.zip download');

            await tools.download(url, './temp/ffmpeg.7z', "ffmpeg.exe");

            tools.conlog_info("Download completed");
            tools.conlog_info("Starting ffmpeg.exe extract");

            return await new Promise((resolve, reject) => {
                let files = [];
                const extract = Zip.extractFull('./temp/ffmpeg.7z', './temp/', {
                    $progress: true,
                    $bin: Zipath.path7za,
                    recursive: true,
                    $cherryPick: ['ffmpeg.exe', 'ffprobe.exe']
                });
                extract.on('data', data => files.push(data));
                extract.on('end', async () => {
                    if (!fs.existsSync("./ffmpeg")) {
                        fs.mkdirSync("./ffmpeg");
                    }
        
                    files.forEach(async file => {
                        if (file.status === "extracted") {
                            if (config.debug) {
                                console.log(file);
                            }
        
                            let filename = file.file.split("/").slice(-1)[0];
        
                            await tools.renameFile(`./temp/${file.file}`, `./ffmpeg/${filename}`, async (err) => {
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
            break;
        case "linux":
            url = "";
            break;
        case "darwin":
            // https://evermeet.cx/ffmpeg/#api-download
            url = "";
            break;
    }
};

async function ffprobe(file) {
    ffmpeg_.setFfprobePath('./ffmpeg/ffprobe.exe');
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
            .setFfmpegPath('./ffmpeg/ffmpeg.exe')
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
            .setFfmpegPath('./ffmpeg/ffmpeg.exe')
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
            .setFfmpegPath('./ffmpeg/ffmpeg.exe')
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
    ffprobe,
    ffmpeg,
    ffmpeg_complex,
    ffmpeg_options
};