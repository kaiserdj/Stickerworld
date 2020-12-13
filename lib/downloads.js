const Axios = require("axios");
const fs = require("fs");

async function downloadFile(id, fileUrl) {
    const url = fileUrl;

    const response = await Axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    const writer = fs.createWriteStream(`./temp/${id}.${response.headers["content-type"].split("/")[1]}`);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    });
};

module.exports = {
    downloadFile
};