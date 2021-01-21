/**
 * Logger module
 * 
 * @module core/log/logger
 */
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const tracer = require('tracer');
const helper = require('./helper')

// optional format:
// `{{timestamp}} {{method}} ({{file}}:{{line}}) {{tag}} {{message}}`
const defaultColors = {
  'timestamp': 'grey.bold',
  'debug': 'grey.bold',
  'warn': 'yellow',
  'error': 'red.bold',
  'fatal': 'bgRed.black',
  'info': 'blue.bold',
}

const defaultTagColors = {
  'config': 'blue.bold',
  'app': 'green',
}

const colorize = (what, color) => {
  if(!what || !color) return what;
  if(typeof color !== 'string') return what;
  var cols = color.split('.').reverse();
  for(var c of cols) {
    if(typeof chalk[c] === 'function') what = chalk[c](what);
  }
  // make sure it is not randomly bold, unless it has to be bold
  // 22 is 'Normal color or intensity' as per https://en.wikipedia.org/wiki/ANSI_escape_code#Unix-like_systems
  //if(cols.indexOf('bold') == -1) what = '\u001B[1;22m' + what;
  return what;
}

const tagcolor = (tag, config) => {
  if(typeof config.log.colorize.tag === 'string') return config.log.colorize.tag;
  if(!(tag && config)) return defaultTagColors[tag];
  if(typeof config.log.colorize.tag === 'object') {
    if(typeof config.log.colorize.tag[tag] === 'string') return config.log.colorize.tag[tag];
    return config.log.colorize.tag[tag] || defaultTagColors[tag];
  }
  return defaultTagColors[tag];
}

const stripColors = (what) => {
  return what.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

class Logger {
  constructor(app) {
    this.app = app;
    this.config = app.config || {};
    this.config.log = this.config.log || {};
    this.config.log.colorize = this.config.log.colorize || {};

    const methods = ['debug', 'log', 'raw', 'trace', 'info', 'warn', 'error', 'fatal'];
    var loglevel = 'log';
    if(this.config.log.loglevel && methods.indexOf(this.config.log.loglevel) != -1) loglevel = this.config.log.loglevel;

    this.logger = tracer.console({
      level: loglevel,
      methods : methods,
      dateformat: this.config.log.dateformat || 'yyyy-mm-dd HH:MM:ss.l',
      format : [
        this.config.log.format || `{{timestamp}} {{tag}} {{message}}`,
        {
          'raw': `{{message}}`,
        },
      ],
      transport: [
        // console output transport   
        (data) => {
          if(this.config.log.terminal === false) return;
          if(this.config.log.nocolors) return console.log('\r' + data.output);
          var fn = console.log;
          if(['error','fatal'].indexOf(data.title) != -1) fn = console.error;
          fn('\r' + data.output);
        },
        // file transport
        (data) => {
          if(!this.config.log.file) return;
          var filename = '';
          try {
            if(this.config.log.file === true) filename = path.join('logs', 'atomminer.log');
            else if(typeof this.config.log.file === 'string') filename = path.join('logs', this.config.log.file);
            else { // todo: per-file logging options
              return;
            }
            if(!filename) return;
            filename = path.resolve(path.join(this.app.appfolder, filename));
            fs.ensureFileSync(filename);
            fs.appendFile(filename, stripColors(data.rawoutput) + (this.config.log.eol || '\r\n'));
          }
          catch(e) {
            this.error('logger', e.message);
          }
        },
        // // RPC/network transport
        // (data) => {
        // },
      ],
      preprocess: (data) => {
        // re-do stack. do we want method name no matter what?
        if(data.stack) {
          var stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/i;
          var stackReg2 = /at\s+()(.*):(\d*):(\d*)/i;
          var stacklist = (new Error()).stack.split('\n').slice(5);
          var s = stacklist[config.stackIndex] || stacklist[0];
          var sp = stackReg.exec(s) || stackReg2.exec(s);
          if (sp && sp.length === 5) {
            data.method = sp[1];
          }
        }
        // move tag to be a tag
        var rawtag = '';
        if(data.args.length > 1 && typeof data.args[0] === 'string') {
          rawtag = data.args[0];
          data.tag = (this.config.log.tagopen || '[') + data.args[0] + (this.config.log.tagclose || ']');
          data.args = data.args.length > 2 ? [...data.args].slice(1) : data.args[1];
        }
        // colorize output
        if(data.timestamp) data.timestamp = (this.config.log.timestampopen || '') + data.timestamp + (this.config.log.timestampclose || '');
        if(this.config.log.nocolors || data.title === 'raw') return;
        data.timestamp = colorize(data.timestamp, this.config.log.colorize.timestamp || defaultColors.timestamp);
        data.tag = colorize(data.tag, tagcolor(rawtag, this.config));
        if(data.args.length == 1) data.args[0] = colorize(data.args[0], this.config.log.colorize[data.title] || defaultColors[data.title]);
      }
    });

    if(this.app.geb) this.app.geb.emit('logger_init', this);
  }

  static extend(obj, tag, logger) {
    helper(obj, tag, logger);
  }

  raw(msg) {
    if(!this.logger) return;
    this.logger.raw(msg);
  }
  log(tag) {
    if(!this.logger) return;
    this.logger.log(tag.toLowerCase(), [...arguments].slice(1));
  }
  debug(tag) {
    if(!this.logger) return;
    this.logger.debug(tag.toLowerCase(), [...arguments].slice(1));
  }
  info(tag) {
    if(!this.logger) return;
    this.logger.info(tag.toLowerCase(), [...arguments].slice(1));
  }
  warn(tag) {
    if(!this.logger) return;
    this.logger.warn(tag.toLowerCase(), [...arguments].slice(1));
  }
  error(tag) {
    if(!this.logger) return;
    this.logger.error(tag.toLowerCase(), [...arguments].slice(1));
  }
  fatal(tag) {
    if(!this.logger) return;
    this.logger.fatal(tag.toLowerCase(), [...arguments].slice(1));
  }
}

module.exports = Logger;