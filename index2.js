const start = require("./lib/start");
const whatsapp = require("./lib/whatsapp");
global.config = require('./config.json');
const tools = require("./lib/tools");

(async () => {
    try {
        await start.check();
        const client = await whatsapp.launch();
        await whatsapp.start(client);
    } catch (err) {
        tools.conlog_error(err);
    }
})();