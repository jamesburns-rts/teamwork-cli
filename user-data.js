const fs = require('fs');

/************************************************************************************
 * Persist and read user data
 *
 * The data is read from the data.yml file and stored in a global variable.
 * The variable and its data can be accessed through the get() command and then
 * saved with the save() command.
 *
 ************************************************************************************/

const {HOME, HOMEPATH, LOCALAPPDATA} = process.env;
const homeDir = HOME || HOMEPATH || LOCALAPPDATA || false;
if (!homeDir) {
    throw "Either the HOME or HOMEPATH environment variable must be set!"
}

const USER_DATA_FILE = homeDir + '/.teamwork-data.json';
let data;

const getFileName = () => {
    return USER_DATA_FILE;
};

const checkData = () => {
    if (!data) {
        data = {};
    }
    if (!data.teamwork) {
        data.teamwork = {};
    }
    if (!data.timers) {
        data.timers = {};
    } else {
        Object.keys(data.timers).forEach(key => {
            const timer = data.timers[key];
            timer.started = new Date(timer.started);
        });
    }
    if (!data.favorites) {
        data.favorites = {};
    }
    if (data.arrived) {
        data.arrived = new Date(data.arrived);
    }
};

const get = () => {

    if (data) {
        return data;
    }

    try {
        if (fs.existsSync(USER_DATA_FILE)) {
            data = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf8'));
            checkData();
            return data;
        }
    } catch (e) {
        console.log(e);
    }

    checkData();
    return data;
};

const save = () => {
    try {
        const json = JSON.stringify(data, null, 2);
        fs.writeFileSync(USER_DATA_FILE, json);
    } catch (e) {
        console.log(e);
    }
};

module.exports = {
    getFileName,
    get,
    save
};
