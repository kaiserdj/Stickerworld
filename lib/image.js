const tools = require("./tools");
const config = require("../config.json");
const sharp = require("sharp");
const jimp = require("jimp");

class Image {
    constructor(id, file) {
        this.dir = "./temp/";
        this.id = id;
        this.file = file;
    }

    async resize() {
        await sharp(`${this.dir}${this.file}`)
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
            .webp({
                alphaQuality: 0
            })
            .toFormat('webp')
            .toFile(`${this.dir}${this.id}_rez.webp`)
            .then(info => {
                if (config.debug) {
                    console.log(info)
                }
                tools.conlog_info(`[${this.id}] Image resized`);
                this.file = `${this.id}_rez.webp`;
            })
            .catch(err => {
                tools.conlog_error(`[${this.id}] ${err}`);
            });
    }

    async colorTreatment() {
        try {
            const image = await jimp.read(`${this.dir}${this.file}`);
            for (let i = 1; i < 320; i++) {
                for (let j = 1; j < 320; j++) {
                    let colors = await jimp.intToRGBA(image.getPixelColor(i, j))
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

                    let hex = await jimp.rgbaToInt(colors.r, colors.g, colors.b, colors.a)

                    await image.setPixelColor(hex, i, j)
                }
            }
            await image.write(`${this.dir}${this.file}`);

            tools.conlog_info(`[${this.id}] Color treatment performed`);
        } catch (err) {
            tools.conlog_error(`[${this.id}] ${err}`);
        }
    }
}

module.exports = {
    Image
}