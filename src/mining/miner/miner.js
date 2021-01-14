const EventEmitter = require('events').EventEmitter;
const uuid = require('../../utils/uuid');

// todo: remove and implement as a plugin


/**
 *
 *
 * @class Miner
 * @fires online Miner is available
 * @fires offline Miner is not available anymore
 * @fires solution Miner has found a solution/nonce
 * @fires idle Miner has finished mining and idleing
 */
class Miner extends EventEmitter {
	constructor() {
		super();
		this._id = uuid();
	}

	/** Miner type */
	get type() { throw new Error('Not implemented'); }
	/** If it is local miner */
	get local() { return true; }
	/** Miner has nothing to do */
	get idle() { return false; }
	/** Miner is working on the work */
	get hashing() { throw new Error('Not implemented'); }
	/** Array of supported algos */
	get algos() { return []; }
	/** Internal miner ID */
	get id() { return this._id; }

	/** Send work to the miner */
	sendWork(data) { throw new Error('Not implemented'); }
}

module.exports = Miner;