/**
 * Test plugin if it meet requirements to be a miner. 
 * 
 * NOTES
 * MM will assign id for every new miner itself
 * 
 * Leaving it simple for now: one miner - one work. 
 * todo: add multiple works and multi-algo support
 * 
 * Requirements:
 * MUST extend EventEmitter
 * MUST have `type` === 'miner' property or getter
 * MUST have `busy` property or getter -- whether miner can accept new jobs. good idea to use in conjunction with online/offline events
 * MUST have `working` property or getter -- performing operations
 * MUST have sendWork fn
 * MUST NOT have readonly property id. r/w is fine
 * CAN have name property or getter
 * 
 * MM will listen following events from miner
 * 'online' miner become available
 * 'offline' miner become unavailable
 * 'idle' miner changed state to idle
 * 'solution' miner has found solution
 * 
 * 
 * @module core/plugins/miner
 */
const EventEmitter = require('events').EventEmitter;

// real basic, minimal miner example
class Miner extends EventEmitter {
	constructor() {
		super();
	}

	/** Miner type */
  get type() { return 'miner'; }
  /** Miner is busy with something else and can't accept new tasks at this moment */
	get busy() { return true; }
	/** Miner is working on the work */
	get working() { return false; }
	/** Array of supported algos */
  get algos() { return []; }
  
	/** Send work to the miner */
	sendWork(data) { throw new Error('Not implemented'); }
}

const hasProp = (obj, name) => {
  return obj.hasOwnProperty(name) || typeof obj.__lookupGetter__(name) === 'function';
}

/**
 * Verify plugin
 * @param {object} p plugin to check
 */
const verify = (p) => {
  if(!(p instanceof EventEmitter)) throw new Error(`${p.name || ''} Plugin must be instance of EventEmitter`);
  if(p.type !== 'miner') throw new Error(`${p.name || ''} Plugin must have sendWork function`);
  if(typeof p.__lookupGetter__('id') === 'function' && typeof p.__lookupSetter__('id') !== 'function') throw new Error(`${p.name || ''} Plugin is not allowed to have 'id' getter`);
  if(!hasProp(p, 'busy')) throw new Error(`${p.name || ''} Plugin must have busy property or getter`);
  if(!hasProp(p, 'working')) throw new Error(`${p.name || ''} Plugin must have working property or getter`);
  if(typeof p.sendWork !== 'function') throw new Error(`${p.name || ''} Plugin must have sendWork function`);
}

module.exports = verify;