# Teamwork CLI
Command line interface for Teamwork

This is useful for repetitive time entry into the Teamwork system. 

Javascript is not my strength so please tell me what I am doing wrong in this. Particularly how to better store the teamwork API key...

Note everything I have done below is in ubuntu which uses 'nodejs' instead of 'node'. 


## Installation

Clearly this depends on nodejs and npm. After that, clone this repo and run npm install.

This also depends on _your_ teamwork API key which can be found by:

1. Go to Teamwork
2. View your profile
3. Click 'Edit My Profile' button in top right
4. View the 'API & Mobile' tab in the popup.
5. Click 'Show Your Token'

Paste this token into the 'key' variable at the top of the hours.js script.

```
cd teamwork-cli
npm install
nodejs hours.js -h
```

## Usage

```bash
$ nodejs hours.js -h
hours 0.9.9

OPTIONS

   -h, --help 
        Print this help Screen

   -v, --version 
        Print version info

   -l, --time-logged 
        Print time logged

   -p, --tasks 
        Print a list of previous entered tasks for the year

   -q, --entries 
        Print entries of today or date specified

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

EXAMPLES

    nodejs hours.js --entry --task 6905921 --hours 1 --minutes 30 --billable 0 --description "Friday Standup"
      Logs an hour and a half for a long Friday standup

    nodejs hours.js -e -t 6905921 -H 1 -M 30 -b 0 -m "Friday Standup"
      Same as above but using letters instead
```

If you are on Linux/Mac you can make the script executable and it will probably work. I haven't tested this on Mac, but you will likely need to change the first line to point to node 'instead' of 'nodejs'.

## Recommendations
You should put commonly used entries inside bash or batch scripts so you can easily edit yesterday's and run it. Personally I have a list in a text file and run them from vim <3

To get started run the --tasks option to see a list of tasks that you have logged to this year.
