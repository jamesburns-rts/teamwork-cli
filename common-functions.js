const dateFormat = require('dateformat');
const teamwork = require('./teamwork.js');
const userData = require('./user-data.js');

/************************************************************************************
 * teamwork-cli functions
 ************************************************************************************/

const isToday = (date) => {
    return date && date.getDate() === (new Date()).getDate();
}

const getDurationString = (milliseconds) => {
    const minuteDiff = (milliseconds)/1000/60;
    const hours = Math.floor(minuteDiff/60);
    const minutes = Math.floor(minuteDiff) % 60;
    const hourStr = hours > 0 ? `${hours}h ` : '';
    return `${hourStr}${minutes}m`;
}

const getTimeSinceString = (time) => {
    const now = new Date();
    return getDurationString(now - time);
}

const getTimeArrivedString = (time) => {
    if (isToday(time)){
        return `${dateFormat(time, "H:MM")} (${getTimeSinceString(time)} ago)`;
    } else {
        return 'not set';
    }
}

const getTimerString = (id, timer) => {
    if (timer.running) {
        const duration = timer.duration + (new Date() - timer.started);
        return `Timer: ${id} has been running for ${getDurationString(duration)}`;
    } else {
        return `Timer: ${id} ran for for ${getDurationString(timer.duration)}`;
    }
}

// calculates number of work days between two dates
const workday_count = (start,end) => {
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
}

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

    timeEntries.map( entry => {
        const entryDate = new Date(entry.date);
        if (entryDate.getDate() <= today.getDate()) {

            const entryHours = parseFloat(entry.hours) + (parseFloat(entry.minutes) / 60.0);

            if (entry.isbillable == 0) {
                nonbillable += entryHours;
            }
            else {
                billable += entryHours;
            }

            if (entryDate.getDate() == today.getDate()) {
                todayHours += entryHours;
            }
        }
    }
    );

    const { arrived, timers } = userData.get();

    const total = billable + nonbillable + holiday;
    const nonPercent = Math.round(1000.0*nonbillable/total) / 10.0; 
    
    console.log(`\n    Month Required Hours: ${requiredHours + leftInMonth}`);
    console.log(`    Logged Total Hours: ${billable + nonbillable}\n`);

    console.log(`    Logged Billable Hours: ${billable}`);
    console.log(`    Logged NonBillable Hours: ${nonbillable} (${nonPercent}%)`);
    console.log(`    Remaining Monthly Hours: ${requiredHours + leftInMonth - total}\n`);

    console.log(`    Total today: ${todayHours}`);
    console.log(`    Time Started: ${getTimeArrivedString(arrived)}`);

    Object.keys(timers)
        .forEach(id => {
            if(isToday(timers[id].started)) {
                console.log('    ' + getTimerString(id, timers[id]));
            } else {
                delete timers[id];
            }
        })

    if (total > requiredHours) {
        console.log(`\nYou are ${total - requiredHours} over for today.`);
    }
    else {
        console.log(`\nYou are ${requiredHours- total } short for today.`);
    }
}

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
        .sort( (a,b) => (a.date === b.date ? 0 : (a.date > b.date ? 1 : -1)))
        .map( t => `${t['todo-item-id']}: ${t['project-name']} : ${t['todo-item-name']}`)

    new Set(descriptions).forEach( t => console.log(t) );
}

/**
 * Prints the entries for the given date
 */
const printDateEntries = (date) => {

    const timeEntries = teamwork.getTimeEntries(date, date);
    let total = 0;
    timeEntries.forEach( t => {

        const hours = (t.hours*1.0 + t.minutes/60.0);

        console.log('\n  ' + t.description);
        console.log(`    Project: ${t['project-name']}`); 
        console.log(`    TaskName: ${t['todo-item-name']}`); 
        console.log(`    TaskId: ${t['todo-item-id']}`); 
        console.log(`    Billable: ${t.isbillable == 1 ? "Yes" : "No"}`); 
        console.log(`    Hours: ${hours.toFixed(2)}`); 
        total = total + hours;
    });

    console.log('  \nTotal today: ' + total.toFixed(2));
}

/**
 * @param data must be n x m array
 */
const logTable = (data) => {

    if (data.length === 0) {
        return;
    }


    const lengths = data[0].map(d => 0);
    data.forEach(row => {
        row.forEach((col, idx) => {
            if (lengths[idx] < col.length) {
                lengths[idx] = col.length;
            }
        });
    });

    data.forEach((row, ridx) => {
        const rowStr = row.reduce((str, col, idx) => {
            const padding = ' '.repeat(lengths[idx] - col.length + 2);
            return str + col + padding;
        }, '');
        console.log(rowStr);
    });
}

const getDate = (date) => {
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
}

const printPercentages = (date) => {

    const sinceDate = getDate(date);
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

    const total = Object.keys(projects).reduce((t,key) => t + projects[key], 0);
    const twProjects = teamwork.getProjects();

    const data = Object.keys(projects).map(proj => {
        const twp = twProjects.find(p => p.id === proj);

        return [twp ? twp.name : proj, projects[proj].toFixed(1) + 'h', (100*projects[proj]/total).toFixed(1) + '%'];
    });


    const month = sinceDate.substr(4,2);
    const day = sinceDate.substr(6,2);
    console.log(`\nProject totals since ${month}/${day}\n`);
    logTable([
        ['Project', 'Total', 'Percent'], 
        ...data, 
        ['Total', total.toFixed(1) + 'h', '100.0%']]);
}

const moveTimeEntry = (entry, taskId) => {
    sendTimeEntry({ 
        taskId,
        description: entry.description, 
        date: dateFormat(new Date(entry.date), 'yyyymmdd'), 
        hours: entry.hours, 
        minutes: entry.minutes,
        isbillable: entry.isbillable 
    });
    teamwork.deleteTimeEntry(entry.id);
}

/**
 * send time entry request - if taskID is not a number then it checks
 * if it is a favorite
 */
const sendTimeEntry = (entry) => {

    if (isNaN(entry.taskId)) {
        entry.taskId = userData.get().favorites[entry.taskId];
    }

    return teamwork.sendTimeEntry(entry);
}

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
}

const stopTimer = (id) => {
    const timers = userData.get().timers;
    const timer = timers[id];
    if (timer && timer.running && isToday(timer.started)) {

        timer.duration = timer.duration + (new Date() - timer.started);
        timer.running = false;
        userData.save();
    }
}

const listFavorites = () => {
    const { favorites } = userData.get();
    const longest = Object.keys(favorites)
        .reduce((a,b) => Math.max(a, b.length), 0);

    Object.keys(favorites).forEach(name => {
        const taskId = favorites[name];
        const task = teamwork.getTask(taskId);
        const padding = name.length < longest ? ' '.repeat(longest - name.length) : '';
        console.log(`${name}: ${padding + taskId} - ${task['project-name']} / ${task['todo-list-name']} / ${task.content}`);
    });
}

module.exports = {
    sendTimeEntry,
    moveTimeEntry,
    printDateEntries,
    printPreviousTasks,
    printTimeLogged,
    printPercentages,
    startTimer,
    stopTimer,
    getDurationString,
    listFavorites
}
