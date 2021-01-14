const fs = require('fs-extra');

/**
 * App config file
 * @module core/config
 */

class Config {
 	constructor() {
 	}

	/**
	 * Load config from file
	 * @param {string} fname Filename to load config from
	 */
	load(fname) {
		fs.ensureFileSync(fname);
		try {
			this._shadowConfig = JSON.parse(fs.readFileSync(fname));
			for(var k of Object.keys(this._shadowConfig)) {
				if(Array.isArray(this._shadowConfig[k])) this[k] = this._shadowConfig[k].slice(0);
				else this[k] = Object.assign({}, this._shadowConfig[k]);
			}
			this._activeFilename = fname;
			console.debug(`Loaded config file at ${fname}`);
		}
		catch(e) {
			this._activeFilename = '';
			console.error(`Loaded config file at ${fname}`, e);
		}
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
 
 /** Config singleton */
 var config = new Config();
 
 module.exports = config;