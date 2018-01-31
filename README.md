# Teamwork CLI
Command line interface for Teamwork

This is useful for repetitive time entry into the Teamwork system: https://www.teamwork.com/time-tracking 

## Installation

Clearly this depends on nodejs and npm. Get your teamwork credentials then you can either clone the repo to install or use npm.


### Credentials
This also depends on _your_ teamwork API key and URL. The url is the base of your teamwork
website, for example https://mycompany.teamwork.com. The API key can be found by:

1. Go to Teamwork
2. View your profile
3. Click 'Edit My Profile' button in top right
4. View the 'API & Mobile' tab in the popup.
5. Click 'Show Your Token'

### Cloning

```
$ git clone https://github.com/jamesburns-rts/teamwork-cli.git
$ cd teamwork-cli
$ npm install
$ node hours.js --url <teamwork base url>
$ node hours.js --key <teamwork api key>
```

### NPM
```
$ sudo npm install -g teamwork-cli
$ hours --url <teamwork base url>
$ hours --key <teamwork api key>
```

Try out running `hours` or `hours -i` and check out the suggestions at the bottom to get started.

## Usage

```
hours 1.1.3

OPTIONS

    -h, --help Print this help Screen

    -v, --version Print version info

    -i, --interactive [path] Enter interactive mode. Optionally add path to
    start in.

    -l, --time-logged Print time logged

    -p, --tasks Print a list of previous entered tasks for the year

    -q, --entries Print entries of today or date specified

    -Q, --since Print entries since date specified

    -f, --favorites Print the list of your favorites (saved in interactive mod)

    -w, --percentages Print percentages of time logged

    -g, --get Print a peice of data

    -E, --interactive-entry [taskId] Enter time through questions for specified
    task

    -e, --entry Enter time with below options

    -b, --billable [0/1] If billable time (default 1)

    -H, --hours [hours] Set hours to log (default 0)

    -M, --minutes [minutes] Set minutes to log (default 0)

    -d, --date [yyyymmdd] Set date to log for (default today)

    -m, --description [message] Set description to log (default empty)

    -t, --task [taskId] Set the taskId to log to (see --tasks)

    -T, --start-time [HH:MM] Set the start time to log (default 09:00)

    -c, --move [EntryId] Move the time entry to the task specified by --task

    -k, --key [key] Set teamwork API key to use in the future

    -u, --url [url] Set teamwork URL to use in the future

    -a, --arrived [HH:MM] Record the time as when you arrived (default to now)

    -s, --switch [timer] Switch to a different timer

    -S, --startstop [timer] Start or stop a timer

EXAMPLES

    node hours.js --entry --task 6905921 --start-time "09:00" --hours 1
    --minutes 30 --billable 0 --description "Friday Standup" Logs an hour and a
    half for a long Friday standup

    node hours.js -e -t 6905921 -T "09:00" -H 1 -M 30 -b 0 -m "Friday Standup"
    Same as above but using letters instead
        

INTERACTIVE MODE

This mode creates a quasi-terminal with a directory structure setup like
teamwork. There is a top level "teamwork" directory containing a folder for
each project, each project contains tasklists, and each tasklist contains
tasks.

Once in a task you can log time. You can also create tasks/tasklists.

    EXIT: exit, quit, q, :q, :wq, leave Exit interactive mode.

    LIST: list, ls, l, ll List the contents of the item - a projects tasklists
    for example.

    SELECT: select, sel, cd, c, :e, enter, dir Select a project, tasklist, or
    task - aka change directory.

    EDIT: edit Update a time entry

    MOVE: move, mv Move a time entry to another task

    HELP: help, h, pls, halp Display this information.

    LOG TIME: log, entry, record Log time while in a given task

    CREATE: create, mkdir, touch, make, edit, add Create a new item in the
    entity (new task, tasklist, etc.)

    HOURS: hours Display infromation about time already logged

    PRINT INFO: print Display infromation about time already logged

    PATH: path, pwd Display the current path using the Ids.

    ECHO: echo, cat, show, display Display the json of the item

    REMOVE: remove, rm, delete, del Delete the specified item.

    COPY: copy, cp, duplicate, dup Copy the specified item.

    TODAY: today Show logged today

    FAVORITE: favorite, fav Mark task as favorite: fav [PATH] name

    FAVORITES: favorites, favs, faves List favorites

    CLEAR: clear, cle Clear screen
```

## Recommendations
You should put commonly used entries inside bash or batch scripts so you can easily edit 
yesterday's and run it. Personally I have a list in a text file and run them from vim <3

To get started run the --interactive option to navigate through your projects and tasks 
to get the task IDs you need. 

I highly suggest navigating to the task you want and then mark it as a favorite
like `fav mytask` you can then use `mytask` anywhere you would normally use 
a task ID, such as `hours -E mytask` to log time.
