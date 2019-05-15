const dateFormat = require('dateformat');
const teamwork = require('./teamwork.js');
const userData = require('./user-data.js');

/************************************************************************************
 * teamwork-cli functions
 ************************************************************************************/

const BREAKS = ['break', 'lunch'];

const isToday = (date) => {
    return date && date.getDate() === (new Date()).getDate();
};

const getDurationString = (milliseconds) => {
    const minuteDiff = (milliseconds) / 1000 / 60;
    const hours = Math.floor(minuteDiff / 60);
    const minutes = Math.floor(minuteDiff) % 60;
    const hourStr = hours > 0 ? `${hours}h ` : '';
    return `${hourStr}${minutes}m`;
};

const getTimeWorkedString = (arrived, timers) => {
    if (isToday(arrived)) {
        let breaks = 0;
        if (timers) {
            Object.keys(timers)
                .filter(key => BREAKS.indexOf(key.toLowerCase()) >= 0)
                .forEach(key => {
                    const timer = timers[key];
                    breaks = breaks + timer.duration;
                    if (timer.running) {
                        breaks = breaks + (new Date() - timer.started);
                    }
                });
        }
        return getDurationString((new Date() - arrived) - breaks);
    } else {
        return 'not set';
    }
};

const getTimerString = (id, timer) => {
    if (timer.running) {
        const duration = timer.duration + (new Date() - timer.started);
        return `${id}: ${getDurationString(duration)} - running`;
    } else {
        return `${id}: ${getDurationString(timer.duration)}`;
    }
};

// calculates number of work days between two dates
const workday_count = (start, end) => {
    let count = 0;
    let day = new Date(start);
    let month = day.getMonth();
    while (day.getDate() <= end.getDate() && month === day.getMonth()) {
        if (day.getDay() !== 6 && day.getDay() !== 0) {
            ++count;
        }
        day.setDate(day.getDate() + 1);
    }
    return count;
};

/**
 * Prints the time logged summary for the month
 */
const printTimeLogged = () => {

    let date = new Date();
    date.setDate(1);
    const dateStr = dateFormat(date, "yyyymmdd");

    const timeEntries = teamwork.getTimeEntries(dateStr);

    const today = new Date();
    const requiredHours = 8 * (workday_count(date, today));

    let lastDayOfMonth = new Date(today.getFullYear(), (today.getMonth() + 1) % 12, 0);
    const leftInMonth = 8 * (workday_count(today, lastDayOfMonth) - 1);

    let holiday = 0;
    let billable = 0;
    let nonbillable = 0;
    let todayHours = 0;

    timeEntries.map(entry => {
        const entryDate = new Date(entry.date);
        if (entryDate.getDate() <= today.getDate()) {

            const entryHours = parseFloat(entry.hours) + (parseFloat(entry.minutes) / 60.0);

            if (Number(entry.isbillable) === 0) {
                nonbillable += entryHours;
            } else {
                billable += entryHours;
            }

            if (entryDate.getDate() === today.getDate()) {
                todayHours += entryHours;
            }
        }
    });

    const {
        arrived,
        timers
    } = userData.get();
    Object.keys(timers)
        .filter(id => !isToday(timers[id].started))
        .forEach(id => delete timers[id]);

    const total = billable + nonbillable + holiday;
    const percent = Math.round(1000.0 * billable / (requiredHours + leftInMonth)) / 10.0;

    console.log(`\n    Month Required Hours: ${requiredHours + leftInMonth}`);
    console.log(`    Month Logged Hours: ${billable + nonbillable}\n`);

    console.log(`    Month Billable Hours: ${billable} (${percent}%)`);
    console.log(`    Month NonBillable Hours: ${nonbillable}\n`);

    console.log(`    Time worked: ${getTimeWorkedString(arrived, timers)}`);
    console.log(`    Logged today: ${getDurationString(todayHours * 3600000)}\n`);

    Object.keys(timers).forEach(id => console.log('    ' + getTimerString(id, timers[id])));

    if (total > requiredHours) {
        console.log(`\nYou are ${total - requiredHours} over for today.`);
    } else {
        console.log(`\nYou are ${requiredHours - total} short for today.`);
    }
};

/**
 * Print tasks for the current year
 */
const printPreviousTasks = () => {

    let date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 1);
    const dateStr = dateFormat(date, "yyyymmdd");

    const tasks = teamwork.getTimeEntries(dateStr);
    const descriptions = tasks
        .sort((a, b) => (a.date === b.date ? 0 : (a.date > b.date ? 1 : -1)))
        .map(t => `${t['todo-item-id']}: ${t['project-name']} : ${t['todo-item-name']}`);

    new Set(descriptions).forEach(t => console.log(t));
};

/**
 * Prints the entries for the given date
 */
const printDateEntries = (date) => {

    const timeEntries = teamwork.getTimeEntries(date, date);
    let total = 0;
    timeEntries.forEach(t => {

        const hours = (t.hours * 1.0 + t.minutes / 60.0);

        console.log('\n  ' + t.description);
        console.log(`    Project: ${t['project-name']}`);
        console.log(`    TaskName: ${t['todo-item-name']}`);
        console.log(`    TaskId: ${t['todo-item-id']}`);
        console.log(`    Billable: ${Number(t.isbillable) === 1 ? "Yes" : "No"}`);
        console.log(`    Hours: ${hours.toFixed(2)}`);
        total = total + hours;
    });

    console.log('  \nTotal: ' + total.toFixed(2));
};

/**
 * @param data must be n x m array
 */
const logTable = (data) => {

    if (data.length === 0) {
        return;
    }


    const lengths = data[0].map(() => 0);
    data.forEach(row => {
        row.forEach((col, idx) => {
            if (lengths[idx] < col.length) {
                lengths[idx] = col.length;
            }
        });
    });

    data.forEach(row => {
        const rowStr = row.reduce((str, col, idx) => {
            const padding = ' '.repeat(lengths[idx] - col.length + 2);
            return str + col + padding;
        }, '');
        console.log(rowStr);
    });
};

const getSinceDate = (date) => {
    if (!date || date.toLowerCase() === 'week') {
        const sunday = new Date();
        sunday.setDate(sunday.getDate() - sunday.getDay());
        return dateFormat(sunday, 'yyyymmdd');
    } else if (date.toLowerCase() === 'month') {
        const theFirst = new Date();
        theFirst.setDate(1);
        return dateFormat(theFirst, 'yyyymmdd');
    } else {
        return date;
    }
};

const printPercentages = (date) => {

    const sinceDate = getSinceDate(date);
    const timeEntries = teamwork.getTimeEntries(
        sinceDate, dateFormat(new Date(), 'yyyymmdd'));

    const projects = {};
    timeEntries.forEach(entry => {
        const currentHours = projects[entry['project-id']];
        let hours = currentHours ? currentHours : 0;

        hours += Number(entry.hours);
        hours += Number(entry.minutes) / 60.0;

        projects[entry['project-id']] = hours;
    });

    const total = Object.keys(projects).reduce((t, key) => t + projects[key], 0);
    const twProjects = teamwork.getProjects();

    const data = Object.keys(projects).map(proj => {
        const twp = twProjects.find(p => p.id === proj);

        return [twp ? twp.name : proj, projects[proj].toFixed(1) + 'h', (100 * projects[proj] / total).toFixed(1) + '%'];
    });


    const month = sinceDate.substr(4, 2);
    const day = sinceDate.substr(6, 2);
    console.log(`\nProject totals since ${month}/${day}\n`);
    logTable([
        ['Project', 'Total', 'Percent'],
        ...data, ['Total', total.toFixed(1) + 'h', '100.0%']
    ]);
};

const moveTimeEntry = (entry, taskId) => {
    console.log('tags: ', entry.tags);
    sendTimeEntry({
        taskId,
        description: entry.description,
        date: dateFormat(new Date(entry.date), 'yyyymmdd'),
        hours: entry.hours,
        minutes: entry.minutes,
        isbillable: entry.isbillable,
        tags: entry.tags.map(t => t.name),
    });
    teamwork.deleteTimeEntry(entry.id);
};

/**
 * Search for tasks using given searchTerm
 * @param searchTerm text to search for
 * @param projectId (optional) limit search to project
 * @param taskListId (optional) limit search to task list
 */
const searchForTask = (searchTerm, projectId, taskListId) => {
    return teamwork.searchForTask(searchTerm, projectId, taskListId);
};

/**
 * Tests if string is of format yyyymmdd
 */
const isDateString = (str) => {
    return /^\s*(20\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01]))\s*$/.test(str);
};

const DAYS_OF_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const getOffsetOfPrevious = (dayOfWeek) => {
    dayOfWeek = DAYS_OF_WEEK.indexOf(dayOfWeek.toLowerCase().substr(0, 3));
    if (dayOfWeek <= 0) {
        console.warn("Day of week must start with " + DAYS_OF_WEEK);
        return 0;
    }

    let offset = dayOfWeek - (new Date()).getDay();

    if (offset >= 0) {
        offset -= 7;
    }

    return offset;
};

const getDateString = (str) => {

    if (isDateString(str)) {
        return str;
    }

    str = str.trim().toLowerCase();

    let offset = 0;
    if (/^[-+]?\d+$/.test(str)) {
        offset = Number(str);
    } else if (str.startsWith("yest")) { // yesterday
        offset = -1;
    } else if (str.startsWith("tom")) { // tomorrow
        offset = 1;
    } else if (str.startsWith("tod")) { // today
        offset = 0;
    } else if (str.startsWith("next")) { // next <day of week>
        offset = (getOffsetOfPrevious(str.split(' ')[1]) + 7) || 7;
    } else if (str.startsWith("last ")) { // last <day of week>
        offset = getOffsetOfPrevious(str.split(' ')[1]);
    } else if (DAYS_OF_WEEK.indexOf(str.substr(0, 3) >= 0)) { // same as last day of week
        offset = getOffsetOfPrevious(str);
    } else {
        console.warn("Unrecognized date. Using today.");
    }

    // get the date
    const date = new Date();
    if (offset > 1000 || offset < -1000) {
        console.warn("Variable date out of range. Using today.");
    } else {
        date.setDate(date.getDate() + offset);
    }

    return dateFormat(date, "yyyymmdd");
};

/**
 * send time entry request - if taskID is not a number then it checks
 * if it is a favorite
 */
const sendTimeEntry = (entry) => {

    if (isNaN(entry.taskId)) {
        entry.taskId = userData.get().favorites[entry.taskId];
    }
    entry.date = getDateString(entry.date);
    if (entry.tags) {
        entry.tags = entry.tags.join(',');
    }

    return teamwork.sendTimeEntry(entry);
};

const getLastTask = (taskId) => {
    if (!taskId) {
        return teamwork.getLastTimeEntry();
    } else {
        if (isNaN(taskId)) {
            taskId = userData.get().favorites[taskId];
            return teamwork.getLastTimeEntryForTask(taskId);
        }
    }
};

const startTimer = (id) => {
    const timers = userData.get().timers;
    const timer = timers[id];
    if (!timer || !isToday(timer.started)) {
        timers[id] = {
            started: new Date(),
            running: true,
            duration: 0
        }
    } else if (!timer.running) {
        timer.started = new Date();
        timer.running = true;
    }
    userData.save();
};

const stopTimer = (id) => {
    const timers = userData.get().timers;
    const timer = timers[id];
    if (timer && timer.running && isToday(timer.started)) {

        timer.duration += new Date() - timer.started;
        timer.running = false;
        userData.save();
    }
};

const modifyTimer = (id, hours, minutes) => {
    const timers = userData.get().timers;
    if (id && timers[id] && (hours !== 0 || minutes !== 0)) {
        const timer = timers[id];
        timer.duration += hours * 3600000;
        timer.duration += minutes * 60000;
        userData.save();
        return timer.duration;
    } else {
        console.log('Timer ' + id + ' not found');
        return 0;
    }
};

const listFavorites = (verbose) => {

    const {
        favorites
    } = userData.get();

    if (!verbose) {
        console.log(Object.keys(favorites).join('\n'));
    } else {
        const longest = Object.keys(favorites)
            .reduce((a, b) => Math.max(a, b.length), 0);

        Object.keys(favorites).forEach(name => {
            const taskId = favorites[name];
            const task = teamwork.getTask(taskId);
            const padding = name.length < longest ? ' '.repeat(longest - name.length) : '';
            console.log(`${name}: ${padding + taskId} - ${task['project-name']} / ${task['todo-list-name']} / ${task.content}`);
        });
    }
};

const listTimers = () => {

    const {
        timers
    } = userData.get();

    console.log(Object.keys(timers).join('\n'));
};

const parseDateYYYYMMDD = (str) => {
    if (!str || str.length !== 8) {
        return null;
    }

    const year = Number(str.substr(0, 4));
    const month = Number(str.substr(4, 2));
    const day = Number(str.substr(6, 2));

    return new Date(year, month - 1, day);
};

const printItem = (str) => {
    if (!str) {
        str = 'time-worked';
    }

    const {
        arrived,
        timers
    } = userData.get();

    switch (str.toLowerCase()) {
        case 'time-worked':
            console.log(getTimeWorkedString(arrived, timers));
            break;
        case 'timers':
            if (timers) {
                console.log(
                    Object.keys(timers)
                        .filter(key => timers[key].running)
                        .map(key => {
                            const timer = timers[key];
                            const duration = timer.duration + (new Date() - timer.started);
                            return `${key}: ${getDurationString(duration)}`;
                        }).join(', ')
                );
            }
            break;

    }
};

module.exports = {
    getDateString,
    getDurationString,
    getLastTask,
    getSinceDate,
    listFavorites,
    listTimers,
    modifyTimer,
    moveTimeEntry,
    parseDateYYYYMMDD,
    printDateEntries,
    printItem,
    printPercentages,
    printPreviousTasks,
    printTimeLogged,
    searchForTask,
    sendTimeEntry,
    startTimer,
    stopTimer,
};
