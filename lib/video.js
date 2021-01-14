const { AsyncConstructor } = require("async-constructor");
const { Image } = require("./image");
const ffmpeg = require("./ffmpeg");
const tools = require("./tools");
const { compress } = require("compress-images/promise");

class Video extends AsyncConstructor {
    constructor(id, file) {
        super(async () => {
            this.dir = "./temp/";
            this.id = id;
            this.file = file;
            this.metadata = await ffmpeg.ffprobe(`${this.dir}${this.file}`);
            this.fps = Math.trunc(eval(this.metadata.streams[0].r_frame_rate));
            this.firstFrameImage;
            this.firstFrameVideo;
            this.cutVideo;
            this.finalVideo;
            this.Webp;
            this.Gif;
            this.Gifcom;

            tools.conlog_info_force(`[${this.id}] Generating animated sticker file`);
        });
    }

    async resize(type) {
        try {
            let complexFilter = `scale=512:512:force_original_aspect_ratio=decrease,fps=${this.fps} , pad=512:512:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`;

            await ffmpeg.ffmpeg_complex(`${this.dir}${this.file}`, [], complexFilter, [], `${this.dir}${this.id}_resize.${type}`);

            if(type === "webp") {
                this.Webm = `${this.id}_resize.${type}`;
            } else {
                this.Gif = `${this.id}_resize.${type}`;
            }

            tools.conlog_info(`[${this.id}] Video rescale to ${type}`);
        } catch (err) {
            tools.conlog_error(`[${this.id}] ${err}`);
        }
    }

    async colorTreated() {
        await this.extractFirstFrame();

        await this.firstFrameImage.colorTreatment();

        await this.removeFirstFrame();

        await this.imageToVideo();

        await this.concatVideos([`../temp/${this.firstFrameVideo}`, `../temp/${this.cutVideo}`]);
    }

    async extractFirstFrame() {
        try {
            let outputOptions = ["-frames:v 1"];

            await ffmpeg.ffmpeg_options(`${this.dir}${this.file}`, [], outputOptions, `${this.dir}${this.id}_001.png`);

            this.firstFrameImage = new Image(this.id, `${this.id}_001.png`);

            tools.conlog_info(`[${this.id}] Extracting first frame`);
        } catch (err) {
            tools.conlog_error(`[${this.id}] ${err}`);
        }
    }

    async removeFirstFrame() {
        try {
            let inputOptions = ["-ss 0.01"];

            await ffmpeg.ffmpeg_options(`${this.dir}${this.file}`, inputOptions, [], `${this.dir}${this.id}_cut.mp4`);

            this.cutVideo = `${this.id}_cut.mp4`;

            tools.conlog_info(`[${this.id}] Generating video without first frame`);
        } catch (err) {
            tools.conlog_error(`[${this.id}] ${err}`);
        }
    }

    async imageToVideo() {
        try {
            let inputOptions = ["-r 20"];
            let outputOptions = ["-pix_fmt yuv420p"];

            await ffmpeg.ffmpeg_options(`${this.firstFrameImage.dir}${this.firstFrameImage.file}`, inputOptions, outputOptions, `${this.dir}${this.id}_001.mp4`);

            this.firstFrameVideo = `${this.id}_001.mp4`;

            tools.conlog_info(`[${this.id}] First frame converted to video`);
        } catch (err) {
            tools.conlog_error(`[${this.id}] ${err}`);
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
            });
            tools.conlog_info(`[${this.id}] Map file created`);

            let inputOptions = ["-f concat", "-safe 0"];
            let outputOptions = ["-c copy"];

            await ffmpeg.ffmpeg_options(`${this.dir}${this.id}.txt`, inputOptions, outputOptions, `${this.dir}${this.id}_final.mp4`);

            this.finalVideo = `${this.id}_final.mp4`;

            tools.conlog_info(`[${this.id}] Final file created`);
        } catch (err) {
            tools.conlog_error(`[${this.id}] ${err}`);
        }
    }

    async compressGif() {

    }
}

module.exports = {
    Video
}