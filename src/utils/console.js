const chalk = require('chalk');

var oldlog = console.log;

require('console-stamp')(console, { pattern: 'yyyy-mm-dd HH:MM:ss.l',
  // we want date to start from the beginning of the line, thus \r
	datePrefix: '\r[',
	dateSuffix: ']',
	colors: {
        stamp: 'grey',
        label: 'white',
        metadata: 'green'
    },
	label: false,
	include: ['log','debug', 'info', 'yellow', 'green', 'white', 'ok', 'warn', 'error', 'fatal']
});

// just in case
const transform = msg => msg;

var olderror = console.error;
console.error = function(msg) {
    olderror(chalk.red(transform(msg)));
}
var oldwarn = console.error;
console.warn = function(msg) {
    oldwarn(chalk.yellow(transform(msg)));
}
console.yellow = function(msg) {
    oldwarn(chalk.yellow.bold(transform(msg)));
}
console.green = function(msg) {
    oldwarn(chalk.green.bold(transform(msg)));
}
console.white = function(msg) {
    oldwarn(chalk.white.bold(transform(msg)));
}
console.ok = function(msg) {
    console.log(chalk.green(transform(msg)));
}
console.debug = function(msg) {
	console.log(chalk.grey.bold(transform(msg)));
}
console.info = function(msg) {
	console.log(chalk.blue.bold(transform(msg)));
}
console.fatal = function(msg) {
	console.log(chalk.red.bold(transform(msg)));
}
// no timestamp
console.raw = function(msg) {
	oldlog(transform(msg));
}

console.testConsole = () => {
	console.raw("=========================== Begin Console test output ===========================")
	console.log("console.log");
	console.debug("console.debug");
	console.info("console.info ");
	console.ok("console.ok");
	console.error('console.error')
	console.warn('console.warning')
	console.fatal('console.fatal')
	console.raw("console.raw");
	console.yellow("console.yellow ");
	console.green("console.green ");
	console.white("console.white ");
	console.raw("============================ End Console test output ============================")
}

exports = function() {
}