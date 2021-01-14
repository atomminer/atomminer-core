
const PluginTypes = {
	'pool-provider': require('./pool-provider'),
}

class PluginManager {
	constructor() {
		this._plugins = [];
	}

	/** Register internal plugin */
	register(plugin) {
		if(!plugin) return false;
		// must be an object
		if(typeof plugin !== 'object') return false;
		// must have type declared
		if(typeof plugin.type !== 'string') return false;   
		// type must be known
		if(Object.keys(PluginTypes).indexOf(plugin.type) == -1) return false;
		// check plugin if it has all required fn's and properties
		try {
			PluginTypes[plugin.type](plugin);	
		} catch (error) {
			return false;
		}

		this._plugins.push(plugin)
		return true;
	}

	/** Load and register external plugin */
	load(pluginpath) {
		throw new Error('Not Implemented');
	}

	/** Return array of plugins by type. `null` or empty string as type will return _all_ plugins */
	get(type) {
		if(!type) return this._plugins;
		if(Object.keys(PluginTypes).indexOf(type) == -1) return [];
		return this._plugins.filter(v => v.type === type);
	}
}

const pm = new PluginManager();

module.exports = pm;