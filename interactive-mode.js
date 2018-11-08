const readline = require('readline-sync');
const dateFormat = require('dateformat');
const htmlToText = require('html-to-text');
const teamwork = require('./teamwork.js');
const userData = require('./user-data.js');
const functions = require('./common-functions.js');

/************************************************************************************
 * Interactive Mode
 ************************************************************************************/

const EXIT_COMMANDS = ['exit', 'quit', 'q', ':q', ':wq', 'leave'];
const DELIM = '/';

Array.prototype.contains = function (item) {
    return this.find(i => i === item) !== undefined;
};

const prettyJson = (json) => {
    if (json) {
        console.log(JSON.stringify(json, null, 2));
    } else {
        console.log('undefined');
    }
};

const state = {
    data: {
        projects: undefined,
        tasklists: undefined,
        tasks: undefined,
        timeEntries: undefined
    },
    selected: {
        project: null,
        tasklist: null,
        task: null,
        timeEntry: null
    }
};

const projectName = (projectId) => {
    const {projects} = state.data;
    const matches = projects.filter(proj => proj.id === projectId);
    return matches.length > 0 ? matches[0].name : '';
};

const taskListName = (tasklistId) => {
    const {tasklists} = state.data;
    const matches = tasklists.filter(tasklist => tasklist.id === tasklistId);
    return matches.length > 0 ? matches[0].name : teamwork.getTasklist(tasklistId).name;
};

/**
 * Utility function to prompt the user for a value
 * If no default value: '_prompt_: ', else '_prompt_[_defaultValue_]: '
 *
 * @param prompt Text to present to the user
 * @param defaultValue returned if user has no input - also is displayed after prompt
 */
const ask = (prompt, defaultValue) => {

    if (defaultValue !== null && defaultValue !== undefined) {
        const val = readline.question(`${prompt}[${defaultValue}]: `);
        return val.length > 0 ? val : defaultValue;
    } else {
        return readline.question(prompt + ': ');
    }
};

/**
 * Refreshes prompt stored in state based on selected items
 *
 * @param state Current state of the terminal
 */
const getPromptText = () => {

    const {project, tasklist, task, timeEntry} = state.selected;

    let prompt = '\nteamwork';

    if (project) {
        prompt = prompt + DELIM + project.name;

        if (tasklist) {
            prompt = prompt + DELIM + tasklist.name;

            if (task) {
                prompt = prompt + DELIM + task.content;

                if (timeEntry) {
                    prompt = prompt + DELIM + timeEntry.description;
                }
            }
        }
    }
    return prompt + ' > ';
};

/**
 * Utility function that gets the current directory level of the state (project, task, etc.)
 */
const getDirLevel = () => {
    const {project, tasklist, task, timeEntry} = state.selected;
    if (timeEntry) {
        return 'timeEntry';
    }
    if (task) {
        return 'task';
    }
    if (tasklist) {
        return 'tasklist';
    }
    if (project) {
        return 'project';
    }
    return 'top';
};

/**
 * Utility function that gets the current directory
 */
const getCurrentDir = () => {

    const {selected} = state;
    let dir = DELIM;

    if (selected.project) {
        dir = dir + selected.project.id;

        if (selected.tasklist) {
            dir = dir + DELIM + selected.tasklist.id;

            if (selected.task) {
                dir = dir + DELIM + selected.task.id;

                if (selected.timeEntry) {
                    dir = dir + DELIM + selected.timeEntry.id;
                }
            }
        }
    }
    return dir;
};

/**
 * Lists the current contents of the 'directory' (tasks in tasklist, etc)
 *
 * @param args Array of arguments with the first item being the command
 */
const ls = (args) => {

    const {data, selected} = state;

    const differentDir = args.length > 1;
    let originalDir = '.';

    if (differentDir) {
        originalDir = getCurrentDir();

        if (args[1] === '*') {
            // TODO 
        } else {
            cd(args);
        }
    }

    if (!selected.project) {

        console.log('\nProjects:');
        data.projects.forEach((p, idx) => console.log(`${idx}) ${p.id}: ${p.name}`));

    } else if (!selected.tasklist) {

        console.log('\nTask Lists:');
        data.tasklists.forEach((t, idx) => console.log(`${idx}) ${t.id}: ${t.name}`));

    } else if (!selected.task) {

        console.log('\nTasks:');
        data.tasks.forEach((t, idx) => console.log(`${idx}) ${t.id}: ${t.content}`));
    } else if (!selected.timeEntry) {

        console.log('\nTime Entires:');
        data.timeEntries.forEach((t, idx) => console.log(`${idx}) ${t.id}: ${dateFormat(new Date(t.date), 'mm/dd/yyyy')} ${t.hours}h ${t.minutes}m - ${t.description}`));
    }

    if (differentDir) {
        cd(['cd', originalDir]);
    }
};

const findEmpty = () => {
    const {selected} = state;

    let entryList = [];

    if (!selected.project) {
        entryList = teamwork.getAllEntries();
    } else if (!selected.tasklist) {
        entryList = teamwork.getProjectEntries(selected.project.id);
    } else if (!selected.task) {
        entryList = teamwork.getTaskListEntries(selected.tasklist.id);
    } else if (!selected.timeEntry) {
        entryList = teamwork.getTaskEntries(selected.task.id);

    }

    entryList.filter(l => !l.description || /^\s*$/.test(l.description))
        .forEach(entry => {
            const project = entry['project-id'];
            const taskList = entry.tasklistId;
            const task = entry['todo-item-id'];
            const id = entry.id;
            const taskName = entry['todo-item-name'];
            const date = dateFormat(new Date(entry.date), "mm/dd/yyyy");
            console.log(`${project}/${taskList}/${task}/${id}: "${taskName}" on ${date}`);
        });
};

const favorite = (args) => {

    if (!args || args.length < 2) {
        console.log('At least one argument required');
        return;
    }

    const {selected} = state;
    const differentDir = args.length > 2;
    let originalDir = '.';
    let name;

    if (differentDir) {
        originalDir = getCurrentDir();
        cd(['cd', args[1]]);
        name = args[2];
    } else {
        name = args[1];
    }

    switch (getDirLevel()) {
        case 'task':
            userData.get().favorites[name] = selected.task.id;
            userData.save();
            break;
        default:
            console.log('unsupported');
            return;
    }


    if (differentDir) {
        cd(['cd', originalDir]);
    }
};

const search = (args) => {
    if (!args || args.length < 2) {
        console.log('At least one argument required');
        return;
    }

    if (args.length === 2 && args[1] === '-e') {
        findEmpty();
        return;
    }

    const {project, tasklist} = state.selected;
    const searchTerm = args.slice(1).join(' ');
    const projectId = project ? project.id : null;
    const tasklistId = tasklist ? tasklist.id : null;

    const results = functions.searchForTask(searchTerm, projectId, tasklistId);

    switch (getDirLevel()) {
        case 'top':
            (new Set(results.map(t => t.taskListId))).forEach(tl => {
                const taskList = teamwork.getTasklist(tl);
                console.log(`\n${projectName(taskList.projectId)} / ${taskList.name}:`);
                results.filter(t => t.taskListId === tl)
                    .forEach(t => console.log(`${t.projectId}/${t.taskListId}/${t.id}: ${t.name}`));
            });
            break;
        case 'project':
            (new Set(results.map(t => t.taskListId))).forEach(tl => {
                console.log(`\n${taskListName(tl)}:`);
                results.filter(t => t.taskListId === tl)
                    .forEach(t => console.log(`${t.taskListId}/${t.id}: ${t.name}`));
            });
            break;
        case 'tasklist':
            results.forEach(t => console.log(`${t.id}: ${t.name}`));
            break;
        default:
            console.log('unsupported');
            return;
    }
};

const sumTime = (args) => {

    // remove command
    args = args.slice(1);

    let total;
    switch (getDirLevel()) {
        case 'top':
            if (args.length) {
                total = getTotalTime(args, null, teamwork.getProjectTime);
            } else {
                const projects = state.data.projects.map(p => p.id);
                total = getTotalTime(projects, null, teamwork.getProjectTime);
            }
            break;
        case 'project':
            total = getTotalTime(args, teamwork.getProjectTime, teamwork.getTaskListTime);
            break;
        case 'tasklist':
            total = getTotalTime(args, teamwork.getTaskListTime, teamwork.getTaskTime);
            break;
        case 'task':
            total = getTotalTime(args, teamwork.getTaskTime, getTimeEntryTime);
            break;
        case 'timeEntry':
            total = getTotalTime(null, getTimeEntryTime, null);
            break;
        default:
            console.log('unsupported');
            return;
    }

    console.log(`Total time: ${total} hours`);
};

const getTotalTime = (args, curDirFunc, subDirFunc) => {
    if (!args || args.length < 1) {
        const selected = getSelected();
        return selected && curDirFunc(selected.id);
    }

    let total = 0;
    if (subDirFunc) {
        args.forEach(arg => {
            const item = findCurrentDirItem(arg);
            if (item) {
                total += Number(subDirFunc(item.id));
            }
        });
    }

    return total;
};

const getTimeEntryTime = (arg) => {
    const item = findDirItem(state.data.timeEntries, arg);
    let total = 0;
    if (item) {
        const {hours, minutes} = item;
        if (hours) {
            total += Number(hours);
        }
        if (minutes) {
            total += Number(minutes) / 60;
        }
    }
    return total;
};

/**
 * Utility function that finds an item in the list given the argument.
 * First by array index, then by id, then by... ?
 *
 * @param list List to search through
 * @param arg Search parameter
 */
const findDirItem = (list, arg) => {
    if (!isNaN(arg)) {
        if (Number(arg) < list.length) {
            return list[Number(arg)];
        } else {
            const proj = list.find(p => p.id == arg);
            if (proj) {
                return proj;
            }
        }
    } else {
        // find it somehow by name?
    }
    return undefined;
};

const findCurrentDirItem = (arg) => {

    const {projects, tasklists, tasks, timeEntries} = state.data;

    switch (getDirLevel()) {
        case 'top':
            return findDirItem(projects, arg);
        case 'project':
            return findDirItem(tasklists, arg);
        case 'tasklist':
            return findDirItem(tasks, arg);
        case 'task':
            return findDirItem(timeEntries, arg);
        default:
            console.log('unsupported');
            return;
    }
};

const getSelected = () => {

    const {project, tasklist, task, timeEntry} = state.selected;

    switch (getDirLevel()) {
        case 'top':
            return null;
        case 'project':
            return project;
        case 'tasklist':
            return tasklist;
        case 'task':
            return task;
        case 'timeEntry':
            return timeEntry;
        default:
            console.log('unsupported');
            return;
    }
};

/**
 * Changes 'directory' of terminal
 *
 * @param state Current state of the terminal
 * @param args Array of arguments with first being the command
 */
const cd = (args) => {

    if (args.length < 2 || args[1] === DELIM || args[1] === '~') {
        state.selected = {
            project: null,
            tasklist: null,
            task: null,
            timeEntry: null
        }
    } else {

        let path = args[1];

        if (path.startsWith(DELIM)) {
            path = path.substr(1);
            cd(['cd'])
        }
        if (path.endsWith(DELIM)) {
            path = path.substr(0, path.length - 1);
        }

        const {selected, data} = state;

        // is a favorite
        if (path.indexOf('/') < 0 && isNaN(path)) {
            const taskId = userData.get().favorites[path];
            if (taskId) {
                const tmTask = teamwork.getTask(taskId);
                const projectId = tmTask['project-id'];
                const taskListId = tmTask['todo-list-id'];
                const p = `/${projectId}/${taskListId}/${taskId}`;
                cd(['cd', p]);
                return;
            }
        }

        path.split(DELIM).forEach(a => {

            if (a === '..') {

                if (selected.timeEntry) {
                    selected.timeEntry = null;

                } else if (selected.task) {
                    selected.task = null;

                } else if (selected.tasklist) {
                    selected.tasklist = null;

                } else if (selected.project) {
                    selected.project = null;
                }
            } else {

                if (!selected.project) {
                    selected.project = findDirItem(data.projects, a);

                } else if (!selected.tasklist) {
                    selected.tasklist = findDirItem(data.tasklists, a);

                } else if (!selected.task) {
                    selected.task = findDirItem(data.tasks, a);

                } else if (!selected.timeEntry) {
                    selected.timeEntry = findDirItem(data.timeEntries, a);
                }

                switch (getDirLevel(state)) {
                    case 'top':
                        data.projects = teamwork.getProjects();
                        break;
                    case 'project':
                        data.tasklists = teamwork.getTasklists(selected.project.id);
                        break;
                    case 'tasklist':
                        data.tasks = teamwork.getTasks(selected.tasklist.id);
                        break;
                    case 'task':
                        data.timeEntries = teamwork.getTaskEntries(selected.task.id);
                        break;
                    default:
                        break;
                }
            }
        });
    }

    userData.get().currentDir = getCurrentDir();
    userData.save();
};

/**
 * Wrapper around 'cd' that allows going back
 */
let lastDir = '/';
const reversableCd = (args) => {

    const goBack = args && args.length > 1 && args[1] === '-';
    const cdArgs = goBack ? ['cd', lastDir.slice()] : args;

    lastDir = getCurrentDir();

    cd(cdArgs);
};

const logTimeInteractive = (task) => {

    const defaults = {
        description: '',
        hours: 8,
        minutes: 0,
        date: dateFormat(new Date(), "yyyymmdd"),
        isbillable: 1
    };

    // check for a timer - hours/minutes
    const timer = userData.get().timers[task];
    if (timer) {
        let timerLength = Math.floor((timer.duration) / 1000 / 60);
        if (timer.running) {
            timerLength += new Date() - timer.started;
        }
        defaults.hours = Math.floor(timerLength / 60);
        defaults.minutes = timerLength % 60;
    }

    // check if billable
    const taskId = isNaN(task) ? userData.get().favorites[task] : task;
    const tmTask = teamwork.getTask(taskId);
    defaults.isbillable = tmTask['project-name'].startsWith('RTS') ? 0 : 1;

    // get values from user
    const description = ask('Description', defaults.description);
    const hours = ask('Hours', defaults.hours);
    const minutes = ask('Minutes', defaults.minutes);
    const date = ask('Date', defaults.date);
    const isbillable = ask('Is Billable', defaults.isbillable);

    // send time entry
    return functions.sendTimeEntry({taskId, description, date, hours, minutes, isbillable});
};

/**
 * Overrides the terminal to create an time entry
 */
const logTime = (args) => {

    switch (getDirLevel()) {
        case "task":
            logTimeInteractive(state.selected.task.id);
            cd(['cd', '.']);
            break;

        default:
            console.log('not supported');
            break;
    }
};

/**
 * updates a time entry
 */
const editItem = (args) => {

    let entry;
    let task;

    const hasArg = args && args.length > 1;

    switch (getDirLevel()) {
        case "timeEntry":
            entry = state.selected.timeEntry;
            break;

        case "task":
            if (hasArg) {
                entry = findDirItem(state.data.timeEntries, args[1]);
            } else {
                task = state.selected.task;
            }
            break;

        case "tasklist":
            if (hasArg) {
                task = findDirItem(state.data.tasks, args[1]);
            }
            break;

        default:
            console.log('not supported');
            return;
    }

    if (task) {

        const alteredTask = askForTaskInfo(task);

        if (!alteredTask.content) {
            console.log('Title required. Returning to prompt.');
            return;
        }

        const resp = teamwork.editTask(task.id, alteredTask);

        prettyJson(resp);
    }

    else if (entry) {
        const dateStr = dateFormat(new Date(entry.date), "yyyymmdd");

        entry.description = ask('Description', entry.description);
        entry.hours = ask('Hours', entry.hours);
        entry.minutes = ask('Minutes', entry.minutes);
        entry.date = ask('Date', dateStr);
        entry.isbillable = ask('Is Billable', entry.isbillable);

        teamwork.updateTimeEntry(entry);
        cd(['cd', '.']);

    } else {
        console.log('item not found');
        return;
    }
};

/**
 * moves a time entry
 */
const moveTimeEntry = (args) => {

    let entry, taskId;


    switch (getDirLevel()) {
        case "task":

            if (!args || args.length < 3) {
                console.log('Provide entry id or index and a task to move to');
                return;
            }

            entry = findDirItem(state.data.timeEntries, args[1]);
            taskId = args[2];
            break;
        default:
            console.log('not supported');
            return;
    }

    if (!entry) {
        console.log('item not found');
        return;
    }

    functions.moveTimeEntry(entry, taskId);
    cd(['cd', '.']);
};

const parseTimeEstimate = (str) => {
    if (str.length === 0) {
        return null;
    }
    // if only number, assume hours
    let weeks = 0, days = 0, hours = 0, minutes = 0;
    if (!isNaN(str)) {
        hours = Number(str);
    } else {
        let res = /(\d+)w/.exec(str);
        if (res) {
            weeks = Number(res[1]);
        }
        res = /(\d+)d/.exec(str);
        if (res) {
            days = Number(res[1]);
        }
        res = /(\d+)h/.exec(str);
        if (res) {
            hours = Number(res[1]);
        }
        res = /(\d+)m/.exec(str);
        if (res) {
            minutes = Number(res[1]);
        }
    }
    return minutes + (hours + (days + weeks * 5) * 8) * 60;
};

const askForTaskInfo = (defaults) => {

    const task = {};

    const getDefault = (val) => {
        const v = defaults ? defaults[val] : null;
        return v ? v : '';
    };

    const content = ask('Title', getDefault('content'));
    if (content) {
        task.content = content;
    }
    const defEst = getDefault('estimatedMinutes');
    const estimate = parseTimeEstimate(ask('Time estimate', defEst.length > 0 ? (defEst + 'm') : ''));
    if (estimate) {
        task.estimatedMinutes = estimate;
    }
    const description = ask('Description', getDefault('description'));
    if (description.length > 0) {
        task.description = description;
    }
    let parentTaskId = ask('Parent Task', getDefault('parentTaskId'));
    if (parentTaskId.length > 0) {
        if (isNaN(parentTaskId)) {
            parentTaskId = userData.get().favorites[parentTaskId];
        }
        task.parentTaskId = parentTaskId;
    }
    const progress = ask('Progress % (0-90)', getDefault('progress'));
    if (progress.length > 0 && !isNaN(progress)) {
        task.progress = Number(progress);
    }
    let owner = ask('Owner (id|me)', getDefault('owner'));
    if (owner.length > 0) {
        if (owner.toLowerCase() === 'me') {
            owner = teamwork.getUserId();
        }
        task.owner = owner;
    }
    const startDate = ask('Start Date(yyyymmdd)', getDefault('start-date'));
    if (startDate.length > 0) {
        task.startDate = startDate;
    }
    const dueDate = ask('Due Date(yyyymmdd)', getDefault('due-date'));
    if (dueDate.length > 0) {
        task.dueDate = dueDate;
    }
    const priority = ask('Priority(low|medium|high)', getDefault('priority'));
    if (priority.length > 0) {
        task.priority = priority;
    }
    const predecessors = ask('Predecessor Tasks(csv)', getDefault('predecessors'));
    if (predecessors.length > 0) {
        task.predecessors = predecessors.split(',')
            .map(p => p.trim())
            .map(p => isNaN(p) ? userData.get().favorites[p] : p)
            .map(p => {
                return {
                    id: p,
                    type: 'complete'
                }
            });
    }
    const positionAfterTask = ask('Position(-1,0,id)', getDefault('positionAfterTask'));
    if (positionAfterTask.length > 0) {
        task.positionAfterTask = isNaN(positionAfterTask) ? userData.get().favorites[positionAfterTask] : positionAfterTask;
    }
    const defTags = getDefault('tags');
    const tags = ask('Tags(csv)', defTags ? defTags.map(t => t.name).join(',') : '');
    if (tags.length > 0) {
        task.tags = tags.split(',')
            .map(p => p.trim())
            .join(',');
    }

    return task;
};

/**
 * Add item to the current directory
 */
const addItem = (args) => {

    switch (getDirLevel()) {
        case "tasklist":

            const newTask = askForTaskInfo();

            if (!newTask.content) {
                console.log('Title required. Returning to prompt.');
                return;
            }

            const tasklistId = state.selected.tasklist.id;
            const resp = teamwork.addTask(tasklistId, newTask);

            prettyJson(resp);

            state.data.tasks = teamwork.getTasks(tasklistId);
            break;
        case "task":
            logTime(args);
            break;
        default:
            console.log('not supported');
            break;
    }
};

const listNotebooks = (args) => {
    const {selected} = state;

    if (getDirLevel() === 'top') {
        console.log('unsupported');
        return;
    }

    const selection = (args && args.length > 1) ? args[1] : null;

    let notebooks = teamwork.getProjectNotebooks(selected.project.id);

    if (notebooks) {
        if (selection) {
            const notebook = teamwork.getNotebook(notebooks[args[1]].id).content;
            console.log(htmlToText.fromString(notebook));
        } else {
            notebooks.forEach((nb, idx) => {
                console.log(`${idx}) ${nb.id}: ${nb.name}`);
            });
        }
    }
};


/**
 * Print usage
 */
const usage = (args) => {

    console.log('This mode creates a quasi-terminal with a directory structure setup like teamwork. There is a top level "teamwork" directory containing a folder for each project, each project contains tasklists, and each tasklist contains tasks.');

    console.log('\nOnce in a task you can log time. You can also create tasks/tasklists.');

    commands.forEach(cmd => {
        console.log(`\n    ${cmd.name.toUpperCase()}: ${cmd.aliases.join(', ')}`);
        console.log('    ' + cmd.description);
    });
};

const printInfo = (args) => {
    if (args && args.length > 1) {
        if (args[1] === 'hours') {
            functions.printTimeLogged();
        } else if (args[1] === 'logged') {
            functions.printPreviousTasks()
        } else if (args[1] === 'today') {
            functions.printDateEntries(dateFormat(new Date(), 'yyyymmdd'));
        } else if (args.length > 2 && args[1] === 'on') {
            functions.printDateEntries(args[2]);
        }
    } else {
        functions.printTimeLogged();
    }
};

const echoItem = (args) => {

    if (args.length > 1) {

        const originalDir = getCurrentDir();
        cd(args);
        echoItem([]);
        cd(['cd', originalDir]);

    } else {
        prettyJson(state.selected[getDirLevel()]);
    }
};

const sureDelete = (description) => {
    const confirmation = ask('Are you sure you want to delete "' + description + '" [y/N]? ').toLowerCase();
    return confirmation === 'y' || confirmation === 'yes';
};

const deleteItem = (args) => {

    if (!args || args.length < 2) {
        console.log('Removing requires arguments.');
        return;
    }

    switch (getDirLevel()) {
        case 'tasklist':
            const task = findDirItem(state.data.tasks, args[1]);
            if (!task) {
                console.log('Task not found.');

            } else if (sureDelete(task.content)) {
                teamwork.deleteTask(task.id);
            }
            break;
        case 'task':
            const entry = findDirItem(state.data.timeEntries, args[1]);
            if (!entry) {
                console.log('Entry not found.');

            } else if (sureDelete(entry.description)) {
                teamwork.deleteTimeEntry(entry.id);
            }
            break;
        default:
            console.log('unsupported');
            return;
    }
    cd(['cd', '.']);
};

const copyItem = (args) => {

    if (!args || args.length < 2) {
        console.log('Copying requires arguments.');
        return;
    }

    switch (getDirLevel()) {
        case 'task':
            const entry = findDirItem(state.data.timeEntries, args[1]);
            if (!entry) {
                console.log('Entry not found.');

            } else {
                functions.sendTimeEntry({
                    taskId: state.selected.task.id,
                    description: entry.description,
                    date: dateFormat(new Date(), 'yyyymmdd'),
                    hours: entry.hours,
                    minutes: entry.minutes,
                    isbillable: entry.isbillable
                });
            }
            break;
        default:
            console.log('unsupported');
            return;
    }
    cd(['cd', '.']);
};

const commands = [
    {
        name: 'exit',
        aliases: EXIT_COMMANDS,
        action: (args) => {
        },
        description: 'Exit interactive mode.'
    },
    {
        name: 'list',
        aliases: ['list', 'ls', 'l', 'll'],
        action: ls,
        description: 'List the contents of the item - a projects tasklists for example.'
    },
    {
        name: 'select',
        aliases: ['select', 'sel', 'cd', 'c', ':e', 'enter', 'dir'],
        action: reversableCd,
        description: 'Select a project, tasklist, or task - aka change directory.'
    },
    {
        name: 'edit',
        aliases: ['edit'],
        action: editItem,
        description: 'Update a time entry'
    },
    {
        name: 'move',
        aliases: ['move', 'mv'],
        action: moveTimeEntry,
        description: 'Move a time entry to another task'
    },
    {
        name: 'help',
        aliases: ['help', 'h', 'pls', 'halp'],
        action: usage,
        description: 'Display this information.'
    },
    {
        name: 'log time',
        aliases: ['log', 'entry', 'record'],
        action: logTime,
        description: 'Log time while in a given task'
    },
    {
        name: 'create',
        aliases: ['create', 'mkdir', 'touch', 'make', 'add'],
        action: addItem,
        description: 'Create a new item in the entity (new task, tasklist, etc.)'
    },
    {
        name: 'hours',
        aliases: ['hours', 'print'],
        action: printInfo,
        description: 'Display infromation about time already logged'
    },
    {
        name: 'path',
        aliases: ['path', 'pwd'],
        action: () => console.log(getCurrentDir()),
        description: 'Display the current path using the Ids.'
    },
    {
        name: 'echo',
        aliases: ['echo', 'cat', 'show', 'display'],
        action: echoItem,
        description: 'Display the json of the item'
    },
    {
        name: 'remove',
        aliases: ['remove', 'rm', 'delete', 'del'],
        action: deleteItem,
        description: 'Delete the specified item.'
    },
    {
        name: 'copy',
        aliases: ['copy', 'cp', 'duplicate', 'dup'],
        action: copyItem,
        description: 'Copy the specified item.'
    },
    {
        name: 'today',
        aliases: ['today'],
        action: () => printInfo(['print', 'today']),
        description: 'Show logged today'
    },
    {
        name: 'favorite',
        aliases: ['favorite', 'fav'],
        action: favorite,
        description: 'Mark task as favorite: fav [PATH] name'
    },
    {
        name: 'favorites',
        aliases: ['favorites', 'favs', 'faves', 'favesies'],
        action: (args) => functions.listFavorites(args.indexOf('-v') > 0),
        description: 'List favorites (use -v for task names)'
    },
    {
        name: 'clear',
        aliases: ['clear', 'cle'],
        action: () => process.stdout.write('\033c'),
        description: 'Clear screen'
    },
    {
        name: 'search',
        aliases: ['search', '/', '?', 'find'],
        action: search,
        description: 'Searches for a task. If -e option is provided, then time entries with empty descriptions are listed.'
    },
    {
        name: 'total',
        aliases: ['total', 'time', 'sum'],
        action: sumTime,
        description: 'Sums the time spent on an item or items'
    },
    {
        name: 'notebooks',
        aliases: ['notebooks', 'notes', 'nb', 'books'],
        action: listNotebooks,
        description: 'List the notebooks in the current dir'
    },
];

/**
 * Creates an interactive terminal to view and modify teamwork data
 *
 * @param startingPath Immediately executes 'cd' on this argument
 */
const interactiveMode = (startingPath) => {

    const data = userData.get();

    if (data.teamwork.url && data.teamwork.key) {
        state.data.projects = teamwork.getProjects();
    }

    if (data.currentDir) {
        reversableCd(['cd', data.currentDir]);
    }

    if (startingPath) {
        reversableCd(['cd', startingPath]);
    }

    while (1) {

        const answer = readline.question(getPromptText());
        const args = answer.split(' ');
        const cmd = args[0].toLowerCase();

        const command = commands.find(c => c.aliases.contains(cmd));
        if (command) {
            command.action(args);
        }

        if (EXIT_COMMANDS.contains(cmd)) {
            break;
        }
    }
};

module.exports = {
    interactiveMode,
    logTimeInteractive,
    usage
};
