/**
 * User priority based scheduler. 
 * Schedules miners to mine a coin with highest priority. Will attempt to fallback to the next priority coin if pool is offline.
 * 
 * How it works (or how it should work)
 * find online pool with lowest priority and feed miner with its jobs
 * if active pool goes online get the next online pool
 * if miner can not mine pool algo, find next online pool
 * if there's 2 or more pools with the same prio, alternate jobs on each miner_idle
 * 
 * TODO:
 * We need a mechanism to include/exclude pool from this scheduler
 * 
 * @module mining/scheduler/priority
 */
const chalk = require('chalk');
const loghelper = require('../../core/log/helper')

class SchedulerPriority {
	constructor(eventBus, logger = null) {
		this._logtag = 'sched-priority';
		if(!eventBus) throw new Error('WorkDecoder requires even bus');
		this.geb = eventBus;
		this.logger = logger;
		loghelper(this);

		this.default = false;

		this.algo = ['keccak'];
		this.miners = {};
		this.pools = {};
		this.minerpool = {};

		// active online pools we're currently working with
		this._activePools = [];
		this.pendingShares = [];

		this.geb.on('job_decoded', this.onNewJob.bind(this)); // new work is ready
		//this.geb.on('pool_difficulty', this.onPoolDiff.bind(this)); // pool changed diff
		this.geb.on('pool_online', this.onPoolOnline.bind(this));
		this.geb.on('pool_offline', this.onPoolOffline.bind(this));
		this.geb.on('pool_accept', this.onPoolAccepted.bind(this));
		this.geb.on('pool_reject', this.onPoolRejected.bind(this));

		this.geb.on('miner_connected', this.onMinerOnline.bind(this));
		this.geb.on('miner_disconnected', this.onMinerOffline.bind(this));

		this.geb.on('miner_solution', this.onMinerSolution.bind(this));
		this.geb.on('miner_idle', this.onMinerIdle.bind(this));

		this.geb.emit('scheduler_ready', this);
	}

	/** Miner became online */
	onMinerOnline(dev) {
		// we only want this miner if 
		// 1. miner it is set to use sched-priority 
		// 2. miner doesn't have scheduler set and we're default scheduler
		if(dev.scheduler === 'sched-priority' || (this.default && !dev.scheduler)) {
			this.miners[dev.id] = dev;
			this.log(`${dev.name || 'Miner'} ${dev.serial} is attached to Priority scheduler`);
			// todo: should we notify other schedulers to release this miner here?
			// todo: do the magic and send miner its work if there's any
		}
	}
	/** Miner went offline */
	onMinerOffline(dev) {
		if(this.miners[dev.id]) {
			delete this.miners[dev.id];
			this.log(`${dev.name || 'Miner'} ${dev.serial} released by Priority scheduler`);
		}
	}
	/** Pool went online event */
	onPoolOnline(pool) {
		this.pools[pool.id] = pool;
		setImmediate(() => {
			this.updateCurrentPools();
			// todo: if miner(s) should be switched to this pool
		});
	}
	/** Pool went offline event */
	onPoolOffline(pool) {
		if(this.pools[pool.id]) delete this.pools[pool.id];
		setImmediate(() => {
			this.updateCurrentPools();
			// todo: switch miner(s) connected to that pool
		});
	}
	/** Pool changed difficulty event */
	onPoolDiff(pool) {
		// priority scheduler doesn't care about pool difficulty as it is not used in calculations
		// pool's workdecoder will take care of re-calculating target and issue 'job_decoded' if necessary
	}
	/** Pool Job is decoded and ready to be dispatched */
	onNewJob(pool) {
		setImmediate(() => {
			this.updateCurrentPools();
			if(!Object.keys(this.miners).length) return; //no miners available
			for(var m of Object.values(this.miners)) {
				if(!(m.idle || this.minerpool[m.id] == pool.id)) continue;
				const w = pool.work.get();
				this.dispatchWork(m, w);
				this.minerpool[m.id] = pool.id;
			}
		})
	}

	updateCurrentPools() {
		// for instance, we have 3 pools with prio: [0, 1, 1]
		// if 0 goes offline, we're lowering prio to 1 and starting to alternate between prio 1 pools
		// and switching back to 0 when it is back online
		var pools = Object.values(this.pools).filter(p => p.online).sort((a,b) => a.config.priority - b.config.priority);
		var pool = null;
		for(var p of pools) {
			if(p.online && p.work && p.work._cache.length) {
				pool = p;
				break;
			}
		}
		if(!pool) return ;
		this._activePools = pools.filter(p => p.config.priority == pool.config.priority);
	}

	dispatchWork(miner, work) {
		if(typeof miner.sendwork !== 'function') return;
		const pool = this.pools[work.poolid];
		this.debug(`Dispatching ${pool.poolname()} job ${pool.work._jobID} to miner ${miner.serial || miner.id}`);
		miner.sendwork(work);
	}

	rotateIdleMiners() {
		// nothing to rotate if there's only 1 active pool
		if(!(this._activePools && this._activePools.length > 1)) return;
		for(var m of Object.values(this.miners)) {
			if(!m.idle) continue;
			const poolid = this.minerpool[m.id]; // current pool it was assigned to
			if(!poolid) {
				this.minerpool[m.id] = this._activePools[0].id;
				continue;
			}
			var i = 0;
			for(; i < this._activePools.length ; i++) {
				if(this._activePools[i].id == this.minerpool[m.id]) break;
			}
			if(++i >= this._activePools.length) i = 0;
			this.debug(chalk.magentaBright(`Switching miner ${m.serial || m.id} to ${this._activePools[i].poolname()}`));
			this.minerpool[m.id] = this._activePools[i].id;
		}
	}

	restartIdleMiners() {
		if(!this._activePools.length) return;
		for(var m of Object.values(this.miners)) {
			if(!m.idle) continue;
			if(!this.minerpool[m.id]) this.minerpool[m.id] = this._activePools[0].id;
			const pool = this.pools[this.minerpool[m.id]];
			if(!pool.work) return;
			const w = pool.work.get();
			this.dispatchWork(m, w);
		}
	}

	/** Miner has a solutions */
	onMinerSolution(work) {
		if(!work) return this.warn('Caught undefined solution');
		const pool = this.pools[work.poolid]
		if(!(pool && pool.online)) return this.warn(`Solution found for job ${work.jobid} when pool is offline`);
		setImmediate(() => {
			this.log(`Solution ${work.solution} ${work.solutionDiff ? `(diff: ${work.solutionDiff.toFixed(3)}) ` : ''}found for job ${work.jobid} from ${pool.poolname()}`);
			work.__am_share_sent = +new Date();
			work.shareid = pool.submit({ job: work.jobid, nonce2: work.nonce2, nonce: work.solution, time: work.time });
			this.pendingShares.push(work);
		});
	}
	/** Miner is idle */
	onMinerIdle(miner) {
		this.debug('onMinerIdle');
		process.nextTick(() => {
			this.rotateIdleMiners();
			this.restartIdleMiners();
		})
	}

	_removePendingShare(share) {
		var s = null;
		if(share) {
			const idx = this.pendingShares.findIndex((e) => (e.poolid == share.pool.id && e.shareid == share.shareid));
			if(idx == -1) return null;
			s = this.pendingShares[idx];
			this.pendingShares.splice(idx, 1);
		}
		// if pool does not respond within 5 minutes, most likely it will never respond at all. consider share is lost
		const tmLimit = +new Date() - 300000;
		while(this.pendingShares.length && this.pendingShares[0].__am_share_sent <= tmLimit) {
			const pool = this.pools[this.pendingShares[0].poolid];
			const miner = this.miners[this.pendingShares[0].minerid];
			if(pool) pool.lost ++;
			if(miner) miner.lost ++;
			this.pendingShares.shift();
			this.debug('Found lost share');
		}
		return s;
	}
	/** Share was accepted by the pool */
	onPoolAccepted(share) {
		//this.debug('onPoolAccepted');
		setImmediate(() => {
			const pending = this._removePendingShare(share)
			if(!pending) return;
			const miner = this.miners[pending.minerid];
			if(miner && miner.accepted >= 0) miner.accepted ++;
		})
	}
	/** Share was rejected by the pool */
	onPoolRejected(share) {
		//this.debug('onPoolRejected');
		setImmediate(() => {
			const pending = this._removePendingShare(share)
			if(!pending) return;
			const miner = this.miners[pending.minerid];
			if(miner && miner.accepted >= 0) miner.rejected ++;
		});
	}
}

module.exports = SchedulerPriority;