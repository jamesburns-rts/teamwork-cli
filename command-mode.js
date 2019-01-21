
/************************************************************************************
 * Main script - parses arguments
 ************************************************************************************/
const versionNo = "1.1.16";

const dateFormat = require('dateformat');
const functions = require('./common-functions.js');
const userData = require('./user-data.js');
const teamwork = require('./teamwork.js');

/**
 * Parses the arguments provided to the program
 *
 * @param args Array of program arguments
 */
const parseProgramArguments = (args) => {

    // parse arguments
    let argList = {};

    // creates an object for the arglist object
    const getArgEntry = (letter, argument, description, defaultValue) => {
        return {letter, argument, description, "provided": false, "value": defaultValue};
    };

    // help
    argList['help'] = getArgEntry('h', null, 'Print this help Screen', false);
    argList['version'] = getArgEntry('v', null, 'Print version info', false);

    // interactive
    argList['interactive'] = getArgEntry('i', '[path]', 'Enter interactive mode. Optionally add path to start in.', '.');

    // lists of info
    argList['time-logged'] = getArgEntry('l', null, 'Print time logged', false);
    argList['tasks'] = getArgEntry('p', null, 'Print a list of previous entered tasks for the year', '');
    argList['entries'] = getArgEntry('q', null, 'Print entries of today or date specified', dateFormat(new Date(), "yyyymmdd"));
    argList['since'] = getArgEntry('Q', null, 'Print entries since date specified', 'week');
    argList['favorites'] = getArgEntry('f', null, 'Print the list of your favorites', false);
    argList['favorites-full'] = getArgEntry('F', null, 'Print the list of your favorites and their tasks', false);
    argList['percentages'] = getArgEntry('w', null, 'Print percentages of time logged', 'week');
    argList['get'] = getArgEntry('g', null, 'Print a peice of data', 'time-worked');

    // time logging
    argList['interactive-entry'] = getArgEntry('E', '[taskId]', 'Enter time through questions for specified task', '');
    argList['entry'] = getArgEntry('e', null, 'Enter time with below options', false);
    argList['billable'] = getArgEntry('b', '[0/1]', 'If billable time (default 1)', true);
    argList['hours'] = getArgEntry('H', '[hours]', 'Set hours to log (default 0)', 0);
    argList['minutes'] = getArgEntry('M', '[minutes]', 'Set minutes to log (default 0)', 0);
    argList['date'] = getArgEntry('d', '[yyyymmdd]', 'Set date to log for (default today)', dateFormat(new Date(), "yyyymmdd"));
    argList['description'] = getArgEntry('m', '[message]', 'Set description to log (default empty)', '');
    argList['task'] = getArgEntry('t', '[taskId]', 'Set the taskId to log to (see --tasks)', '');
    argList['start-time'] = getArgEntry('T', '[HH:MM]', 'Set the start time to log (default 09:00)', '09:00');
    argList['end-time'] = getArgEntry('O', '[HH:MM]', 'Set the length based on the start/end time (default empty)', '');
    argList['tags'] = getArgEntry('z', '[tag1,tag2,tag3]', 'Adds a tag to the time entry. Surround list with quotes if it includes a space', '');
    argList['move'] = getArgEntry('c', '[EntryId]', 'Move the time entry to the task specified by --task', null);

    // persistence
    argList['key'] = getArgEntry('k', '[key]', 'Set teamwork API key to use in the future', '');
    argList['url'] = getArgEntry('u', '[url]', 'Set teamwork URL to use in the future', '');
    argList['arrived'] = getArgEntry('a', '[HH:MM]', 'Record the time as when you arrived (default to now)', new Date());
    argList['switch'] = getArgEntry('s', '[timer]', 'Switch to a different timer', '');
    argList['startstop'] = getArgEntry('S', '[timer]', 'Start or stop a timer', '');
    argList['delete-timer'] = getArgEntry('D', '[timer]', 'Delete a timer', '');
    argList['add-timer'] = getArgEntry('A', '[timer]', 'Along with -H and -M adds time to a timer', '');
    argList['subtract-timer'] = getArgEntry('x', '[timer]', 'Along with -H and -M subtract from a timer', '');

    if (args !== undefined) {
        Object.keys(argList).forEach(key => {

            const index = Math.max(args.indexOf(`-${argList[key].letter}`), args.indexOf(`--${key}`));

            if (index > -1) {
                if (args.length > index) {
                    argList[key].provided = true;
                    if (args.length > index + 1 && !args[index + 1].startsWith('-')) {
                        argList[key].value = args[index + 1];
                    }
                }
            }
        });
    }

    return argList;
};

/**
 * Prints Version of program
 */
const printVersionInfo = () => {
    console.log(`hours ${versionNo}\n`);
};

/**
 * Print Usage for the utility
 */
const printUsage = (interactiveUsage) => {

    printVersionInfo();

    const argList = parseProgramArguments();

    console.log('OPTIONS');
    Object.keys(argList).forEach(key => {

            const letter = argList[key].letter;
            const description = argList[key].description;
            const optArg = argList[key].argument == null ? "" : argList[key].argument;

            // Print option, key, description
            console.log('\n\t' + `-${letter}, --${key} ${optArg}` + '\n\t' + description)
        }
    );

    console.log('\nEXAMPLES');
    console.log(`
    node hours.js --entry --task 6905921 --start-time "09:00" --hours 1 --minutes 30 --billable 0 --description "Friday Standup"
    Logs an hour and a half for a long Friday standup

    node hours.js -e -t 6905921 -T "09:00" -H 1 -M 30 -b 0 -m "Friday Standup"
    Same as above but using letters instead
        `
    );

    console.log('\nINTERACTIVE MODE\n');
    interactiveUsage();
};

const persistKey = (key) => {
    if (typeof key === 'string' && key.length > 0) {
        userData.get().teamwork.key = key;
        userData.save();
    }
};

const persistUrl = (url) => {
    if (typeof url === 'string' && url.length > 0) {
        userData.get().teamwork.url = url;
        userData.save();
    }
};

const persistStartTime = (time) => {

    const data = userData.get();
    if (typeof time === 'string' && time !== 'now') {
        const overrides = time.split(':');
        const date = new Date();
        date.setHours(overrides[0]);
        date.setMinutes(overrides[1]);

        data.arrived = date;
    } else {
        data.arrived = time;
    }
    console.log('Marking that you arrived at ' + data.arrived);
    userData.save();
};

const getTimeDiff = (startTime, endTime) => {
    const startColon = startTime.indexOf(':');
    const endColon = endTime.indexOf(':');
    const startHour = Number(startTime.substring(0, startColon));
    const startMinute = Number(startTime.substring(startColon + 1, 5));
    const endHour = Number(endTime.substring(0, endColon));
    const endMinute = Number(endTime.substring(endColon + 1, 5));

    const value = {
        hours: endHour - startHour,
        minutes: endMinute - startMinute
    };

    if (value.hours < 0) {
        value.hours += 12;
    }
    if (value.minutes < 0) {
        value.hours -= 1;
        value.minutes += 60;
    }
    return value;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// "Main"
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const main = (args, interactiveCommands) => {
    try {

        const {interactiveMode, logTimeInteractive, usage} = interactiveCommands;

        const data = userData.get();

        // if no arguments, just print time logged
        if (args.length < 3) {
            functions.printTimeLogged();
        }
        else {

            const argList = parseProgramArguments(args);

            // do work
            if (argList['help'].provided) {
                printUsage(usage);
            }
            else {

                if (argList['key'].provided) {
                    persistKey(argList['key'].value);
                }

                if (argList['url'].provided) {
                    persistUrl(argList['url'].value);
                }

                if (argList['arrived'].provided) {
                    persistStartTime(argList['arrived'].value);
                }

                if (argList['startstop'].provided) {

                    const timers = userData.get().timers;

                    const id = argList['startstop'].value;
                    if (id && id.length > 0) {
                        const timer = userData.get().timers[id];
                        if (timer) {
                            if (timer.running) {
                                functions.stopTimer(id);
                                const length = functions.getDurationString(timer.duration);
                                console.log(`Timer ${id} stopped at ${length}.`);
                            } else {
                                functions.startTimer(id);
                                const {started} = userData.get().timers[id];
                                const length = functions.getDurationString(timer.duration);
                                console.log(`Timer ${id} resumed from ${length} at ${started}.`);
                            }
                        } else {
                            functions.startTimer(id);
                            const {started} = userData.get().timers[id];
                            console.log(`Recorded start time for ${id} as ${started}.`);
                        }
                    } else {
                        // stop all timers
                        Object.keys(timers).forEach(t => {
                            if (timers[t].running) {
                                functions.stopTimer(t);
                                const tlength = functions.getDurationString(timers[t].duration);
                                console.log(`Timer ${t} stopped at ${tlength}.`);
                            }
                        });
                    }
                }

                if (argList['switch'].provided) {

                    const timers = userData.get().timers;

                    const id = argList['switch'].value;
                    let wasRunning = false;

                    // stop all timers
                    Object.keys(timers)
                        .filter(t => timers[t].running)
                        .forEach(t => {
                            functions.stopTimer(t);
                            const tlength = functions.getDurationString(timers[t].duration);
                            console.log(`Timer ${t} stopped at ${tlength}.`);

                            if (t === id) {
                                wasRunning = true;
                            }
                        });

                    if (!wasRunning && id && id.length > 0) {
                        functions.startTimer(id);
                        const {started, duration} = userData.get().timers[id];
                        if (duration > 0) {
                            const tlength = functions.getDurationString(duration);
                            console.log(`Timer ${id} resumed from ${tlength} at ${started}.`);
                        } else {
                            console.log(`Timer ${id} started at ${started}.`);
                        }
                    }
                }

                if (argList['delete-timer'].provided) {
                    const timers = userData.get().timers;
                    const id = argList['delete-timer'].value;
                    if (id && timers[id]) {
                        const tlength = functions.getDurationString(timers[id].duration);
                        delete timers[id];
                        console.log(`Deleted timer ${id} at ${tlength}`);
                    } else {
                        console.log(`Unable to find timer ${id} to delete`);
                    }
                }

                if (argList['add-timer'].provided) {
                    const id = argList['add-timer'].value;
                    const hours = Number(argList['hours'].value);
                    const minutes = Number(argList['minutes'].value);
                    const duration = functions.modifyTimer(id, hours, minutes);
                    console.log(`${id}: ${functions.getDurationString(duration)}`)
                }

                if (argList['subtract-timer'].provided) {
                    const id = argList['subtract-timer'].value;
                    const hours = -Number(argList['hours'].value);
                    const minutes = -Number(argList['minutes'].value);
                    const duration = functions.modifyTimer(id, hours, minutes);
                    console.log(`${id}: ${functions.getDurationString(duration)}`)
                }

                if (argList['interactive-entry'].provided) {
                    const resp = logTimeInteractive(argList['interactive-entry'].value);
                    console.log(resp);
                }
                else if (argList['entry'].provided) {

                    let hours = 0, minutes = 0;
                    if (argList['start-time'].provided && argList['end-time'].provided) {
                        const diff = getTimeDiff(argList['start-time'].value, argList['end-time'].value);
                        hours = diff.hours;
                        minutes = diff.minutes;
                    }
                    if (argList['hours'].provided) {
                        hours = argList['hours'].value;
                    }
                    if (argList['minutes'].provided) {
                        minutes = argList['minutes'].value;
                    }

                    const resp = functions.sendTimeEntry({
                        taskId: argList['task'].value,
                        description: argList['description'].value,
                        date: argList['date'].value,
                        hours: hours,
                        minutes: minutes,
                        isbillable: argList['billable'].value,
                        time: argList['start-time'].value,
                        tags: argList['tags'].value.split(','),
                    });
                    console.log(resp);
                }
                else if (argList['tasks'].provided) {
                    functions.printPreviousTasks();

                } else if (argList['move'].provided && argList['task'].provided) {
                    const entry = teamwork.getTimeEntry(argList['move'].value);
                    functions.moveTimeEntry(entry, argList['task'].value);
                }

                if (argList['time-logged'].provided) {
                    functions.printTimeLogged();
                }

                if (argList['percentages'].provided) {
                    functions.printPercentages(argList['percentages'].value);
                }

                if (argList['get'].provided) {
                    functions.printItem(argList['get'].value);
                    // escape for saving data
                    return;
                }

                if (argList['version'].provided) {
                    printVersionInfo();
                }

                if (argList['entries'].provided) {
                    functions.printDateEntries(argList['entries'].value);
                }

                if (argList['since'].provided) {
                    const dateStr = functions.getSinceDate(argList['since'].value);
                    const date = functions.parseDateYYYYMMDD(dateStr);
                    const today = new Date();
                    while (date < today) {
                        console.log('\n\nDate: ' + date);
                        functions.printDateEntries(dateFormat(date, "yyyymmdd"));
                        date.setDate(date.getDate() + 1);
                    }
                }

                if (argList['favorites'].provided) {
                    functions.listFavorites();
                }

                if (argList['favorites-full'].provided) {
                    functions.listFavorites(true);
                }

                if (argList['interactive'].provided && interactiveMode) {
                    interactiveMode(argList['interactive'].value);
                }
            }
        }

        userData.save(data);
    } catch (e) {
        console.log(e);
    }
};

module.exports = main;

