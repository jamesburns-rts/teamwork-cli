const dateFormat = require('dateformat');
const teamwork = require('./teamwork.js');

/************************************************************************************
 * teamwork-cli functions
 ************************************************************************************/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Prints the time logged summary for the year
const printTimeLogged = () => {

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

    const total = billable + nonbillable + holiday;
    const nonPercent = Math.round(1000.0*nonbillable/total) / 10.0; console.log(`
    Month Required Hours: ${requiredHours + leftInMonth}
    Logged Total Hours: ${billable + nonbillable}

    Logged Billable Hours: ${billable}
    Logged NonBillable Hours: ${nonbillable} (${nonPercent}%)
    Remaining Monthly Hours: ${requiredHours + leftInMonth - total}

    Total today: ${todayHours}
            `);

    if (total > requiredHours) {
        console.log(`You are ${total - requiredHours} over for today.`);
    }
    else {
        console.log(`You are ${requiredHours- total } short for today.`);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Print tasks for the current year
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Prints the entries for the given date
const printDateEntries = (date) => {

    const timeEntries = teamwork.getTimeEntries(date, date);
    timeEntries.forEach( t => console.log(`
            ${t.description}

            Project: ${t['project-name']} 
            TaskName: ${t['todo-item-name']} 
            TaskId: ${t['todo-item-id']}
            Billable: ${t.isbillable == 1 ? "Yes" : "No"}
            Hours: ${(t.hours*1.0 + t.minutes/60.0).toFixed(2)}
            `));
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// send time entry request
const sendTimeEntry = (entry) => {
    return teamwork.sendTimeEntry(entry);
}

module.exports = {
    sendTimeEntry,
    printDateEntries,
    printPreviousTasks,
    printTimeLogged
}
