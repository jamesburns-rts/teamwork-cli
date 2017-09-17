const dateFormat = require('dateformat');
const yaml = require('js-yaml');
const fs = require('fs');

/************************************************************************************
 * Persist and read user data
 ************************************************************************************/


const USER_DATA_FILE = __dirname + '/data.yml';
let data;

const getFileName = () => {
    return USER_DATA_FILE;
}

const get = () => {

    if (data) {
        return data;
    }

    try {
        if (fs.existsSync(USER_DATA_FILE)) {
            data = yaml.safeLoad(fs.readFileSync(USER_DATA_FILE, 'utf8'));
            if (!data.teamwork) {
                data.teamwork = {};
            }
            return data;
        }
    } catch (e) {
        console.log(e);
    }
    return { teamwork: {}};
}

const save = () => {
    try {
        const yml = yaml.safeDump(data);
        fs.writeFileSync(USER_DATA_FILE, yml);
    } catch (e) {
        console.log(e);
    }
}

module.exports = {
    getFileName,
    get,
    save
}
