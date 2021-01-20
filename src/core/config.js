const fs = require('fs-extra');

/**
 * App config file
 * @module core/config
 */

class Config {
 	constructor() {
		 this.lastMessage = null;
 	}

	/**
	 * Load config from file
	 * @param {string} fname Filename to load config from
	 */
	load(fname) {
		//fs.ensureFileSync(fname);
		fs.accessSync(fname, fs.constants.R_OK);
		this._shadowConfig = JSON.parse(fs.readFileSync(fname));
		for(var k of Object.keys(this._shadowConfig)) {
			if(Array.isArray(this._shadowConfig[k])) this[k] = this._shadowConfig[k].slice(0);
			else this[k] = Object.assign({}, this._shadowConfig[k]);
		}
		this._activeFilename = fname;

		this.lastMessage = `Loaded config file at ${fname}`;
	}

	/**
	 * Save current (running) config to file
	 * @param {string} fname Filename to load config from
	 */
	save(fname) {
		throw new Error('Not Implemented');
	}

	/** Return object cointaining difference between original and running config */
	diff() {
		throw new Error('Not Implemented');
	}
}
 
 module.exports = Config;