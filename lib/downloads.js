const axios = require("axios");
const fs = require("fs");

async function downloadFile(id, fileUrl) {
    const url = fileUrl;

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    const dir = `./temp/`
    const filename = `${id}.${response.headers["content-type"].split("/")[1]}`;

    const writer = fs.createWriteStream(`${dir}${filename}`);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve(filename))
        writer.on('error', (err) => reject(err))
    });
};

module.exports = {
    downloadFile
};