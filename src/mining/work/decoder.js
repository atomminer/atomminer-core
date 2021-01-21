/**
 * Work Decoder class. Listens to the new_job event from pools and handles work generation
 * 
 * @module mining/work/decoder
 */

const loghelper = require('../../core/log/helper')

class WorkDecoder {
	constructor(eventBus, logger = null) {
		if(!eventBus) throw new Error('WorkDecoder requires even bus');
		this.geb = eventBus;
		this.logger = logger;
		loghelper(this);
		
		this.geb.on('new_job', this.onNewJob.bind(this));
		this.geb.on('app_stop', this.stop.bind(this));
		this.geb.emit('workdecoder_ready', this);

		this.info('WorkDecoder started');
	}

	/** Stop event. App is most likely about to finish */
	stop() {
		;
	}

	/** Event handler for 'new_job' event from pools */
	onNewJob() {
		this.log('onNewJob');
	}
}

module.exports = WorkDecoder;