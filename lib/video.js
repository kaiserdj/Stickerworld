const {
    AsyncConstructor
} = require("async-constructor");
const fluent_ffmpeg = require("fluent-ffmpeg");
const ffmpeg = require("./ffmpeg");

class Video extends AsyncConstructor {
    constructor(id, file) {
        super(async () => {
            this.dir = "./temp/";
            this.id = id;
            this.file = file;
            this.ext = file.split(".")[1];
            this.metadata = await ffmpeg.ffprobe(`${this.dir}${this.file}`);
            this.fps = Math.trunc(eval(this.metadata.streams[0].r_frame_rate));
        });
    }

    async edit() {
        let complexFilter = `scale=512:512:force_original_aspect_ratio=decrease,fps=${this.fps} , pad=512:512:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`;
       
        await ffmpeg.ffmpeg_complex(`${this.dir}${this.file}`, complexFilter, `${this.dir}${this.id}_edit.webp`);
        
        this.file = `${this.id}_edit.webp`;
        this.ext = "webp";
    }
}

module.exports = {
    Video
}