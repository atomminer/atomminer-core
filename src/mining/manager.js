const EventEmitter = require('events').EventEmitter;
const hex = require('../utils/hex')
const PM = require('../core/plugins/manager');
const PoolMgr = require('./pool/manager');

const Work = require('./work/work');

const checkminer = require('../core/plugins/miner');

/**
 * This class is reponsible for managing managers and connecting/reconnecting who does what.
 * I.e assign miners to the pool, implement switching strategies, etc.
 */

class MiningManager extends EventEmitter{
	constructor() {
		super();

		// todo: _miners shoud be an object with miner.id being the key
		this._miners = [];
		
		// register local miners, if any
		for(var m of PM.get('miner')) this.registerMiner(m);
		// this.registerMiner(new LazyMiner()); // DO NOT USE except for testing
		// this.registerMiner(new CPUMiner());	// CPU driver
		// this.registerMiner(new AMxDMiner());	// AM Debug hardware driver
		// this.registerMiner(new AM01Miner());	// AM01 driver
		// this.registerMiner(new AM02Miner()); // AM02 driver
		// this.registerMiner(new GPUMiner());  // big TODO shouldn't it be done as a plugin? 

		// todo: init mining managers

		// todo: init switchers/schedulers

		// init and start Pools manager
		this._poolmgr = new PoolMgr();
		this._poolmgr.on('online', this.onPoolOnlineOffline.bind(this));
		this._poolmgr.on('offline', this.onPoolOnlineOffline.bind(this));
		this._poolmgr.on('diff', this.onPoolDiff.bind(this));
		this._poolmgr.on('job', this.onPoolJob.bind(this));

		// todo: load list of pools from config or cache...or whatever
		// todo: load disabled pools list
		// todo: make sure pools don't have same id
		const providers = PM.get('pool-provider');
		for(var pr of providers) {
			const pools = pr.get();
			for(var p of pools) this._poolmgr.addPool(p);
		}
		
		console.debug(`MM init done with ${Object.keys(this._poolmgr._pools).length} pool(s)`);
	}

	/** Stop everythig: pools, schedulers and miners */
	async stop() {
		this._poolmgr.stop();
	}

	registerMiner(m) {
		// todo: check if it has the minimum required fn's instead of checking instance to allow miner-as-a-plugin
		try {
			checkminer(m)
		} catch (r) {}

		// todo: check that miners don't have the same id

		// todo: listeners
		m.on('online', (id) => {});
		m.on('offline', (id) => {});
		m.on('solution', this.onSolutionFromMiner.bind(this));
		m.on('idle', (id) => {});
		this._miners.push(m);

		// TODO: assign it to the scheduler
	}

	/** Invoked when pool is going online or offline. We will use it re-assign miners */
	onPoolOnlineOffline(id) {
		// todo: stop all miners assigned to this pool and try to reassign them
		for(var m of this._miners) m.sendWork(null);
	}

	/** Pool diff changed. re-calculate profitabiliy? ask scheduler? todo */
	onPoolDiff(id) {
		console.log(`Stratum set difficulty to ${this._poolmgr._pools[id]._diff}`);
		// adjust target
		if(this._poolmgr._pools[id].work) this._poolmgr._pools[id].work.update();
	}

	/** Pool received new job. prep and dispatch new work(s) to the assigned miners, if any */
	onPoolJob(id) {
		const job = this._poolmgr._pools[id]._job;
		var jid = this._poolmgr._pools[id].jsonRPC2 ? job.job_id : job[0];

		// prep mining work(s) for this pool. schedule work preparation on the next tick
		// we don't want to freeze event loop by calculating crypto stuff here
		setImmediate(() => {
			if(!this._poolmgr._pools[id].work) this._poolmgr._pools[id].work = new Work(this._poolmgr._pools[id]);
			else this._poolmgr._pools[id].work.update();
			const w = this._poolmgr._pools[id].work;
			console.log(`Stratum: new job ${jid} for block ${w._height} at diff ${this._poolmgr._pools[id]._coinDiff.toFixed(2)} (${w._bits})`);
			for(var m of this._miners) m.sendWork(this._poolmgr._pools[id].work.get());
		});
	}

	onSolutionFromMiner(data) {
		// big todo: comprehensive check
		const pool = this._poolmgr._pools[data.poolid];
		if(!pool) return console.error('Something is wrong: no pools found');
		console.log(`Miner found nonce ${hex.hex32(data.solution)} for job ${data.jobid} ${(pool._coinDiff <= data.solutionDiff) ? '!!!BLOCK!!!' : ''}`);
		if(pool.type === 'stratum') pool.submit({ job: data.jobid, nonce2: data.nonce2, nonce: data.solution, time: data.time });
		else throw new Error('Not implemented')
	}
}

module.exports = MiningManager;