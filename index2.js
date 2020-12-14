const start = require("./lib/start");
const { Whatsapp } = require("./lib/whatsapp");
global.config = require('./config.json');
const tools = require("./lib/tools");

(async () => {
    try {
        await start.check();
        const client = await new Whatsapp();
        await client.start();
    } catch (err) {
        tools.conlog_error(err);
    }
})();