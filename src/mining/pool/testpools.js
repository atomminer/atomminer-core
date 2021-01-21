/**
 * Test Pools provider. DO NOT USE in production
 * Testing module that loads test pools from config.testpools. User added pools should be done in a similar way
 * @module mining/pool/TestPools
 */
const loghelper = require('../../core/log/helper')

class TestPools {
	constructor(eventBus, logger = null) {
		if(!eventBus) throw new Error('WorkDecoder requires even bus');
		this.geb = eventBus;
		this.logger = logger;
		loghelper(this);

		this.geb.emit('poolprovider_ready', this);
	}

	/** Return list of pool config objects */
	get() {
		if(!Array.isArray(this.geb.app.config.testpools)) return [];
		return this.geb.app.config.testpools;
	}
}

 module.exports = TestPools;