/**
 * User priority based scheduler. 
 * Schedules miners to mine a coin with highest priority. Will attempt to fallback to the next priority coin if pool is offline
 * @module mining/scheduler/priority
 */
const loghelper = require('../../core/log/helper')

class SchedulerPriority {
	constructor(eventBus, logger = null) {
		if(!eventBus) throw new Error('WorkDecoder requires even bus');
		this.geb = eventBus;
		this.logger = logger;
		loghelper(this);

		this.algo = ['keccak'];

		this.geb.on('job_decoded', this.onNewJob.bind(this)); // new work is ready
		this.geb.on('pool_difficulty', this.onNewJob.bind(this)); // pool changed diff
		this.geb.on('pool_online', this.onNewJob.bind(this));
		this.geb.on('pool_offline', this.onNewJob.bind(this));
		this.geb.emit('scheduler_ready', this);
	}

	onNewMiner() {
		;
	}
	onNewPool() {
		;
	}
	onNewJob() {
		;
	}
}

module.exports = SchedulerPriority;