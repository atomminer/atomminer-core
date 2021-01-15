const {Transport, Stratum} = require('stratum-client');
const EventEmitter = require('events').EventEmitter;


/**
 * Pool manager. Tracks all pools and their respective jobs/diffs
 *
 * @class PoolManager
 * @fires online When pool becomes online. data is pool ID --> MM
 * @fires offline When pool goes offline. data is pool ID --> MM
 * @fires job When pool received new job. data is pool ID --> MM
 * @fires diff When pool gets new diff. data is pool ID --> MM
 */
class PoolManager extends EventEmitter{
	constructor() {
		super();
		this._running = false;
		this._pools = {};
		this._running = true;
	}

	/** Start pool manager */
	start() {
		this._running = true;
	}

	/** Stop pool manager */
	stop() {
		this._running = false;
		for(var k in Object.keys(this._pools)) {
			this._pools[k].disconnect();
		}
	}
	
	/** Add pool to the list. instance of Transport or config object */
	addPool(poolOrConf) {
		if(!poolOrConf) return;
		var pool = poolOrConf instanceof Transport ? poolOrConf : new Stratum(poolOrConf);
		
		// TODO: replace all console.log with the internal logger with tags, categories and file logging
		pool.on('disconnected', () => { this.emit('offline', pool.config.id);})
		pool.on('online', () => { this.emit('online', pool.config.id); });

		// status, error and redirect are for logging purpose only
		// pool.on('status', (s) => { console.log(`Stratum: ${s}`); })
		pool.on('error', (e) => { console.log(`Stratum error: ${e}`); });
		// pool.on('redirect', (d) => { console.log(`Stratum requested reconnect`); });

		pool.on('diff', (d) => {  this.emit('diff', pool.config.id); });
		pool.on('job', (j) => { 
			this.emit('job', pool.config.id);
		});
		pool.on('accepted', () => { 
			console.green('Share accepted');
		});
		pool.on('rejected', () => { 
			console.red('Share rejected')
		});
		this._pools[pool.id] = pool;
		if(!pool.disabled) {
			console.debug(`Starting ${pool.config.url}`);
			pool.connect();
		}
	}

	/** Enable/start pool */
	enablePool(id) {
		if(!this._pools[id]) return;
		delete this._pools[id].disabled;
		this._pools[id].start();
	}

	/** Disable/stop pool */
	disablePool(id) {
		if(!this._pools[id]) return;
		this._pools[id].disabled = true;
		this._pools[id].disconnect();
	}
}

module.exports = PoolManager;