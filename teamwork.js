const request = require('sync-request');
const userData = require('./user-data.js');

/************************************************************************************
 * Teamwork API function wrappers
 ************************************************************************************/


let TEAMWORK_URL;
let BASIC_AUTH_TOKEN;

const init = () => {

    const persistedData = userData.get();
    let { key, url } = persistedData.teamwork;

    if (typeof key !== 'string' || key.length === 0) {
        console.log("ERROR: You need to set the teamwork.key in " + userData.getFileName() + " to use these scripts.");
    }

    if (typeof url !== 'string' || url.length === 0) {
        console.log("ERROR: You need to set the teamwork.url in " + userData.getFileName() + " to use these scripts.");
    }

    if (url.startsWith('http')) {
        TEAMWORK_URL = url;
    } else {
        TEAMWORK_URL = 'https://' + url;
    }
    BASIC_AUTH_TOKEN = new Buffer(key + ":xxx").toString("base64");
}

const getAuthHeader = () => {
    if (!BASIC_AUTH_TOKEN) { 
        init();
    }
    return "BASIC " + BASIC_AUTH_TOKEN; 
}

const getTeamworkUrl = () => {
    if (!TEAMWORK_URL) { 
        init();
    }
    return TEAMWORK_URL; 
}


/**
 * Make a GET request to a teamwork API.
 *
 * @param endpoint Path to API (after base URL)
 * @returns Object body of response
 */
const teamworkGET = (endpoint) => {
    let body = request('GET', getTeamworkUrl() + endpoint, {
        headers: {
            "Authorization": getAuthHeader(),
            "Accept": "application/json"
        }
    }).getBody('utf8');
    if (!body) {
        throw new Error("There was no body.");
    }
    return JSON.parse(body);
};

/**
 * Make a POST request to a teamwork API.
 *
 * @param endpoint Path to API (after base URL)
 * @param body Object to attach to request
 * @returns Object body of response
 */
const teamworkPOST = (endpoint, body) => {
    let resp = request('POST', getTeamworkUrl() + endpoint, {
        headers: {
            "Authorization": getAuthHeader(),
            "Accept": "application/json"
        },
        json: body
    }).getBody('utf8');
    if (!resp) {
        return;
    } else {
        return JSON.parse(resp);
    }
};

/**
 * Make a PUT request to a teamwork API.
 *
 * @param endpoint Path to API (after base URL)
 * @param body Object to attach to request
 * @returns Object body of response
 */
const teamworkPUT = (endpoint, body) => {
    let resp = request('PUT', getTeamworkUrl() + endpoint, {
        headers: {
            "Authorization": getAuthHeader(),
            "Accept": "application/json"
        },
        json: body
    }).getBody('utf8');
    if (!resp) {
        return;
    } else {
        return JSON.parse(resp);
    }
};

/**
 * Make a DELETE request to a teamwork API.
 *
 * @param endpoint Path to API (after base URL)
 */
const teamworkDELETE = (endpoint) => {
    request('DELETE', getTeamworkUrl() + endpoint, {
        headers: {
            "Authorization": getAuthHeader()
        }
    });
};

/**
 * Get teamwork user information from API key
 */
let ME = undefined;
const getMe = () => {
    if (!ME) {
        ME = teamworkGET('/me.json');
    }
    return ME;
}

/**
 * Get list of projects for user
 */
const getProjects = () => {
    return teamworkGET('/projects.json').projects;
}

/**
 * Get collection of Task lists for the given project
 */
const getTasklists = (projectId) => {
    return teamworkGET(`/projects/${projectId}/tasklists.json`).tasklists;
}

/**
 * Get collection of tasks for the given task list
 */
const getTasks = (tasklistId) => {
    return teamworkGET(`/tasklists/${tasklistId}/tasks.json`)['todo-items'];
}

/**
 * Get collection of tasks for the given task list
 */
const getTask = (taskId) => {
    return teamworkGET(`/tasks/${taskId}.json`)['todo-item'];
}

/**
 * Get collection of time entries for the given task
 */
const getTaskEntries = (taskId) => {
    const userId = getMe().person.id;
    return teamworkGET(`/todo_items/${taskId}/time_entries.json`)['time-entries']
        .filter(entry => entry['person-id'] === userId);
}

/**
 * Add a task to the tasklist
 *
 * @param tasklistId ID of task list to add task to
 * @param content Description of task
 */
const addTask = (tasklistId, content) => {

    const todoItem = {
        "todo-item": {
            content
        }
    }

    return teamworkPOST(`/tasklists/${tasklistId}/tasks.json`, todoItem);
}

/**
 * Deletes the task
 */
const deleteTask = (taskId) => {
    teamworkDELETE(`/tasks/${taskId}.json`);
}

/**
 * Deletes the time entry
 */
const deleteTimeEntry = (entryId) => {
    teamworkDELETE(`/time_entries/${entryId}.json`);
}

/**
 * Get user's time entries between the given dates
 */
const getTimeEntries = (fromDate, toDate) => {
    const userId = getMe().person.id;

    const args = { userId, fromDate, toDate };
    const argStr = Object.keys(args).filter(k => args[k]).map(k => k + '=' + args[k]).join('&')

    return teamworkGET('/time_entries.json?' + argStr)['time-entries'];
}

const getTimeEntry = (entryId) => {
    return teamworkGET(`/time_entries/${entryId}.json`)['time-entry'];
}

const prettyJson = (json) => {
    if (json) {
        console.log(JSON.stringify(json, null, 2));
    } else {
        console.log('undefined');
    }
}

/**
 * Send a time entry to log
 *
 * @param entry.taskId ID of task to enter time for
 * @param entry.description Text describing the entry
 * @param entry.date Date the entry is for
 * @param entry.hours Number of hours to log
 * @param entry.minutes Number of minutes to log
 * @param entry.isbillable 1 if time is billable
 * @param entry.time The start time of the entry
 */
const sendTimeEntry = (entry) => {

    const me = getMe();

    const timeEntry = {
        'time-entry': {
            taskId: entry.taskId, 
            description: entry.description, 
            date: entry.date, 
            hours: entry.hours, 
            minutes: entry.minutes, 
            isbillable: entry.isbillable,
            'person-id': me.person.id,
            time: entry.time,
            'tags': ''
        }
    };

    prettyJson(timeEntry);
    return teamworkPOST(`/tasks/${entry.taskId}/time_entries.json`, timeEntry);
}

const updateTimeEntry = (entry) => {

    const timeEntry = {
        'time-entry': {
            description: entry.description, 
            date: entry.date, 
            hours: entry.hours, 
            minutes: entry.minutes, 
            isbillable: entry.isbillable
        }
    };

    return teamworkPUT(`/time_entries/${entry.id}.json`, timeEntry);
}

module.exports = {
    teamworkGET,
    teamworkPOST,
    teamworkPUT,
    teamworkDELETE,
    getMe,
    getProjects,
    getTasklists,
    getTasks,
    getTask,
    getTaskEntries,
    addTask,
    deleteTask,
    deleteTimeEntry,
    getTimeEntry,
    getTimeEntries,
    sendTimeEntry,
    updateTimeEntry
}
