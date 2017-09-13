const readline = require('readline-sync');
const dateFormat = require('dateformat');
const teamwork = require('./teamwork.js');
const functions = require('./common-functions.js');

/************************************************************************************
 * Interactive Mode
 ************************************************************************************/

const EXIT_COMMANDS = [ 'exit', 'quit', 'q', ':q', ':wq', 'leave' ];
const DELIM = '/';

Array.prototype.contains = function ( item ) {
    return this.find(i => i === item) !== undefined;
}

const prettyJson = (json) => {
    if (json) {
        console.log(JSON.stringify(json, null, 2));
    } else {
        console.log('undefined');
    }
}

const state = {
    data: {
        projects: teamwork.getProjects(),
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

/**
 * Utility function to prompt the user for a value 
 * If no default value: '_prompt_: ', else '_prompt_[_defaultValue_]: '
 *
 * @param prompt Text to present to the user
 * @param defaultValue returned if user has no input - also is displayed after prompt
 */
const ask = (prompt, defaultValue) => {

    if (defaultValue) {
        const val = readline.question(`${prompt}[${defaultValue}]: `);
        return val.length > 0 ? val : defaultValue;
    } else {
        return readline.question(prompt + ': ');
    }
}

/**
 * Refreshes prompt stored in state based on selected items
 *
 * @param state Current state of the terminal
 */
const getPromptText = () => {

    const { project, tasklist, task, timeEntry } = state.selected;

    let prompt = '\nteamwork'

    if (project) {
        prompt = prompt +  DELIM + project.name;

        if (tasklist) {
            prompt = prompt +  DELIM + tasklist.name;

            if (task) {
                prompt = prompt +  DELIM + task.content;

                if (timeEntry) {
                    prompt = prompt +  DELIM + timeEntry.description;
                }
            }
        } 
    } 
    return '\x1b[1m' + prompt + ' > \x1b[0m';
}

/**
 * Utility function that gets the current directory level of the state (project, task, etc.)
 */
const getDirLevel = () => {
    const { project, tasklist, task, timeEntry } = state.selected;
    if (timeEntry) { return 'timeEntry'; }
    if (task) { return 'task'; }
    if (tasklist) { return 'tasklist'; }
    if (project) { return 'project'; }
    return 'top';
}

/**
 * Utility function that gets teh current directory
 */
const getCurrentDir = () => {

    const { selected } = state;
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
}

/**
 * Lists the current contents of the 'directory' (tasks in tasklist, etc)
 *
 * @param args Array of arguments with the first item being the command
 */
const ls = (args) => {

    const { data, selected } = state;

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
        data.projects.forEach((p,idx) => console.log(`${idx}) ${p.id}: ${p.name}`));

    } else if (!selected.tasklist) {

        console.log('\nTask Lists:');
        data.tasklists.forEach((t,idx) => console.log(`${idx}) ${t.id}: ${t.name}`));

    } else if (!selected.task) {

        console.log('\nTasks:');
        data.tasks.forEach((t,idx) => console.log(`${idx}) ${t.id}: ${t.content}`));
    } else if (!selected.timeEntry) {

        console.log('\nTime Entires:');
        data.timeEntries.forEach((t,idx) => console.log(`${idx}) ${t.id}: ${dateFormat(new Date(t.date), 'mm/dd/yyyy')} ${t.hours}h ${t.minutes}m - ${t.description}`));
    } 

    if (differentDir) {
        cd(['cd', originalDir]);
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
            const proj = list.find(p => p.id == arg);
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
const cd = (args) => {

    if (args.length < 2 || args[1] === DELIM || args[1] === '~') {
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
        cd(['cd'])
    }
    if (path.endsWith(DELIM)) {
        path = path.substr(0, path.length - 1);
    }

    const { selected, data } = state;

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

/**
 * Wrapper around 'cd' that allows going back
 */
let lastDir = '/';
const reversableCd = (args) => {

    const goBack = args && args.length > 1 && args[1] === '-';
    const cdArgs = goBack ? ['cd', lastDir.slice()] : args;

    lastDir = getCurrentDir();
    cd(cdArgs);
}

/**
 * Overrides the terminal to create an time entry
 */
const logTime = (args) => {

    switch(getDirLevel()) {
        case "task":

            const taskId = state.selected.task.id; 
            const dateStr = dateFormat(new Date(), "yyyymmdd");

            const description = ask('Description', '');
            const hours = ask('Hours', '8');
            const minutes = ask('Minutes', '0');
            const date = ask('Date', dateStr );
            const isbillable = ask('Is Billable', '1');

            functions.sendTimeEntry({ taskId, description, date, hours, minutes, isbillable });
            cd(['cd', '.']);
            break;

        default:
            console.log('not supported');
            break;
    }
}

/**
 * updates a time entry
 */
const updateTimeEntry = (args) => {

    let entry;


    switch(getDirLevel()) {

        case "timeEntry":
            entry = state.selected.timeEntry;
            break;
        case "task":

            if (!args || args.length < 2) {
                console.log('Provide entry id or index');
                return;
            }

            entry = findDirItem(state.data.timeEntries, args[1]);
            break;
        default:
            console.log('not supported');
            return;
    }

    if (!entry) {
        console.log('item not found');
        return;
    }
    const dateStr = dateFormat(new Date(entry.date), "yyyymmdd");

    entry.description = ask('Description', entry.description);
    entry.hours = ask('Hours', entry.hours);
    entry.minutes = ask('Minutes', entry.minutes);
    entry.date = ask('Date', dateStr);
    entry.isbillable = ask('Is Billable', entry.isbillable);

    teamwork.updateTimeEntry(entry);
    cd(['cd', '.']);
}
    
/**
 * Add item to the current directory
 */
const addItem = (args) => {

    switch(getDirLevel()) {
        case "tasklist":

            let description = args.length > 1 ? args.slice(1).join(' ') : null;

            if (!description) {
                description = readline.question('Description: ');
                if (!description) {
                    console.log('description required. Returning to prompt.');
                    return;
                }
            }
            const tasklistId = state.selected.tasklist.id;
            const resp = teamwork.addTask(tasklistId, addItemState.description);
            console.log(resp);

            state.data.tasks = teamwork.getTasks(tasklistId);
            break;
        case "task":
            logTime(args);
            break;
        default:
            console.log('not supported');
            break;
    }
}

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
}

const printInfo = (args) => {
    if (args && args.length > 1) {
        if (args[1] === 'hours') {
            functions.printTimeLogged();
        } else if (args[1] === 'logged'){
            functions.printPreviousTasks()
        } else if (args.length > 2 && args[1] === 'on') {
            functions.printDateEntries(args[2]);
        }
    } else {
        functions.printTimeLogged();
    }
}

const echoItem = (args) => {

    if (args.length > 1) {

        const originalDir = getCurrentDir();
        cd(args);
        echoItem([]);
        cd(['cd', originalDir]);

    } else {
        prettyJson(state.selected[getDirLevel()]);
    }
}

const commands = [
    {
        name: 'exit',
        aliases: EXIT_COMMANDS,
        action: (args) => {},
        description: 'Exit interactive mode.'
    },
    {
        name: 'list',
        aliases: [ 'list', 'ls', 'l', 'll' ],
        action: ls,
        description: 'List the contents of the item - a projects tasklists for example.'
    },
    {
        name: 'select',
        aliases: [ 'select', 'sel', 'cd', 'c', ':e', 'enter', 'dir' ],
        action: reversableCd,
        description: 'Select a project, tasklist, or task - aka change directory.'
    },
    {
        name: 'edit',
        aliases: [ 'edit' ],
        action: updateTimeEntry,
        description: 'Update a time entry'
    },
    {
        name: 'help',
        aliases: [ 'help', 'h', 'pls', 'halp' ],
        action: usage,
        description: 'Display this information.'
    },
    {
        name: 'log time',
        aliases: [ 'log', 'entry', 'record' ],
        action: logTime,
        description: 'Log time while in a given task'
    },
    {
        name: 'create',
        aliases: [ 'create', 'mkdir', 'touch', 'make', 'edit', 'add' ],
        action: addItem,
        description: 'Create a new item in the entity (new task, tasklist, etc.)'
    },
    {
        name: 'hours',
        aliases: [ 'hours' ],
        action: (args) => printInfo(),
        description: 'Display infromation about time already logged'
    },
    {
        name: 'print info',
        aliases: [ 'print' ],
        action: printInfo,
        description: 'Display infromation about time already logged'
    },
    {
        name: 'path',
        aliases: [ 'path', 'pwd' ],
        action: (args) => console.log(getCurrentDir()),
        description: 'Display the current path using the Ids.'
    },
    {
        name: 'echo',
        aliases: [ 'echo', 'cat', 'show', 'display' ],
        action: echoItem,
        description: 'Display the json of the item'
    }

];

/**
 * Creates an interactive terminal to view and modify teamwork data
 *
 * @param startingPath Immediately executes 'cd' on this argument
 */
const interactiveMode = (startingPath) => {

    if (startingPath) {
        reversableCd(['cd', startingPath]);
    }

    while(1) {
        
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
}

module.exports = {
    interactiveMode,
    usage
}
