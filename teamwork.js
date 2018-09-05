const request = require('sync-request');
const userData = require('./user-data.js');

/************************************************************************************
 * Teamwork API function wrappers
 ************************************************************************************/


let TEAMWORK_URL;
let BASIC_AUTH_TOKEN;
let USER_ID;

const init = () => {

    const persistedData = userData.get();
    let { key, url, userId } = persistedData.teamwork;

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
    USER_ID = userId;
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
const getMe = () => {
    return teamworkGET('/me.json');
}

/**
 * Get teamwork user id from API key
 */
const getUserId = () => {
    if (!USER_ID) {
        const me = getMe();
        USER_ID = me.person.id;
        userData.get().teamwork.userId = USER_ID;
    }
    return USER_ID;
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
 * Get a single Task list
 */
const getTasklist = (taskListId) => {
    return teamworkGET(`/tasklists/${taskListId}.json`)['todo-list'];
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
    const userId = getUserId();
    return teamworkGET(`/todo_items/${taskId}/time_entries.json`)['time-entries']
        .filter(entry => entry['person-id'] === userId);
}

/**
 * Add a task to the tasklist
 *
 * @param tasklistId ID of task list to add task to
 * @param newTask.content Name of task - required
 * @param newTask.estimatedMinutes Estimated minutes
 * @param newTask.description Longer description of task
 * @param newTask.parentTaskId ID of parent task
 * @param newTask.progress Percent complete 0-90
 * @param newTask.owner ID of assignees (csv)
 * @param newTask.startDate Date to start on
 * @param newTask.dueDate Date needs completed by
 * @param newTask.priority (low, medium, high)
 * @param newTask.predecessors tasks that need completed first
 * @param newTask.positionAfterTask Position in list (-1 top, 0 bottom, taskId after)
 * @param newTask.tags csv of tags
 */
const addTask = (tasklistId, newTask) => {

    const { content, description, parentTaskId, progress, priority, predecessors, positionAfterTask, tags,
        estimatedMinutes, owner, startDate, dueDate } = newTask;

    const todoItem = {
        "todo-item": {
            'estimated-minutes': estimatedMinutes,
            'responsible-party-id': owner,
            'start-date': startDate,
            'due-date': dueDate,
            content,
            description,
            parentTaskId,
            progress,
            priority,
            predecessors,
            positionAfterTask,
            tags
        }
    }


    console.log(newTask);
    return teamworkPOST(`/tasklists/${tasklistId}/tasks.json`, todoItem);
}

/**
 * Edit a task 
 *
 * @param taskId ID of task to edit
 * @param task.content Name of task - required
 * @param task.estimatedMinutes Estimated minutes
 * @param task.description Longer description of task
 * @param task.parentTaskId ID of parent task
 * @param task.progress Percent complete 0-90
 * @param task.owner ID of assignees (csv)
 * @param task.startDate Date to start on
 * @param task.dueDate Date needs completed by
 * @param task.priority (low, medium, high)
 * @param task.predecessors tasks that need completed first
 * @param task.positionAfterTask Position in list (-1 top, 0 bottom, taskId after)
 * @param task.tags csv of tags
 */
const editTask = (taskId, task) => {

    const { content, description, parentTaskId, progress, priority, predecessors, positionAfterTask, tags,
        estimatedMinutes, owner, startDate, dueDate } = task;

    const todoItem = {
        "todo-item": {
            'estimated-minutes': estimatedMinutes,
            'responsible-party-id': owner,
            'start-date': startDate,
            'due-date': dueDate,
            content,
            description,
            parentTaskId,
            progress,
            priority,
            predecessors,
            positionAfterTask,
            tags
        }
    }

    console.log(task);
    return teamworkPUT(`/tasks/${taskId}.json`, todoItem);
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
    const userId = getUserId();

    const args = { userId, fromDate, toDate };
    const argStr = Object.keys(args).filter(k => args[k]).map(k => k + '=' + args[k]).join('&')

    return teamworkGET('/time_entries.json?' + argStr)['time-entries'];
}

/**
 * Search for tasks using given searchTerm
 * @param searchTerm text to search for
 * @param projectId (optional) limit search to project
 * @param taskListId (optional) limit search to task list
 */
const searchForTask = (searchTerm, projectId, taskListId) => {

    let args = 'searchTerm=' + searchTerm;
    if (projectId) {
        args += '&projectId=' + projectId;
    }

    let results = teamworkGET('/search.json?pageSize=100&searchFor=tasks&' + args).searchResult.tasks;
    
    if (taskListId) {
        results = results.filter(r => r.taskListId === taskListId);
    }

    return results;
}

/**
 * Get the total time spent on a project
 * @param projectId ID of project
 */
const getProjectTime = (projectId) => {
    return getTimeFrom(teamworkGET(`/projects/${projectId}/time/total.json`).projects[0]);
}

/**
 * Get the total time spent on a task list
 * @param taskListId ID of task list
 */
const getTaskListTime = (taskListId) => {
    return getTimeFrom(teamworkGET(`/tasklists/${taskListId}/time/total.json`).projects[0].tasklist);
}

/**
 * Get the total time spent on a task
 * @param taskId ID of task
 */
const getTaskTime = (taskId) => {
    return getTimeFrom(teamworkGET(`/tasks/${taskId}/time/total.json`).projects[0].tasklist.task);
}

const getTimeFrom = (response) => {
    // maybe extend to return object
    return response['time-totals']['total-hours-sum'];
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


    const timeEntry = {
        'time-entry': {
            taskId: entry.taskId, 
            description: entry.description, 
            date: entry.date, 
            hours: entry.hours, 
            minutes: entry.minutes, 
            isbillable: entry.isbillable,
            'person-id': getUserId(),
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
    getUserId,
    getProjects,
    getTasklists,
    getTasklist,
    getTasks,
    getTask,
    getTaskEntries,
    addTask,
    editTask,
    deleteTask,
    deleteTimeEntry,
    getTimeEntry,
    getTimeEntries,
    sendTimeEntry,
    updateTimeEntry,
    searchForTask,
    getProjectTime,
    getTaskListTime,
    getTaskTime
}
