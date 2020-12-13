const start = require("./lib/start");
const whatsapp = require("./lib/whatsapp");
global.config = require('./config.json');
const tools = require("./lib/tools");

(async () => {
    try {
        await start.check();
        await whatsapp.launch();
    } catch (err) {
        tools.conlog_error(err);
    }
})();