const { AsyncConstructor } = require("async-constructor");
const venom = require('venom-bot');
const config = require("../config.json");
const tools = require("./tools");
const fs = require('fs');
const Axios = require('axios');
const mime = require('mime-types');
const { downloadFile } = require('./downloads');

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
            const id = tools.genId();
    
            if (config.debug) {
                console.log(message);
            }
    
            if (message.chatId === "status@broadcast") {
                tools.conlog_info(`[${id}] New status detected, for user: ${await this.realNumber(message.author)}`);
                return;
            }
    
            let check;
    
            if (message.isGroupMsg) {
                if (config.workInGroups) {
                    tools.conlog_info_force(`[${id}] New group message: ${message.chat.contact.formattedName}, for user: ${await this.realNumber(message.author)}`);
                    check = await this.checkMessage(id, message);
                } else {
                    tools.conlog_info_force(`[${id}] New group message: ${message.chat.contact.formattedName}, for user: ${await this.realNumber(message.author)} -- rejected by workInGroups: False`);
    
                    return;
                }
            } else {
                tools.conlog_info_force(`[${id}] New user message${await this.realNumber(message.from)}`);
                check = await this.checkMessage(id, message);
            }
    
            switch (check) {
                case "Image":
                    await this.downloadFileMessage(id, message, true);
    
                    break;
                case "Gif":
    
                    break;
                case "Video":
    
                    break;
                case "Image-Url":
                    await downloadFile(id, message.content);
    
                    break;
                case "Video-Url":
                    await downloadFile(id, message.content);
    
                    break;
                case "Image-Reject":
    
                    break;
                case "Video-reject":
    
                    break;
                case "Image-Url-Reject":
    
                    break;
                case "Video-Url-Reject":
    
                    break;
                case "Url-No-Detected":
    
                    break;
            }
        });
    
        if (config.onIncomingCall) {
            this.client.onIncomingCall(async (call) => {
                if (config.debug) {
                    console.log(call);
                }
                tools.conlog_info_force(`[${id}] Incoming call: ${await this.realNumber(call.peerJid)}`);
    
                this.client.sendText(call.peerJid, _.t("onIncomingCall"));
            });
        }
    
        process.on('SIGINT', function () {
            tools.conlog_info_force("Close this.client");
            this.client.close();
        });
    }
    
    async checkMessage(id, message) {
        if (message.isMedia) {
            if (message.isGif) {
                tools.conlog_info_force(`[${id}] Gif detected`);
    
                return "Gif";
            } else if (message.type === "video" || message.mimetype.split("/")[0] === "video") {
                if (tools.bytesToMegas(message.size) <= config.maxSizeVideo) {
                    tools.conlog_info_force(`[${id}] Video detected`);
    
                    return "Video";
                } else {
                    tools.conlog_info_force(`[${id}] Video detected --- rejected for exceeding maxSizeVideo`);
    
                    return "Video-reject";
                }
            } else if (message.type === "image" || message.mimetype.split("/")[0] === "image") {
                tools.conlog_info_force(`[${id}] Image detected`);
    
                return "Image";
            }
        } else if (message.type === "chat") {
            let check = tools.validURL(message.content);
    
            if (check) {
                tools.conlog_info(`[${id}] Url detected`);
    
                return await Axios.get(message.content)
                    .then(async function (response) {
                        if (config.debug) {
                            console.log(response);
                        }
    
                        let type = response.headers["content-type"].split("/")[0];
    
                        if (type === "video") {
                            if (tools.bytesToMegas(response.headers["content-length"]) <= config.maxSizeVideo) {
                                tools.conlog_info_force(`[${id}] Video Url detected`);
    
                                return "Video-Url";
                            } else {
                                tools.conlog_info_force(`[${id}] Video Url detected --- rejected for exceeding maxSizeVideo`);
    
                                return "Video-Url-Reject";
                            }
                        } else if (type === "image") {
    
                            return "Image-Url";
                        } else {
                            tools.conlog_info_force(`[${id}] Image Url detected`);
    
                            return "Image-Url-Reject";
                        }
                    })
                    .catch(function (err) {
                        tools.conlog_error(`[${id}] ${err}`);
                    })
            }
            tools.conlog_info_force(`[${id}] Url no detected`);
    
            return "Url-No-Detected";
        }
    }
    
    async downloadFileMessage(id, message, file) {
        const decryptFile = await this.client.decryptFile(message);
    
        if (file) {
            const file = `${id}.${mime.extension(message.mimetype)}`;
    
            await fs.writeFile(`./temp/${file}`, decryptFile, (err) => {
                if (err) {
                    tools.conlog_error(`[${id}] ${err}`);
    
                    throw (err);
                }
                tools.conlog_info(`[${id}] File downloaded and saved`);
    
                return;
            });
        } else {
            tools.conlog_info(`[${id}] File downloaded`);
    
            return decryptFile;
        }
    }
    
    async realNumber(number) {
        let result = await this.client.getNumberProfile(number);
        return result.id.user;
    }
}

module.exports = {
    Whatsapp
}