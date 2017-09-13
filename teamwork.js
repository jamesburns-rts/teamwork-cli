
const request = require('sync-request');

/************************************************************************************
 * Teamwork API function wrappers
 ************************************************************************************/

const key = process.env.TEAMWORK_KEY;
if (typeof key !== 'string' || key.length === 0) {
    console.log("ERROR: You need to set the TEAMWORK_KEY environment variable to use these scripts.");
}

const TEAMWORK_URL = 'https://rtslabs.teamwork.com';
const BASIC_AUTH_TOKEN = new Buffer(key + ":xxx").toString("base64");

/**
 * Make a GET request to a teamwork API.
 *
 * @param endpoint Path to API (after base URL)
 * @returns Object body of response
 */
const teamworkGET = (endpoint) => {
    let body = request('GET', TEAMWORK_URL + endpoint, {
        headers: {
            "Authorization": "BASIC " + BASIC_AUTH_TOKEN,
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
    let resp = request('POST', TEAMWORK_URL + endpoint, {
        headers: {
            "Authorization": "BASIC " + BASIC_AUTH_TOKEN,
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
    request('DELETE', TEAMWORK_URL + endpoint, {
        headers: {
            "Authorization": "BASIC " + BASIC_AUTH_TOKEN
        }
    });
};

/**
 * Get teamwork user information from API key
 */
const getMe = () => {
    return teamworkGET('/me.json');
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

const deleteTask = (taskId) => {
    teamworkDELETE(`/tasks/${taskId}.json`);
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

/**
 * Send a time entry to log
 *
 * @param entry.taskId ID of task to enter time for
 * @param entry.description Text describing the entry
 * @param entry.date Date the entry is for
 * @param entry.hours Number of hours to log
 * @param entry.minutes Number of minutes to log
 * @param entry.isbillable 1 if time is billable
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
            time: '9:00',
            'tags': ''
        }
    };

    console.log(timeEntry);
    return teamworkPOST(`/tasks/${entry.taskId}/time_entries.json`, timeEntry);
}

module.exports = {
    teamworkGET,
    teamworkPOST,
    getMe,
    getProjects,
    getTasklists,
    getTasks,
    addTask,
    getTimeEntries,
    sendTimeEntry
}
