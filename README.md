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
git clone https://github.com/jamesburns-rts/teamwork-cli.git
cd teamwork-cli
npm install
node hours.js --url <teamwork base url>
node hours.js --key <teamwork api key>
```

### NPM
```
sudo npm install -g teamwork-cli
hours --url <teamwork base url>
hours --key <teamwork api key>
```

## Recommendations

To get started run the `--interactive` (`-i`) option to navigate through your projects and tasks 
to get the task IDs you need in a fake directory structure. Use `ls` to list subdirectory options
and `cd` to move into them (using either the index or id as the argument).

If in interactive mode you can use the `search` command to find tasks in subdirectories. 

I highly suggest navigating to the task you want and then mark it as a favorite
like `fav mytask` you can then use `mytask` anywhere you would normally use 
a task ID, such as `hours -E mytask` to log time. You can also navigate to the task when in 
interactive move with `cd mytask` or jump right in with `hours -i mytask`.

## Completions
The zsh tab completion system confuses me but I belive if you copy the `zsh-completions` file as `_hours` into any of the
directories in `$fpath` then you should get completions. For example
```
curl https://raw.githubusercontent.com/jamesburns-rts/teamwork-cli/master/zsh-completions > ~/.oh-my-zsh/completions/_hours
autoload -U compinit # May not be necessary
compinit # May not be necessary
```

## Usage

```
hours 1.1.17

OPTIONS

	-h, --help 
	Print this help Screen

	-v, --version 
	Print version info

	-i, --interactive [path]
	Enter interactive mode. Optionally add path to start in.

	-l, --time-logged 
	Print time logged

	-p, --tasks 
	Print a list of previous entered tasks for the year

	-q, --entries 
	Print entries of today or date specified

	-Q, --since 
	Print entries since date specified

	-f, --favorites 
	Print the list of your favorites

	-F, --favorites-full 
	Print the list of your favorites and their tasks

	-w, --percentages 
	Print percentages of time logged

	-g, --get 
	Print a peice of data

	-E, --interactive-entry [taskId]
	Enter time through questions for specified task

	-e, --entry 
	Enter time with below options

	-b, --billable [0/1]
	If billable time (default 1)

	-H, --hours [hours]
	Set hours to log (default 0)

	-M, --minutes [minutes]
	Set minutes to log (default 0)

	-d, --date [yyyymmdd]
	Set date to log for (default today)

	-m, --description [message]
	Set description to log (default empty)

	-t, --task [taskId]
	Set the taskId to log to (see --tasks)

	-T, --start-time [HH:MM]
	Set the start time to log (default 09:00)

	-O, --end-time [HH:MM]
	Set the length based on the start/end time (default empty)

	-z, --tags [tag1,tag2,tag3]
	Adds a tag to the time entry. Surround list with quotes if it includes a space

	-c, --move [EntryId]
	Move the time entry to the task specified by --task

	-k, --key [key]
	Set teamwork API key to use in the future

	-u, --url [url]
	Set teamwork URL to use in the future

	-a, --arrived [HH:MM]
	Record the time as when you arrived (default to now)

	-s, --switch [timer]
	Switch to a different timer

	-S, --startstop [timer]
	Start or stop a timer

	-D, --delete-timer [timer]
	Delete a timer

	-A, --add-timer [timer]
	Along with -H and -M adds time to a timer

	-x, --subtract-timer [timer]
	Along with -H and -M subtract from a timer

EXAMPLES

    node hours.js --entry --task 6905921 --start-time "09:00" --hours 1 \
        --minutes 30 --billable 0 --description "Friday Standup"
    Logs an hour and a half for a long Friday standup

    node hours.js -e -t 6905921 -T "09:00" -H 1 -M 30 -b 0 -m "Friday Standup"
    Same as above but using letters instead
        

INTERACTIVE MODE

This mode creates a quasi-terminal with a directory structure setup like teamwork. 
There is a top level "teamwork" directory containing a folder for each project, 
each project contains tasklists, and each tasklist contains tasks.

Once in a task you can log time. You can also create tasks/tasklists.

    EXIT: exit, quit, q, :q, :wq, leave
    Exit interactive mode.

    LIST: list, ls, l, ll
    List the contents of the item - a projects tasklists for example.

    SELECT: select, sel, cd, c, :e, enter, dir
    Select a project, tasklist, or task - aka change directory. You can change to a favorite as well.

    EDIT: edit
    Update a time entry

    MOVE: move, mv
    Move a time entry to another task

    HELP: help, h, pls, halp
    Display this information.

    LOG TIME: log, entry, record
    Log time while in a given task

    CREATE: create, mkdir, touch, make, add
    Create a new item in the entity (new task, tasklist, etc.)

    HOURS: hours, main
    Normal hours command

    PATH: path, pwd
    Display the current path using the Ids.

    ECHO: echo, cat, show, display
    Display the json of the item

    REMOVE: remove, rm, delete, del
    Delete the specified item.

    COPY: copy, cp, duplicate, dup
    Copy the specified item.

    TODAY: today
    Show logged today

    FAVORITE: favorite, fav
    Mark task as favorite: fav [PATH] name

    FAVORITES: favorites, favs, faves, favesies
    List favorites (use -v for task names)

    CLEAR: clear, cle
    Clear screen

    SEARCH: search, /, ?, find
    Searches for a task. If -e option is provided, then time entries with empty descriptions are listed.

    TOTAL: total, time, sum
    Sums the time spent on an item or items

    NOTEBOOKS: notebooks, notes, nb, books
    List the notebooks in the current dir
```
