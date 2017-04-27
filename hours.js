#!/usr/bin/env nodejs

const versionNo = "0.9.9";

let fetch = require('node-fetch');
let dateFormat = require('dateformat');

let key = "";
const base_url = 'https://rtslabs.teamwork.com';

if (key.length === 0) {
  console.log("ERROR: You need to get your Teamwork API key and populate it in this script.");
}

var base64 = new Buffer(key + ":xxx").toString("base64");
var getConfig = {
    method: "GET",
    headers: {
        "Authorization": "BASIC " + base64,
        "Content-Type": "application/json"
    }
};

var postConfig = {
    method: "POST",
    headers: {
        "Authorization": "BASIC " + base64,
        "Content-Type": "application/json"
    }
};

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

  // Calculates number of hours logged since given date and json
  const calcTime = (json, since) => {

    const today = new Date();
    const requiredHours = 8 * (workday_count(since, today));

    let lastDayOfMonth = new Date(today.getFullYear(), (today.getMonth() + 1) % 12, 0);
    const leftInMonth = 8 * (workday_count(today, lastDayOfMonth) - 1);

    let holiday = 0;
    let billable = 0;
    let nonbillable = 0;
    let todayHours = 0;

    json['time-entries'].map( entry => {
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

  // Given a user id, fetches the entry data
  const getTime = (userId) => {

    let date = new Date();
    date.setDate(1);
    const dateStr = dateFormat(date, "yyyymmdd");

    const url = base_url + `/time_entries.json?userId=${userId}&fromdate=${dateStr}`;
    fetch(url, getConfig)
      .then(res => res.json())
      .then(json => calcTime(json,date));
  }

  fetch(base_url + '/me.json', getConfig) .then(res => res.json())
    .then(json => getTime(json.person.id));
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Print tasks for the current year
const printPreviousTasks = () => {

  const printTasks = (json) => {
    new Set(
      json['time-entries']
      .sort( (a,b) => (a.date === b.date ? 0 : (a.date > b.date ? 1 : -1)))
      .map( t => `${t['todo-item-id']}: ${t['project-name']} : ${t['todo-item-name']}`)
    ).forEach( t => console.log(t) );
  }

  const getTasks = (userId) => {

    let date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 1);
    const dateStr = dateFormat(date, "yyyymmdd");

    const url = base_url + `/time_entries.json?userId=${userId}&fromdate=${dateStr}`;
    fetch(url, getConfig)
      .then(res => res.json())
      .then(json => printTasks(json));
  }

  fetch(base_url + '/me.json', getConfig)
    .then(res => res.json())
    .then(json => getTasks(json.person.id));
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Send a time entry request for given parameters
const sendTimeEntry = (taskId, userId, description, date, hours, minutes, isbillable) => {

  let timeEntry = {
    "time-entry": {
      "description": description,
      "person-id": userId,
      "date": date,
      "time": "9:00",
      "hours": hours,
      "minutes": minutes,
      "isbillable": isbillable,
      "tags": ""
    }
  }

  console.log(timeEntry);
  postConfig.body = JSON.stringify(timeEntry);
  fetch(`${base_url}/tasks/${taskId}/time_entries.json`, postConfig)
    .then(res => res.json())
    .then(json => console.log(json));
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Prints the entries for the given date
const printDateEntries = (date) => {

  const printEntries = (userId) => {

    const url = base_url + `/time_entries.json?userId=${userId}&fromdate=${date}&todate=${date}`;
    fetch(url, getConfig)
      .then(res => res.json())
      .then(json => 
        json['time-entries'].forEach( t => console.log(`
  ${t.description}
            
      Project: ${t['project-name']} 
      TaskName: ${t['todo-item-name']} 
      TaskId: ${t['todo-item-id']}
      Billable: ${t.isbillable == 1 ? "Yes" : "No"}
      Hours: ${(t.hours*1.0 + t.minutes/60.0).toFixed(2)}
          `))
      );
  }

  fetch(base_url + '/me.json', getConfig)
    .then(res => res.json())
    .then(json => printEntries(json.person.id));
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Parses the arguments provided to the program
const parseProgramArguments = (args) => {

  // parse arguments
  let argList = {};

  // creates an object for the arglist object
  const getArgEntry = (letter, argument, description, defaultValue) => {
    return { letter, description, argument, "provided":false, "value":defaultValue };
  }

  // help
  argList['help'] = getArgEntry('h',null,'Print this help Screen', false);
  argList['version'] = getArgEntry('v',null,'Print version info', false);

  // lists of info
  argList['time-logged'] = getArgEntry('l',null,'Print time logged', false);
  argList['tasks'] = getArgEntry('p',null,'Print a list of previous entered tasks for the year', '');
  argList['entries'] = getArgEntry('q',null,'Print entries of today or date specified', false);

  // time logging
  argList['entry'] = getArgEntry('e',null,'Enter time with below options', false);
  argList['billable'] = getArgEntry('b','[0/1]','If billable time (default 1)', true);
  argList['hours'] = getArgEntry('H','[hours]','Set hours to log (default 0)', 0);
  argList['minutes'] = getArgEntry('M','[minutes]','Set minutes to log (default 0)', 0);
  argList['date'] = getArgEntry('d','[yyyymmdd]','Set date to log for (default today)', dateFormat(new Date(), "yyyymmdd"));
  argList['description'] = getArgEntry('m','[message]','Set description to log (default empty)', '');
  argList['task'] = getArgEntry('t','[taskId]','Set the taskId to log to (see --tasks)', '');

  if (args !== undefined) {
    Object.keys(argList).forEach( key => {

      const index = Math.max(args.indexOf(`-${argList[key].letter}`), args.indexOf(`--${key}`));

      if (index > -1) {
        if (args.length > index) {
          argList[key].provided = true;
          argList[key].value = args[index+1];
        }
      }
    });
  }

  return argList;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Prints Version of utility
const printVersionInfo = () => {
  console.log(`hours ${versionNo}\n`);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Print Usage for the utility
const printUsage = () => {

  printVersionInfo();

  const argList = parseProgramArguments();

  console.log('OPTIONS');
  Object.keys(argList).forEach( key => {

    const letter = argList[key].letter;
    const description = argList[key].description;
    const optArg = argList[key].argument == null ? "" : argList[key].argument;

    // Print option, key, description
    console.log(
      `
   -${letter}, --${key} ${optArg}
      ${description}`
    )}
  );

  console.log('\nEXAMPLES');
  console.log( 
    `
   nodejs hours.js --entry --task 6905921 --hours 1 --minutes 30 --billable 0 --description "Friday Standup"
      Logs an hour and a half for a long Friday standup

   nodejs hours.js -e -t 6905921 -H 1 -M 30 -b 0 -m "Friday Standup"
      Same as above but using letters instead
    `
  );
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// "Main"
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const args = process.argv;

// if no arguments, just print time logged
if (args.length < 3) {
  printTimeLogged();
}
else {

  const argList = parseProgramArguments(args);

  // do work
  if (argList['help'].provided) {
    printUsage();
  }
  else {

    if (argList['entry'].provided) {

      fetch(base_url + '/me.json', getConfig)
        .then(res => res.json())
        .then(json => sendTimeEntry(
          argList['task'].value,
          json.person.id, 
          argList['description'].value, 
          argList['date'].value, 
          argList['hours'].value,
          argList['minutes'].value,
          argList['billable'].value
        ));
    }
    else if (argList['tasks'].provided) {
      printPreviousTasks();
    }

    if (argList['time-logged'].provided) {
      printTimeLogged();
    }

    if (argList['version'].provided) {
      printVersionInfo();
    }

    if (argList['entries'].provided) {
      printDateEntries(argList['date'].value);
    }
  }
}
