const tools = require("./tools");
const config = require("../config.json");
const sharp = require("sharp");

class Image {
    constructor(id, file) {
        this.dir = "./temp/";
        this.id = id;
        this.file = file;
        this.ext = file.split(".")[1];
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
                this.ext = "webp";
            })
            .catch(err => {
                tools.conlog_error(`[${this.id}] ${err}`);
            });
    }
}

module.exports = {
    Image
}