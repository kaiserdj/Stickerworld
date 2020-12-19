const venom = require('venom-bot');
const fs = require('fs');
const glob = require("glob");
const Axios = require('axios');
const ProgressBar = require('progress');
const Zip = require('node-7z');
const mime = require('mime-types');
const crypto = require("crypto");
const Jimp = require("jimp");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const { compress } = require("compress-images/promise");

run();

async function run() {
    if (!fs.existsSync("./temp")) {
        fs.mkdirSync("./temp");
    }

    if (!fs.existsSync("./tools/ffmpeg/ffmpeg.exe")) {
        console.log("ffmpeg.exe not detected");
        await downloadFfmpeg();
        console.log("Download completed");
        console.log("Starting ffmpeg.exe extract");
        const extract = await new Promise((resolve, reject) => {
            let file;
            const extract = Zip.extractFull('./temp/ffmpeg.7z', './temp/', {
                $progress: true,
                $bin: "./tools/7zip/7za.exe",
                recursive: true,
                $cherryPick: 'ffmpeg.exe'
            })
            extract.on('data', data => file = data)
            extract.on('end', () => {
                if (!fs.existsSync("./tools/ffmpeg")) {
                    fs.mkdirSync("./tools/ffmpeg");
                }
                fs.rename(`temp/${file.file}`, "tools/ffmpeg/ffmpeg.exe", async (err) => {
                    if (err) {
                        reject(err)
                    }
                    resolve("Extract completed")
                })
            })
            extract.on('error', reject)
        })
        console.log(extract);
        await fs.rmdirSync("./temp/", {
            recursive: true
        });
        await fs.mkdirSync("./temp");
    }

    venom
        .create()
        .then((client) => start(client))
        .catch((erro) => {
            console.log(erro);
        });
}

async function downloadFfmpeg() {
    const url = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.7z'
    const writer = fs.createWriteStream('./temp/ffmpeg.7z')

    const response = await Axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })
    const totalLength = response.headers['content-length']

    console.log('Starting ffmpeg.zip download')
    const progressBar = new ProgressBar('-> Downloading ffmpeg.exe [:bar] :percent :etas', {
        width: 40,
        complete: '=',
        incomplete: ' ',
        renderThrottle: 16,
        total: parseInt(totalLength)
    })

    response.data.on('data', (chunk) => {
        progressBar.tick(chunk.length)
    })

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    })
}

async function start(client) {
    client.onMessage(async (message) => {
        console.log(message);
        await genSticker(client, message);
    });
}

async function genSticker(client, message) {
    const id = crypto.randomBytes(16).toString("hex");
    if (message.type === "image") {
        const decryptFile = await client.decryptFile(message);
        const file = `./temp/${id}.png`;

        await sharp(decryptFile)
            .resize({
                width: 512,
                height: 512,
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
        const file = `${id}.${mime.extension(message.mimetype)}`;

        await fs.writeFile(`./temp/${file}`, decryptFile, (err) => {
            if (err) {
                console.log(err)
            }
        });

        await new Promise((resolve, reject) => {
            ffmpeg(`./temp/${file}`)
                .setFfmpegPath('./tools/ffmpeg/ffmpeg.exe')
                .complexFilter(`scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease,fps=15, pad=512:512:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`)
                .save(`./temp/${id}.webp`)
                .on('error', (err) => {
                    console.log(`[ffmpeg] error: ${err.message}`);
                    reject(err);
                })
                .on('end', () => {
                    console.log('[ffmpeg] finished');
                    resolve();
                });
        });

        await new Promise((resolve, reject) => {
            ffmpeg(`./temp/${id}.webp`)
                .save(`./temp/ext${id}%d.png`)
                .on('error', (err) => {
                    console.log(`[ffmpeg] error: ${err.message}`);
                    reject(err);
                })
                .on('end', () => {
                    console.log('[ffmpeg] finished');
                    resolve();
                });
        });

        console.log("Color treated");
        const frame1 = await Jimp.read(`./temp/ext${id}1.png`);
        for (let i = 1; i < 320; i++) {
            for (let j = 1; j < 320; j++) {
                let colors = await Jimp.intToRGBA(frame1.getPixelColor(i, j))
                if (colors.r > 155) {
                    colors.r = colors.r - 5
                } else {
                    colors.r = colors.r + 5
                }
                if (colors.g > 155) {
                    colors.g = colors.g - 5
                } else {
                    colors.g = colors.g + 5
                }
                if (colors.b > 155) {
                    colors.b = colors.b - 5
                } else {
                    colors.b = colors.b + 5
                }
                if (colors.a > 155) {
                    colors.a = colors.a - 5
                } else {
                    colors.a = colors.a + 5
                }

                let hex = await Jimp.rgbaToInt(colors.r, colors.g, colors.b, colors.a)

                await frame1.setPixelColor(hex, i, j)
            }
        }
        await frame1.write(`./temp/ext${id}1.png`);

        await new Promise((resolve, reject) => {
            ffmpeg(`./temp/ext${id}%d.png`)
                .complexFilter(`scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease,fps=15, pad=512:512:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`)
                .fpsOutput(15)
                .save(`./temp/${id}mod.webp`)
                .on('error', (err) => {
                    console.log(`[ffmpeg] error: ${err.message}`);
                    reject(err);
                })
                .on('end', () => {
                    console.log('[ffmpeg] finished');
                    resolve();
                });
        });

        await tryGif(async () => {
            await new Promise((resolve, reject) => {
                ffmpeg(`./temp/ext${id}%d.png`)
                    .complexFilter(`scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`)
                    .fpsOutput(15)
                    .save(`./temp/${id}mod.gif`)
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
                    source: `./temp/${id}mod.gif`,
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

            });
        });

        await client
            .sendImageAsStickerGif(message.from, `./temp/${id}mod.webp`)
            .then((result) => {
                console.log('Result: ', result);
            })
            .catch(async (erro) => {
                console.error('Error when sending: ', erro);
                await tryGif();
            });

        await glob.Glob(`./temp/*${id}*`, async function(er, files) {
            files.forEach(file => {
                fs.unlinkSync(file);
            });
        });
    }
}