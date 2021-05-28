const ffmpeg_ = require("fluent-ffmpeg");
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

async function ffprobe(file) {
    ffmpeg_.setFfprobePath(ffprobePath);
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
            .setFfmpegPath(ffmpegPath)
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
            .setFfmpegPath(ffmpegPath)
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
            .setFfmpegPath(ffmpegPath)
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
    ffprobe,
    ffmpeg,
    ffmpeg_complex,
    ffmpeg_options
};