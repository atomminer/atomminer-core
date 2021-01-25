/**
 * Helper module that adds log functions to the provided object with taf
 * @module core/log/helper
 */

const extend = (obj, tag = null, logger = null) => {
	if(!obj) return
	tag = tag || obj._logtag || obj.constructor.name;

	logger = logger || obj.logger;

	obj.log = (msg) => { logger && logger.log(tag, msg); }
	obj.debug = (msg) => { logger && logger.debug(tag, msg); }
	obj.info = (msg) => { logger && logger.info(tag, msg); }
	obj.warn = (msg) => { logger && logger.warn(tag, msg); }
	obj.error = (msg) => { logger && logger.error(tag, msg); }
	obj.fatal = (msg) => { logger && logger.fatal(tag, msg); }
}

module.exports = extend;