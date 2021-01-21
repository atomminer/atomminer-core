
const PluginTypes = {
	'pool-provider': require('./pool-provider'),
	'miner': require('./miner'),
}

class PluginManager {
	constructor() {
		this._plugins = [];
		this._bus = null;
	}

	/** Init plugin manager with global even bus */
	init(bus) {
		this._bus = bus;
	}

	/** Register internal plugin */
	register(plugin) {
		if(!plugin) return console.warn(`Failed to register plugin: plugin can't be null`);
		// must be an object
		if(typeof plugin !== 'object') return console.warn(`Failed to register plugin: plugin must be object`);
		// must have type declared
		if(typeof plugin.type !== 'string') return console.warn(`Failed to register ${plugin.name || ''} plugin: plugin must declare type`);
		// type must be known
		if(Object.keys(PluginTypes).indexOf(plugin.type) == -1) return console.warn(`Failed to register ${plugin.name || ''} plugin: unknown plugin type`);
		// check plugin if it has all required fn's and properties
		try {
			PluginTypes[plugin.type](plugin);	
		} catch (error) {
			return console.warn(`Failed to register ${plugin.name || ''} plugin: ${error.message}`);
		}

		this._plugins.push(plugin)
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

module.exports = PluginManager;