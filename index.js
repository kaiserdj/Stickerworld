const venom = require('venom-bot');
const fs = require('fs');
const Axios = require('axios');
const ProgressBar = require('progress');
const mime = require('mime-types');
const crypto = require("crypto");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");

run();

async function run() {
    if (!fs.existsSync("./ffmpeg.exe")) {
        console.log("ffmpeg.exe not detected");
        await downloadFfmpeg();
        console.log("Download completed");
    }

    if (!fs.existsSync("./temp")) {
        fs.mkdirSync("./temp");
    }

    venom
        .create()
        .then((client) => start(client))
        .catch((erro) => {
            console.log(erro);
        });
}

async function downloadFfmpeg() {
    const url = 'https://srv-store1.gofile.io/download/jDbD3g/ffmpeg.exe'
    const writer = fs.createWriteStream('ffmpeg.exe')

    const response = await Axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })
    const totalLength = response.headers['content-length']

    console.log('Starting ffmpeg.exe download')
    const progressBar = new ProgressBar('-> Downloading ffmpeg.exe [:bar] :percent :etas', {
        width: 40,
        complete: '=',
        incomplete: ' ',
        renderThrottle: 1,
        total: parseInt(totalLength)
    })

    response.data.on('data', (chunk) => progressBar.tick(chunk.length))

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    })
}

function start(client) {
    client.onMessage(async (message) => {
        console.log(message);

        if (message.type === "image") {
            const decryptFile = await client.decryptFile(message);
            const id = crypto.randomBytes(16).toString("hex");
            const file = `./temp/${id}.png`;

            await sharp(decryptFile)
                .resize({
                    width: 800,
                    height: 800,
                    fit: 'contain',
                    background: {
                        r: 255,
                        g: 255,
                        b: 255,
                        alpha: 0
                    }
                })
                .toFormat('png')
                .toFile(file)
                .then(info => {
                    console.log(info)
                })
                .catch(err => {
                    console.log(err)
                });

            await client
                .sendImageAsSticker(message.from, file)
                .then((result) => {
                    console.log('Result: ', result);
                })
                .catch((erro) => {
                    console.error('Error when sending: ', erro);
                });

            await fs.unlinkSync(file);
        } else if (message.type === "video" && message.duration < 15) {
            const decryptFile = await client.decryptFile(message);
            const id = crypto.randomBytes(16).toString("hex");
            const file = `${id}.${mime.extension(message.mimetype)}`;
            const fileGif = `${id}.gif`;

            await fs.writeFile(`./temp/${file}`, decryptFile, (err) => {
                if (err) {
                    console.log(err)
                }
            });

            await new Promise((resolve, reject) => {
                ffmpeg(`./temp/${file}`)
                    .setFfmpegPath('./ffmpeg.exe')
                    .outputOption("-vf", "scale=512:512:flags=lanczos,fps=15")
                    //.outputOption("-vf", "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=black@0.0,format=rgba,fps=15")
                    .save(`./temp/${fileGif}`)
                    .on('error', (err) => {
                        console.log(`[ffmpeg] error: ${err.message}`);
                        reject(err);
                    })
                    .on('end', () => {
                        console.log('[ffmpeg] finished');
                        resolve();
                    });
            });

            await client
                .sendImageAsStickerGif(message.from, `./temp/${fileGif}`)
                .then((result) => {
                    console.log('Result: ', result);
                })
                .catch((erro) => {
                    console.error('Error when sending: ', erro);
                });

            // await fs.unlinkSync(`./temp/${file}`);
            // await fs.unlinkSync(`./temp/${fileGif}`); 
        }
    });
}