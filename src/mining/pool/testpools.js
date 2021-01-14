const config = require('../../core/config');

/**
 * Test Pools provider.
 * Testing module that loads test pools from config.testpools. User added pools should be done in a similar way
 * @module mining/pool/TestPools
 */

class TestPools {
	constructor() {
	}

	/** Return plugin type */
	get type() {
		return 'pool-provider';
	}

	/** Return list of pool config objects */
	get() {
		if(!Array.isArray(config.testpools)) return [];
		return config.testpools;
	}
}

 /** TestPools Singleton */
 const tp = new TestPools();

 module.exports = tp;