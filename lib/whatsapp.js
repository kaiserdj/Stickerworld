const { AsyncConstructor } = require("async-constructor");
const venom = require('venom-bot');
const config = require("../config.json");
const tools = require("./tools");
const Axios = require('axios');
const mime = require('mime-types');
const { downloadFile } = require('./downloads');
const { Image } = require("./image");
const { Video } = require("./video");

class Whatsapp extends AsyncConstructor {

    constructor() {
        super(async () => {
            this.client = await venom
                .create(
                    'session',
                    (base64Qrimg, asciiQR, attempts, urlCode) => {
                        tools.conlog_info('Number of attempts to read the qrcode: ', attempts);
                        console.log(`Whatsapp Web QRcode:\n${asciiQR}`);
                    },
                    (statusSession, session) => {
                        tools.conlog_info(`Status Session: ${statusSession}`);
                        tools.conlog_info(`Session name: ${session}`);
                    }, {
                        folderNameToken: 'tokens',
                        headless: config.headless,
                        debug: false,
                        devtools: config.debug,
                        disableSpins: config.consoleAnimations,
                        disableWelcome: true,
                        updatesLog: config.debug,
                        autoClose: 60000,
                    }
                )
                .then((client) => client)
                .catch((err) => {
                    tools.conlog_error(err);
                });
        });
    }

    async start() {
        tools.conlog_info_force("Session started");

        this.client.onMessage(async (message) => {
            await new Message_was(this.client, message);
        });

        if (config.onIncomingCall) {
            this.client.onIncomingCall(async (call) => {
                let id = tools.genId();

                if (config.debug) {
                    console.log(call);
                }

                tools.conlog_info_force(`[${id}] Incoming call: ${await this.realNumber(call.peerJid)}`);

                this.client.sendText(call.peerJid, _.t("onIncomingCall"));
            });
        }

        process.on('SIGINT', function() {
            tools.conlog_info_force("Close this.client");
            this.client.close();
        });
    }


}

class Message_was extends AsyncConstructor {
    constructor(client, message) {
        super(async () => {
            this.client = client;
            this.id = tools.genId();
            this.message = message;
            this.file;
            this.image;
            this.video;

            if (config.debug) {
                console.log(this.message);
            }

            if (this.message.chatId === "status@broadcast") {
                tools.conlog_info(`[${this.id}] New status detected, for user: ${await this.realNumber(this.message.author)}`);
                return;
            }

            let check;

            if (this.message.isGroupMsg) {
                if (config.workInGroups) {
                    tools.conlog_info_force(`[${this.id}] New group message: ${this.message.chat.contact.formattedName}, for user: ${await this.realNumber(this.message.author)}`);
                    check = await this.checkMessage();
                } else {
                    tools.conlog_info_force(`[${this.id}] New group message: ${this.message.chat.contact.formattedName}, for user: ${await this.realNumber(this.message.author)} -- rejected by workInGroups: False`);

                    return;
                }
            } else {
                tools.conlog_info_force(`[${this.id}] New user message for: ${await this.realNumber(this.message.from)}`);
                check = await this.checkMessage();
            }

            switch (check) {
                case "Image":
                    this.file = await this.downloadFileMessage(true);
                    this.image = new Image(this.id, this.file);
                    await this.image.resize();

                    await this.sendImage();

                    break;
                case "Gif":
                    this.file = await this.downloadFileMessage(true);
                    this.video = await new Video(this.id, this.file);
                    await this.video.resize();

                    await this.sendVideo();

                    break;
                case "Video":
                    this.file = await this.downloadFileMessage(true);
                    this.video = await new Video(this.id, this.file);
                    await this.video.resize();

                    await this.sendVideo();

                    break;
                case "Image-Url":
                    this.file = await downloadFile(this.id, this.message.content);
                    this.image = new Image(this.id, this.file);
                    await this.image.resize();

                    await this.sendImage();

                    break;
                case "Video-Url":
                    this.file = await downloadFile(this.id, this.message.content);
                    this.video = await new Video(this.id, this.file);
                    await this.video.edit();

                    await this.sendVideo();

                    break;
                case "Image-Reject":

                    break;
                case "Video-reject":

                    break;
                case "Url-Reject":

                    break;
                case "Video-Url-Reject":

                    break;
                case "Url-No-Detected":

                    break;
            }

            if (config.cleanTemp) {
                await tools.cleanFileTemp(this.id);
            }
        });
    }

    async checkMessage() {
        if (this.message.isMedia || this.message.type === "document") {
            if (this.message.isGif) {
                tools.conlog_info_force(`[${this.id}] Gif detected`);

                return "Gif";
            } else if (this.message.type === "video" || this.message.mimetype.split("/")[0] === "video") {
                if (tools.bytesToMegas(this.message.size) <= config.maxSizeVideo) {
                    tools.conlog_info_force(`[${this.id}] Video detected`);

                    return "Video";
                } else {
                    tools.conlog_info_force(`[${this.id}] Video detected --- rejected for exceeding maxSizeVideo`);

                    return "Video-reject";
                }
            } else if (this.message.type === "image" || this.message.mimetype.split("/")[0] === "image") {
                tools.conlog_info_force(`[${this.id}] Image detected`);

                return "Image";
            }
        } else if (this.message.type === "chat") {
            let check = tools.validURL(this.message.content);

            if (check) {
                tools.conlog_info(`[${this.id}] Url detected`);

                const response = await Axios.get(this.message.content)
                    .then(async function(response) {
                        if (config.debug) {
                            console.log(response);
                        }

                        return response;
                    })
                    .catch((err) => {
                        tools.conlog_error(`[${this.id}] ${err.toString()}`);
                    });

                let type = response.headers["content-type"].split("/")[0];

                if (type === "video") {
                    if (tools.bytesToMegas(response.headers["content-length"]) <= config.maxSizeVideo) {
                        tools.conlog_info_force(`[${this.id}] Video Url detected`);

                        return "Video-Url";
                    } else {
                        tools.conlog_info_force(`[${this.id}] Video Url detected --- rejected for exceeding maxSizeVideo`);

                        return "Video-Url-Reject";
                    }
                } else if (type === "image") {
                    tools.conlog_info_force(`[${this.id}] Image Url detected`);

                    return "Image-Url";
                } else {
                    tools.conlog_info_force(`[${this.id}] Url detected but no multimedia content has been detected`);

                    return "Url-Reject";
                }
            }
            tools.conlog_info_force(`[${this.id}] Url no detected`);

            return "Url-No-Detected";
        }
    }

    async realNumber(number) {
        let result = await this.client.getNumberProfile(number);
        return result.id.user;
    }

    async downloadFileMessage(file) {
        const decryptFile = await this.client.decryptFile(this.message);

        if (file) {
            const file = `${this.id}.${mime.extension(this.message.mimetype)}`;

            try {
                await tools.writeFile(`./temp/${file}`, decryptFile, async (err) => {
                    if (err) {
                        throw (err);
                    }
                });
                tools.conlog_info(`[${this.id}] File downloaded and saved`);
            } catch (err) {
                tools.conlog_error(`[${this.id}] ${err}`);
            }

            return file;
        } else {
            tools.conlog_info(`[${this.id}] File downloaded`);

            return decryptFile;
        }
    }

    async sendImage() {
        await this.client
            .sendImageAsSticker(this.message.chatId, `${this.image.dir}${this.image.file}`)
            .then((result) => {
                if (config.debug) {
                    console.log(result);
                }
                tools.conlog_info_force(`[${this.id}] Sticker sent`);
            })
            .catch((err) => {
                tools.conlog_error(`[${this.id}] Error when sending: ${err.toString()}`);
            });
    }

    async sendVideo() {
        await this.client
            .sendImageAsStickerGif(this.message.chatId, `${this.video.dir}${this.video.file}`)
            .then((result) => {
                if (config.debug) {
                    console.log(result);
                }
                tools.conlog_info_force(`[${this.id}] Sticker sent`);
            })
            .catch((err) => {
                tools.conlog_error(`[${this.id}] Error when sending: ${err.toString()}`);
            });
    }
}

module.exports = {
    Whatsapp,
    Message_was
}