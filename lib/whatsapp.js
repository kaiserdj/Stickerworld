const venom = require('venom-bot');
const config = require("../config.json");
const tools = require("./tools");
const fs = require('fs');
const Axios = require('axios');

async function launch() {
    await venom
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
        .then((client) => start(client))
        .catch((err) => {
            tools.conlog_error(err);
        });
};

async function start(client) {
    this.client = client;

    tools.conlog_info_force("Session started");

    client.onMessage(async (message) => {
        const id = tools.genId();

        if (config.debug) {
            console.log(message);
        }

        if (message.chatId === "status@broadcast") {
            return;
        }

        let check;

        if (message.isGroupMsg) {
            if (config.workInGroups) {
                tools.conlog_info_force(`[${id}] New group message: ${message.chat.contact.formattedName}, for user: ${await realNumber(message.author)}`);
                check = await checkMessage(id, message);
            } else {
                tools.conlog_info_force(`[${id}] New group message: ${message.chat.contact.formattedName}, for user: ${await realNumber(message.author)} -- rejected by workInGroups: False`);
                
                return;
            }
        } else {
            tools.conlog_info_force(`[${id}] New user message${await realNumber(message.from)}`);
            check = await checkMessage(id, message);
        }
    });

    if (config.onIncomingCall) {
        client.onIncomingCall(async (call) => {
            if (config.debug) {
                console.log(call);
            }
            tools.conlog_info_force(`[${id}] Incoming call: ${await realNumber(call.peerJid)}`);

            client.sendText(call.peerJid, _.t("onIncomingCall"));
        });
    }

    process.on('SIGINT', function () {
        tools.conlog_info_force("Close client");
        client.close();
    });
}

async function checkMessage(id, message) {
    if (message.isMedia) {
        if (message.isGif) {
            tools.conlog_info_force(`[${id}] Gif detected`);

            //
        } else if (message.type === "video" || message.mimetype.split("/")[0] === "video") {
            if (tools.bytesToMegas(message.size) <= config.maxSizeVideo) {
                tools.conlog_info_force(`[${id}] Video detected`);

                //
            } else {
                tools.conlog_info_force(`[${id}] Video detected --- rejected for exceeding maxSizeVideo`);
                //
            }
        } else if (message.type === "image" || message.mimetype.split("/")[0] === "image") {
            //
        }
    } else if (message.type === "chat") {
        let check = tools.validURL(message.content);

        if (check) {
            await Axios.get(message.content)
                .then(async function (response) {
                    let type = response.headers["content-type"].split("/")[0];

                    if (type === "video") {
                        if (tools.bytesToMegas(response.headers["content-length"]) <= config.maxSizeVideo) {
                            //
                        } else {
                            //
                        }
                    } else if (type === "image") {
                        //
                    } else {
                        //
                    }
                })
                .catch(function (err) {
                    tools.conlog_error(err);
                })
        }

        // 
    }
}

async function realNumber(number) {
    let result = await this.client.getNumberProfile(number);
    return result.id.user;
}

module.exports = {
    launch,
    start
}