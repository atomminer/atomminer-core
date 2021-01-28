/**
 * Round-robin scheduler.
 * Options are: 
 * 	load balance	-> equalize amount if shares for each pool
 * 	timed					-> switch pools on interval
 * 	default				-> switch miner every time it is idle
 */

const chalk = require('chalk');
const Scheduler = require('./scheduler');
const RR = require('./helpers/rr')

class RoundRobin extends Scheduler{
	constructor(config, eventBus, logger = null) {
		super(config, eventBus, logger);

		this.rr = new RR();
		this.rr.cbAssigned = this.minerAssigned.bind(this);

		this.assignments = {};
		this.timedswitch = {};

		this.geb.on('app_ready', this.start.bind(this));
		this.geb.on('app_stop', this.stop.bind(this));

		this.timedTimer = null;
		if(this.config.hasOwnProperty('interval')) {
			if(typeof this.config.interval !== 'number') this.config.interval = 0;
			if(this.config.interval != 0 && this.config.interval < 30) {
				this.warn('Timed interval is below allowed minimum. Interval is changed to 30 seconds');
				this.config.interval = 30;
			}
		}		
	}

	get id() {return '9eb35a4d842a41cd880d4de4f34fe36f'; }
	get name() { return 'RoundRobin'; }
	get shortname() { return 'round-robin'; };

	start() {
		if(this.timedTimer) clearInterval(this.timedTimer);
		if(this.config.interval) this.timedTimer = setInterval(() => {
			const tm = +new Date();
			for(var m of Object.keys(this.miners)) {
				if(this.timedswitch[m] && (tm - this.timedswitch[m]) >= this.config.interval * 1000) {
					const elapsed = ~~((tm - this.timedswitch[m]) / 1000);
					const miner = this.miners[m];
					const pool = this.pools[this.assignments[m]];
					const poolname = pool ? pool.poolname() : '';
					this.debug(`Switching ${chalk.whiteBright(miner.name || '')} ${chalk.cyan(miner.serial || miner.id)} because it was mining ${poolname} for ${elapsed} seconds`);
					process.nextTick(() => { this.rr.assign(m); });
				}
			}
		}, 500);
	}

	stop() {
		if(this.timedTimer) {
			clearInterval(this.timedTimer);
			this.timedTimer = null;
		}
	}

	minerAssigned(minerid, poolid) {
		process.nextTick(() => {
			const m = this.miners[minerid];
			const pool = this.pools[poolid];
			if(this.assignments[minerid] !== poolid) {
				this.assignments[minerid] = poolid;
				this.timedswitch[minerid] = +new Date();
				if(m && pool)this.log(`Miner ${m.name || ''} ${chalk.cyan(m.serial || m.id)} switched to ${chalk.magentaBright(pool.poolname())}`);
			}
			if(!(m && pool && pool.online && pool.work)) return;
			this.dispatchWorkFromPool(this.miners[minerid], this.pools[poolid]);
		})
	}

	minerAdded(dev) {
		this.rr.addminer(dev.id);
	}
	minerRemoved(dev) {
		this.rr.removeminer(dev.id);
	}
	minerIdle(miner) {
		this.debug('minerIdle');
		if(!this.config.interval && !this.config.loadbalance) {
			if(this.rr.poolids.length > 1) {
				this.debug(`Switching ${chalk.whiteBright(miner.name || '')} ${chalk.cyan(miner.serial || miner.id)} because it is idle`);
				this.rr.assign(miner.id);
			}
		}
		else {
			this.dispatchWorkFromPool(miner, this.pools[this.assignments[miner.id]]);
		}
	}

	poolAdded(pool) {
		// Mickey-mouse solution for fucked up pools that send out jobs before auth completed. See: this.onNewJob
		if(!(pool.online && pool.work)) return;
		this.rr.addpool(pool.id);
	}
	poolRemoved(pool) {
		const unassigned = this.rr.removepool(pool.id);
		for(var u of unassigned) this.rr.assign(u);
	}
	
	onNewJob(pool) {
		// continue of mickey-mouse solution
		if(pool.online && this.rr.poolids.indexOf(pool.id) == -1) return this.rr.addpool(pool.id);
		const miners = this.rr.minersByPool(pool.id)
		for(var m of miners) this.dispatchWorkFromPool(this.miners[m], pool);
	}
}

module.exports = RoundRobin;