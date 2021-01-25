/**
 * Work Decoder class. Listens to the new_job event from pools and handles work generation
 * 
 * @module mining/work/decoder
 */

const loghelper = require('../../core/log/helper')
const Work = require('./work');
const chalk = require('chalk')

class WorkDecoder {
	constructor(eventBus, logger = null) {
		this._logtag = 'wd';
		if(!eventBus) throw new Error('WorkDecoder requires even bus');
		this.geb = eventBus;
		this.logger = logger;
		loghelper(this);
		
		this.geb.on('pool_new_job', this.onNewJob.bind(this));
		this.geb.on('app_stop', this.stop.bind(this));
		this.geb.emit('workdecoder_ready', this);

		this.info('WorkDecoder started');
	}

	/** Stop event. App is most likely about to finish */
	stop() {
		// we don't do anything here that needs to be stopped
	}

	/** Event handler for 'new_job' event from pools */
	onNewJob(pool) {
		setImmediate(() => {
			if(!pool.work) pool.work = new Work(pool);
			else pool.work.update();
			const w = pool.work;
			this.log(`${pool.poolname()} New job ${w._jobID} for block ${chalk.cyan(w._height)} with difficulty of ${pool._coinDiff.toFixed(2)}`);
			this.geb.emit('job_decoded', pool);
		})
	}
}

module.exports = WorkDecoder;