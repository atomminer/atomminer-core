const chalk = require('chalk');
const loghelper = require('../../core/log/helper')

class Scheduler {
	constructor(config, eventBus, logger = null) {
		this._logtag = this.shortname;
		if(!eventBus) throw new Error(`${this.constructor.name} scheduler requires even bus`);
		this.geb = eventBus;
		this.logger = logger;
		loghelper(this);

		if(typeof config !== 'object') config = {}
		this.config = Object.assign({}, config);

		this.default = false;
		this.miners = {};
		this.pools = {};
		this.pendingShares = [];

		this.geb.on('pool_online', this.onPoolOnline.bind(this));
		this.geb.on('pool_offline', this.onPoolOffline.bind(this));
		this.geb.on('job_decoded', this.onNewJob.bind(this)); // new work is ready
		this.geb.on('pool_difficulty', this.onPoolDiff.bind(this)); // pool changed diff
		this.geb.on('pool_accept', this.onPoolAccepted.bind(this));
		this.geb.on('pool_reject', this.onPoolRejected.bind(this));

		this.geb.on('miner_connected', this.onMinerOnline.bind(this));
		this.geb.on('miner_disconnected', this.onMinerOffline.bind(this));

		this.geb.on('miner_solution', this.onMinerSolution.bind(this));
		this.geb.on('miner_idle', this.onMinerIdle.bind(this));

		this.geb.emit('scheduler_ready', this);
	}

	get id() { return 'generic'; }
	get name() { return 'generic'; }
	get shortname() { throw new Error('Generic Scheduler can not be used like that'); };

	/// virtual fns for child classes
	minerAdded(dev) {}
	minerRemoved(dev) {}
	minerIdle(miner) {}
	poolAdded(pool) {}
	poolRemoved(pool) {}
	onPoolDiff(pool) {}
	// the actual scheduler must decide if this new job is getting dispatched to the miners or not
	onNewJob(pool) {}

	// inner
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

	dispatchWorkFromPool(miner, pool) {
		if(!(miner && pool)) return;
		if(pool.online && pool.work) {
			this.dispatchWork(miner, pool.work.get());
			return true;
		}
	}

	dispatchWork(miner, work) {
		if(!(miner && work)) return;
		if(typeof miner.sendwork !== 'function') return;
		const pool = this.pools[work.poolid];
		this.debug(`Dispatching ${pool.poolname()} job ${pool.work._jobID} to miner ${miner.serial || miner.id}`);
		miner.sendwork(work);
	}

	/** Miner became online */
	onMinerOnline(dev) {
		if(dev.scheduler === this.shortname || (this.default && !dev.scheduler)) {
			this.miners[dev.id] = dev;
			this.log(`${chalk.whiteBright(dev.name || 'Miner')} ${dev.serial} is attached to ${this.name} scheduler`);
			this.minerAdded(dev)
		}
	}
	/** Miner went offline */
	onMinerOffline(dev) {
		if(this.miners[dev.id]) {
			delete this.miners[dev.id];
			this.log(`${dev.name || 'Miner'} ${dev.serial} released by Priority scheduler`);
			this.minerRemoved(dev);
		}
	}
	/** Pool went online event */
	onPoolOnline(pool) {
		this._removePendingShare();
		this.pools[pool.id] = pool;
		this.poolAdded(pool);
	}
	/** Pool went offline event */
	onPoolOffline(pool) {
		this._removePendingShare();
		if(this.pools[pool.id]) delete this.pools[pool.id];
		this.poolRemoved(pool);
	}
	/** Share was accepted by the pool */
	onPoolAccepted(share) {
		// no need to update pool here as it is
		setImmediate(() => {
			const pending = this._removePendingShare(share)
			if(!pending) return;
			const miner = this.miners[pending.minerid];
			if(miner && miner.accepted >= 0) miner.accepted ++;
		})
	}
	/** Share was rejected by the pool */
	onPoolRejected(share) {
		setImmediate(() => {
			const pending = this._removePendingShare(share)
			if(!pending) return;
			const miner = this.miners[pending.minerid];
			if(miner && miner.accepted >= 0) miner.rejected ++;
		});
	}

	onMinerSolution(work) {
		if(!work) return this.warn('Caught undefined solution');
		const pool = this.pools[work.poolid];
		if(!(pool && pool.online)) {
			// this is not our miner. move along
			if(!this.miners[work.minerid]) return;
			return this.warn(`Solution found for job ${work.jobid} when pool is offline`);
		}
		setImmediate(() => {
			this.log(`Solution ${work.solution} ${work.solutionDiff ? `(diff: ${work.solutionDiff.toFixed(3)}) ` : ''}found for job ${work.jobid} from ${pool.poolname()}`);
			work.__am_share_sent = +new Date();
			work.shareid = pool.submit({ job: work.jobid, nonce2: work.nonce2, nonce: work.solution, time: work.time });
			this.pendingShares.push(work);
		});
	}

	onMinerIdle(miner) {
		if(!miner) return;
		if(!this.miners[miner.id]) return;
		this.minerIdle(miner);
	}
}

module.exports = Scheduler;