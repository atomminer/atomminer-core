/**
 * Pool Manager module. Keeps all pools in, handles reconnect(s), enable/disable etc.
 * Must not do anything outside of its scope!! 
 * 
 * @module mining/pool/manager
 */
const loghelper = require('../../core/log/helper')
const {Stratum} = require('stratum-client');
const uuid = require('../../utils/uuid');

class PoolManager {
	constructor(eventBus, logger = null) {
		if(!eventBus) throw new Error('WorkDecoder requires even bus');

		this.geb = eventBus
		this.logger = logger;
		loghelper(this);

		this._active = false; // app is started, we're allowed to create, delete, start and stop pools
		this.providers = [];
		this.pools = {};

		this.geb.on('app_ready', this.start.bind(this));
		this.geb.on('app_stop', this.stop.bind(this));

		this.geb.on('poolprovider_ready', this.onNewPoolProvider.bind(this));

		this.geb.on('pool_enable', this.onEnablePool.bind(this));
		this.geb.on('pool_disable', this.onDisablePool.bind(this));
		this.geb.on('pool_add', this.onAddPool.bind(this));
		this.geb.on('pool_remove', this.onRemovePool.bind(this));

		// solution/nonce was found for one of the pools
		this.geb.on('pool_solution', this.onSolution.bind(this));

		this.geb.emit('poolmanager_ready', this);
		this.info('PoolManager started');
	}

	_addPool(poolConfig) {
		const p = poolConfig;
		try {
			if(typeof p !== 'object') return; // not an object. skip
			if(!(p.url && p.username)) return; // no url or username. skip
			// id must be unique!!!!
			if(!p.id) p.id = uuid();
			var attempt = 0;
			while(this.pools[p.id] && attempt++ < 10) p.id = uuid();
			if(this.pools[p.id]) throw new Error(`Cant create unique ID`);
			const pool = new Stratum(p);
			if(!pool.priority) pool.priority = p.priority || 0;
			if(pool.id != p.id) pool.id = p.id;
			this.pools[pool.id] = pool;

			// pool listeners
			pool.on('disconnected', () => { 
				this.logger.log('stratum', `Pool went offline: ${pool.config.url}`);
				this.geb.emit('pool_offline', pool);
			})
			pool.on('online', () => {
				this.logger.log('stratum', `Pool became online: ${pool.config.url}`);
				this.geb.emit('pool_online', pool); 
			});
			pool.on('error', (e) => { this.logger.log('stratum', `Pool '${pool.id}' error: ${e}`); });
			pool.on('diff', (d) => { 
				this.logger.log('stratum', `New diff ${d} fort ${pool.config.url}`);
				this.geb.emit('pool_difficulty', pool); 
			});
			pool.on('job', (j) => {
				this.logger.log('stratum', `New job ${j[0]} fort ${pool.config.url}`);
				this.geb.emit('pool_new_job', pool); 
			});

			// todo: get share id and credit it to the miner/stats ?
			pool.on('accepted', () => { this.geb.emit('pool_accept', pool); });
			pool.on('rejected', () => { this.geb.emit('pool_reject', pool); });

			if(!pool.config.disabled) pool.connect();
		}
		catch(e) {
			this.warn(`Failed to create pool ${p.url || 'with no URL'}`);
		}
	}

	/** Start event. App has finished its init cycle. We can start now */
	start() {
		this._active = true;
		setImmediate(() => {
			for(var p of this.providers) this.addPools(p);
		});
	}
	/** Stop event. App is, most likely, about to exit/terminate */
	stop() {
		this._active = false;
		for(var p of Object.values(this.pools)) p.disconnect();
		this.info('Stopped')
	}

	/** Pool provider has registered with the system */
	onNewPoolProvider(provider) {
		if(!provider) return;
		// only add them to the list here
		// if app is started, schedule pool setup or wait until 'app_ready' event
		this.providers.push(provider);

		if(this._active) setImmediate(() => { this.addPools(provider); });
	}

	/** Instantiate and add pools (initial) from the specified provider */
	addPools(provider) {
		this.debug('addPools');
		// get must be either function, getter or array
		if(!(typeof provider.get === 'function' || 
				typeof provider.__lookupGetter__('get') === 'function' || 
				Array.isArray(provider.get))) {
			provider.__pm_auto_disabled = true;
			this.warn(`Pool-provider '${provider.constructor.name}' did not provide 'get' function. Provider disabled`);
			return;
		}
		
		try {
			const pools = provider.get();
			if(!Array.isArray(pools)) {
				provider.__pm_disabled = true;
				this.warn(`Pool-provider '${provider.constructor.name}' did not provide Array of pools. Provider disabled`);
				return;
			}
			for(var p of pools) this._addPool(p);
		}
		catch(e) {
			this.warn(`Pool-provider '${provider.constructor.name}' init failed: ${e.message}`);
		}
	}

	/** Enable pool event handler */
	onEnablePool(id) {
		if(!this.pools[id]) return;
		this.pools[id].config.disabled = false;
		this.pools[id].connect();
	}
	/** Disable pool event handler */
	onDisablePool(id) {
		if(!this.pools[id]) return;
		this.pools[id].config.disabled = true;
		this.pools[id].disconnect();
	}
	/** Remove pool from the manager. Disconnect and actually delete */
	onRemovePool(id) {
		if(!this.pools[id]) return;
		this.pools[id].disconnect();
		delete this.pools[id];
	}
	/** Add another pool to the system */
	onAddPool(poolConfig) {
		poolConfig && this._addPool(poolConfig);
	}
	/** Add another pool to the system */
	onSolution(unk) {
		this.debug('Solution found. Should submit');
	}
}

module.exports = PoolManager;