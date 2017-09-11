const readline = require('readline');
const dateFormat = require('dateformat');
const teamwork = require('./teamwork.js');
const functions = require('./common-functions.js');

/************************************************************************************
 * Interactive Mode
 ************************************************************************************/

const EXIT_COMMANDS = [ 'exit', 'quit', 'q', ':q' ];
const HELP_COMMANDS = [ 'help', 'h', 'please' ];
const CD_COMMANDS = [ 'cd', 'select', 'sel', 'c', ':e', 'enter', 'dir' ];
const LS_COMMANDS = [ 'ls', 'l', 'list' ];
const ENTRY_COMMANDS = [ 'entry', 'log', 'record' ];

Array.prototype.contains = function ( item ) {
    return this.find(i => i === item) !== undefined;
}

/**
 * Refreshes prompt stored in state based on selected items
 *
 * @param state Current state of the terminal
 */
const refreshPrompt = (state) => {

    const { project, tasklist, task } = state.selected;

    let prompt = '\nteamwork'

    if (project) {
        prompt = prompt +  '/' + project.name;

        if (tasklist) {
            prompt = prompt +  '/' + tasklist.name;

            if (task) {
                prompt = prompt +  '/' + task.content;
            }
        } 
    } 
    state.prompt = prompt + ' > ';
}

/**
 * Utility function that gets the current directory level of the state (project, task, etc.)
 *
 * @param state Current state of the terminal
 */
const getDirLevel = (state) => {
    const { project, tasklist, task } = state.selected;
    if (task) { return 'task'; }
    if (tasklist) { return 'tasklist'; }
    if (project) { return 'project'; }
    return 'top';
}

/**
 * Lists the current contents of the 'directory' (tasks in tasklist, etc)
 *
 * @param state Current state of the terminal
 * @param args Array of arguments with the first item being the command
 */
const ls = (state, args) => {

    let originalDir = '/';
    if (state.selected.project) {
        originalDir = originalDir + state.selected.project.id;

        if (state.selected.tasklist) {
            originalDir = originalDir + '/' + state.selected.tasklist.id;

            if (state.selected.task) {
                originalDir = originalDir + '/' + state.selected.task.id;
            }
        } 
    } 

    if (args.length > 1) {
        cd(state, args);
    }

    const { data, selected } = state;

    if (!selected.project) {

        console.log('\nProjects:');
        data.projects.forEach((p,idx) => console.log(`${idx}) ${p.id}: ${p.name}`));

    } else if (!selected.tasklist) {

        console.log('\nTask Lists:');
        data.tasklists.forEach((t,idx) => console.log(`${idx}) ${t.id}: ${t.name}`));

    } else if (!selected.task) {

        console.log('\nTasks:');
        data.tasks.forEach((t,idx) => console.log(`${idx}) ${t.id}: ${t.content}`));
    }

    if (args.length > 1) {
        cd(state, ['cd', originalDir]);
    }
}

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
            const proj = list.find(p => p.id === arg);
            if (proj) {
                return proj;
            }
        }
    } else {
        // find it somehow by name?
    }
    return undefined;
}

/**
 * Changes 'directory' of terminal
 * 
 * @param state Current state of the terminal
 * @param args Array of arguments with first being the command
 */
const cd = (state, args) => {

    const DELIM = '/';

    if (args.length < 2) {
        state.selected = {
            project: null,
            tasklist: null,
            task: null
        }
        return;
    }

    let path = args[1];

    if (path.startsWith(DELIM)) {
        path = path.substr(1);
        cd(state, [])
    }
    if (path.endsWith(DELIM)) {
        path = path.substr(0, path.length - 1);
    }

    const { selected, data } = state;

    path.split(DELIM).forEach(a => {

        if (a === '..') {

            if (selected.task) {
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
                default:
                    break;
            }
        }
    });
}

/**
 * Overrides the terminal to create an time entry
 *
 * @param rl readline terminal handle
 * @param logTimeState logTime terminal sub-state
 */
const logTime = (rl, logTimeState) => {

    switch (logTimeState.step) {
        case 'description':
            rl.question('Description []: ', answer => {
                logTimeState.description = answer;
                logTimeState.step = 'hours';
                logTime(rl, logTimeState);
            });
            break;
        case 'hours':
            rl.question('Hours [1]: ', answer => {
                logTimeState.hours = answer.length > 0 ? Number(answer) : 1;
                logTimeState.step = 'minutes';
                logTime(rl, logTimeState);
            });
            break;
        case 'minutes':
            rl.question('Minutes [0]: ', answer => {
                logTimeState.minutes = answer.length > 0 ? Number(answer) : 0;
                logTimeState.step = 'date';
                logTime(rl, logTimeState);
            });
            break;
        case 'date':
            const dateStr = dateFormat(new Date(), "yyyymmdd");
            rl.question('Date [' + dateStr + ']: ', answer => {
                logTimeState.date = answer.length > 0 ? answer : dateStr;
                logTimeState.step = 'billable';
                logTime(rl, logTimeState);
            });
            break;
        case 'billable':
            rl.question('Is Billable [1]: ', answer => {
                logTimeState.isBillable = answer.length > 0 ? Number(answer) : 1;
                logTimeState.step = 'done';
                logTime(rl, logTimeState);
            });
            break;
        case 'done':
        default:
            functions.sendTimeEntry(logTimeState);
            logTimeState.exit();
            break;
    }
}

/**
 * Creates an interactive terminal to view and modify teamwork data
 */
const interactiveMode = () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const state = {
        prompt: '\nteamwork > ',
        data: {
            projects: teamwork.getProjects(),
            tasklists: undefined,
            tasks: undefined
        },
        selected: {
            project: null,
            tasklist: null,
            task: null
        }
    };

    const showPrompt = (state) => {
        rl.question(state.prompt, answer => {

            const args = answer.split(' ');
            const cmd = args[0].toLowerCase();

            if (EXIT_COMMANDS.contains(cmd)) {
                rl.close();
                return;

            } else if (HELP_COMMANDS.contains(cmd)) {
                console.log('print help');

            } else if (CD_COMMANDS.contains(cmd)) {
                cd(state, args);

            } else if (LS_COMMANDS.contains(cmd)) {
                ls(state, args);

            } else if (cmd === 'print' && args.length > 1) {
                if (args[1] === 'hours') {
                    functions.printTimeLogged();
                } else if (args[1] === 'logged'){
                    functions.printPreviousTasks()
                } else if (args.length > 2 && args[1] === 'on') {
                    functions.printDateEntries(args[2]);
                }
            } else if (ENTRY_COMMANDS.contains(cmd) && getDirLevel(state) === 'task') {
                const logTimeState = {
                    step: 'description',
                    exit: () => showPrompt(state),
                    taskId: state.selected.task.id, 
                }
                logTime(rl, logTimeState);
            }

            refreshPrompt(state)
            showPrompt(state);
        });
    }

    showPrompt(state);
}

module.exports = {
    interactiveMode
}
