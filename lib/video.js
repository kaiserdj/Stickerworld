const { AsyncConstructor } = require("async-constructor");
const { Image } = require("./image");
const ffmpeg = require("./ffmpeg");
const tools = require("./tools");
const { threshold } = require("jimp");

class Video extends AsyncConstructor {
    constructor(id, file) {
        super(async () => {
            this.dir = "./temp/";
            this.id = id;
            this.file = file;
            this.ext = file.split(".")[1];
            this.metadata = await ffmpeg.ffprobe(`${this.dir}${this.file}`);
            this.fps = Math.trunc(eval(this.metadata.streams[0].r_frame_rate));
            this.firstFrame;
        });
    }

    async resize() {
        try {
            let complexFilter = `scale=512:512:force_original_aspect_ratio=decrease,fps=${this.fps} , pad=512:512:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`;

            await ffmpeg.ffmpeg_complex(`${this.dir}${this.file}`, complexFilter, `${this.dir}${this.id}_resize.webp`);

            this.file = `${this.id}_resize.webp`;
            this.ext = "webp";
        } catch (err) {

        }
    }

    async colorTreated() {
        await this.extractFirstFrame();

        await this.firstFrame.colorTreatment();

        await this.removeFirstFrame();

        await this.imageToVideo();

        await this.concatVideos([`../temp/${this.firstFrameVideo}`, `../temp/${this.file}`]);
    }

    async extractFirstFrame() {
        try {
            let outputOptions = ["-frames:v 1"];

            await ffmpeg.ffmpeg_options(`${this.dir}${this.file}`, [], outputOptions, `${this.dir}${this.id}_001.png`);

            this.firstFrame = new Image(this.id, `${this.id}_001.png`);
        } catch (err) {

        }
    }

    async removeFirstFrame() {
        try {
            let inputOptions = ["-ss 0.01"];

            await ffmpeg.ffmpeg_options(`${this.dir}${this.file}`, inputOptions, [], `${this.dir}${this.id}_cut.mp4`);

            this.file = `${this.id}_cut.mp4`;
            this.ext = "mp4";
        } catch (err) {

        }
    }

    async imageToVideo() {
        try {
            let inputOptions = ["-r 20"];
            let outputOptions = ["-pix_fmt yuv420p"];

            await ffmpeg.ffmpeg_options(`${this.firstFrame.dir}${this.firstFrame.file}`, inputOptions, outputOptions, `${this.dir}${this.id}_001.mp4`);

            this.firstFrameVideo = `${this.id}_001.mp4`;
        } catch (err) {

        }
    }

    async concatVideos(files) {
        try {
            let list = "";
            files.forEach((file) => {
                list += `file '${file}'\n`;
            })

            await tools.writeFile(`${this.dir}${this.id}.txt`, list, function(err) {
                if (err) {
                    throw err;
                }
                console.log("The file was saved!");
            });

            let inputOptions = ["-f concat", "-safe 0"];
            let outputOptions = ["-c copy"];

            await ffmpeg.ffmpeg_options(`${this.dir}${this.id}.txt`, inputOptions, outputOptions, `${this.dir}${this.id}_final.mp4`);

            this.file = `${this.id}_final.mp4`;
            this.ext = "mp4";
        } catch (err) {

        }
    }
}

module.exports = {
    Video
}