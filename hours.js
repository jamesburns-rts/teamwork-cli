#!/usr/bin/env node
const main = require('./command-mode.js');
const interactiveCommands = require('./interactive-mode.js');

main(process.argv, interactiveCommands);
