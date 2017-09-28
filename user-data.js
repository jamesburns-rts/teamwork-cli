const dateFormat = require('dateformat');
const yaml = require('js-yaml');
const fs = require('fs');

/************************************************************************************
 * Persist and read user data
 *
 * The data is read from the data.yml file and stored in a global variable.
 * The variable and its data can be accessed through the get() command and then
 * saved with the save() command.
 *
 ************************************************************************************/


const USER_DATA_FILE = __dirname + '/data.yml';
let data;

const getFileName = () => {
    return USER_DATA_FILE;
}

const checkData = () => {
  if (!data) {
    data = {};
  }
  if (!data.teamwork) {
    data.teamwork = {};
  } 
  if (!data.timers) {
    data.timers = {};
  }
  if (!data.favorites) {
    data.favorites = {};
  }
}

const get = () => {

    if (data) {
        return data;
    }

    try {
        if (fs.existsSync(USER_DATA_FILE)) {
            data = yaml.safeLoad(fs.readFileSync(USER_DATA_FILE, 'utf8'));
            checkData();
            return data;
        }
    } catch (e) {
        console.log(e);
    }
    
    checkData();
    return data;
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
