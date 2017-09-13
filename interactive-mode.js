const readline = require('readline');
const dateFormat = require('dateformat');
const teamwork = require('./teamwork.js');
const functions = require('./common-functions.js');

/************************************************************************************
 * Interactive Mode
 ************************************************************************************/

const EXIT_COMMANDS = [ 'exit', 'quit', 'q', ':q', ':wq', 'leave' ];
const HELP_COMMANDS = [ 'help', 'h', 'pls', 'halp' ];
const CD_COMMANDS = [ 'select', 'sel', 'cd', 'c', ':e', 'enter', 'dir' ];
const LS_COMMANDS = [  'list', 'ls', 'l' ];
const ENTRY_COMMANDS = [ 'entry', 'log', 'record' ];
const CREATE_COMMANDS = [ 'create', 'mkdir', 'touch', 'make', 'edit', 'add' ];

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

        if (args[1] === '*') {
            // TODO 
        } else {
            cd(state, args);
        }
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
    } else {

        console.log('\nTime Entires:');
        data.timeEntries.forEach((t,idx) => console.log(`${idx}) ${t.id}: ${dateFormat(new Date(t.date), 'mm/dd/yyyy')} ${t.hours}h ${t.minutes}m - ${t.description}`));
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
                    data.timeEntries = teamwork.getTaskEntries(selected.task.id);
                    break;
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
const logTime = (logTimeState) => {

    const { rl, step } = logTimeState; 

    switch (step) {
        case 'description':
            rl.question('Description []: ', answer => {
                logTimeState.description = answer;
                logTimeState.step = 'hours';
                logTime(logTimeState);
            });
            break;
        case 'hours':
            rl.question('Hours [8]: ', answer => {
                logTimeState.hours = answer.length > 0 ? Number(answer) : 8;
                logTimeState.step = 'minutes';
                logTime(logTimeState);
            });
            break;
        case 'minutes':
            rl.question('Minutes [0]: ', answer => {
                logTimeState.minutes = answer.length > 0 ? Number(answer) : 0;
                logTimeState.step = 'date';
                logTime(logTimeState);
            });
            break;
        case 'date':
            const dateStr = dateFormat(new Date(), "yyyymmdd");
            rl.question('Date [' + dateStr + ']: ', answer => {
                logTimeState.date = answer.length > 0 ? answer : dateStr;
                logTimeState.step = 'billable';
                logTime(logTimeState);
            });
            break;
        case 'billable':
            rl.question('Is Billable [1]: ', answer => {
                logTimeState.isbillable = answer.length > 0 ? Number(answer) : 1;
                logTimeState.step = 'done';
                logTime(logTimeState);
            });
            break;
        case 'done':
        default:
            functions.sendTimeEntry(logTimeState);
            logTimeState.exit();
            break;
    }
}

const addItem = (addItemState) => {

    const { rl, step, level, state } = addItemState;

    switch (step) {
        case 'description':
            rl.question('Description: ', answer => {
                if (answer.length > 0) {
                    addItemState.description = answer;
                    addItemState.step = 'done';
                }
                addItem(addItemState);
            });
            break;
        case 'done':
        default:
            if (level === 'tasklist') {
                const tasklistId = state.selected.tasklist.id;
                const resp = teamwork.addTask(tasklistId, addItemState.description);
                console.log(resp);
                state.data.tasks = teamwork.getTasks(tasklistId);
            }
            addItemState.exit();
            break;
    }

}

const usage = () => {

    console.log('This mode creates a quasi-terminal with a directory structure setup like teamwork. There is a top level "teamwork" directory containing a folder for each project, each project contains tasklists, and each tasklist contains tasks.');
    
    console.log('\nOnce in a task you can log time. You can also create tasks/tasklists.');

    console.log('\n\tHELP: ' + HELP_COMMANDS.join(', '));
    console.log('\tDisplay this information.');

    console.log('\n\tEXIT: ' + EXIT_COMMANDS.join(', '));
    console.log('\tExit interactive mode.');

    console.log('\n\tSELECT: ' + CD_COMMANDS.join(', '));
    console.log('\tSelect a project, tasklist, or task - aka change directory.');

    console.log('\n\tLIST: ' + LS_COMMANDS.join(', '));
    console.log('\tList the contents of the item - a projects tasklists for example.');

    console.log('\n\tCREATE: ' + CREATE_COMMANDS.join(', '));
    console.log('\tCreate a new item in the entity (new task, tasklist, etc.)');

    console.log('\n\tLOG TIME: ' + ENTRY_COMMANDS.join(', '));
    console.log('\tLog time while in a given task');

    console.log('\n\tPRINT: print hours, print logged, print on <date>');
    console.log('\tDisplay infromation about time already logged');
}

/**
 * Creates an interactive terminal to view and modify teamwork data
 *
 * @param startingPath Immediately executes 'cd' on this argument
 */
const interactiveMode = (startingPath) => {
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

    if (startingPath) {
        cd(state, ['cd', startingPath]);
        refreshPrompt(state)
    }

    const showPrompt = (state) => {
        rl.question(state.prompt, answer => {

            const args = answer.split(' ');
            const cmd = args[0].toLowerCase();

            if (EXIT_COMMANDS.contains(cmd)) {
                rl.close();
                return;

            } else if (HELP_COMMANDS.contains(cmd)) {
                usage();

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
                logTime({
                    rl,
                    step: 'description',
                    exit: () => showPrompt(state),
                    taskId: state.selected.task.id, 
                });
            } else if (CREATE_COMMANDS.contains(cmd)) {
                const level = getDirLevel(state);

                if (level === 'tasklist') {
                    const description = args.length > 1 ? args.slice(1).join(' ') : null;
                    addItem({
                        rl,
                        state,
                        description,
                        level,
                        step: description === null ? "description" : "done",
                        exit: () => showPrompt(state)
                    });
                }
            }

            refreshPrompt(state)
            showPrompt(state);
        });
    }

    showPrompt(state);
}

module.exports = {
    interactiveMode,
    usage
}
