const venom = require('venom-bot');
const fs = require('fs');
const Axios = require('axios');
const ProgressBar = require('progress');
const mime = require('mime-types');
const crypto = require("crypto");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const {
    compress
} = require("compress-images/promise");

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

            await fs.writeFile(`./temp/${file}`, decryptFile, (err) => {
                if (err) {
                    console.log(err)
                }
            });

            await new Promise((resolve, reject) => {
                ffmpeg(`./temp/${file}`)
                    .setFfmpegPath('./ffmpeg.exe')
                    .complexFilter(`scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`)
                    .save(`./temp/${id}.gif`)
                    .on('error', (err) => {
                        console.log(`[ffmpeg] error: ${err.message}`);
                        reject(err);
                    })
                    .on('end', () => {
                        console.log('[ffmpeg] finished');
                        resolve();
                    });
            });

            const compressGif = async (onProgress) => {
                const result = await compress({
                    source: `./temp/${id}.gif`,
                    destination: `./temp/opt`,
                    onProgress,
                    enginesSetup: {
                        jpg: {
                            engine: "mozjpeg",
                            command: ["-quality", "60"]
                        },
                        png: {
                            engine: "pngquant",
                            command: ["--quality=20-50", "-o"]
                        },
                        svg: {
                            engine: "svgo",
                            command: "--multipass"
                        },
                        gif: {
                            engine: "gifsicle",
                            command: ['--optimize', '--lossy=80']
                        }

                    }
                });

                const {
                    statistics,
                    errors
                } = result;
            };

            await compressGif(async (error, statistic, completed) => {
                if (error) {
                    console.log('Error happen while processing file');
                    console.log(error);
                    return;
                }

                console.log('Sucefully processed file');

                console.log(statistic)

                await client
                    .sendImageAsStickerGif(message.from, statistic.path_out_new)
                    .then((result) => {
                        console.log('Result: ', result);
                    })
                    .catch((erro) => {
                        console.error('Error when sending: ', erro);
                    });
                await fs.unlinkSync(statistic.path_out_new); 
            });
            await fs.unlinkSync(`./temp/${file}`);
            await fs.unlinkSync(`./temp/${id}.gif`); 
        }
    });
}