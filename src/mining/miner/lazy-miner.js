/**
 * Completely debug version of a cpuminer. Slow as hell, but pretty useful to straighten block format and overall mining process
 * 
 * DO NO INCLUDE in the release.
 * 
 * @module mining/miner/lazy-miner
 */

const EventEmitter = require('events').EventEmitter;
const keccak = require('../crypto/keccak');
const hex = require('../../utils/hex');
const diff = require('../../utils/diff');
const fmt = require('../../utils/format');

/**
 * Lazy CPU miner implementation plugin. Not the best idea to use it for anything, but testing
 *
 * @class LazyMiner
 * @extends {Miner}
 * @fires solution Miner has found a solution/nonce. Incoming work appended with `minerid: this.id` and `solution: this._nonce`
 */
class LazyMiner extends EventEmitter {
	constructor() {
		super();
		this._idle = true;
		this._hashing = false;
		this._nonce = 0 >>> 0;
		this._data = null;

		// debug
		this._printSourceBlock = true;
		this._printHash = true;
		this._printTarget = true;
	}

	/** Miner type */
	get type() { return 'miner'; }
	/** Miner has nothing to do */
	get busy() { return false; }
	/** Miner is working on the work */
	get working() { return this._hashing; }
	/** Array of supported algos. All and every */
	//get algos() { return [/(.*)/]; }
	get algos() { return [/\b(keccak|keccakc)\b/]; }

	/** Send work to the miner */
	sendWork(data) {
		if(!(data && data.header && data.target)) {
			this._idle = true;
			return this.emit('idle', this.id);
		}
		this._nonce = 0 >>> 0;
		this._idle = false;
		this._data = data; 
		this._data.minerid = this.id;
		this._started = +new Date();
		this._lastMeasure = this._started;
		// data.header <-- this one comes in without nonce!!! add it if required

		// good 1
		//console.log(keccak('70000000edccf8ca4900d02d34e974ff8eabfeada9df4b87ba8339eff2e9b00000000000a5790c0ac81634baa41a1e68886425cf2d792078614957a82a93638d73195eaeab02fd5f73ae001c80438ef3'));
		// this._nonce = 0x80438ef3 >>> 0;
		// this._data.header = '70000000edccf8ca4900d02d34e974ff8eabfeada9df4b87ba8339eff2e9b00000000000a5790c0ac81634baa41a1e68886425cf2d792078614957a82a93638d73195eaeab02fd5f73ae001c';
		// good 2: f43bf128ea9afc1edbe72efb75683d72251c678da50b4a286fd7c17800000000
		//this._nonce = 0x2d30b66d >>> 0;
		//this._data.header = '70000000edccf8ca4900d02d34e974ff8eabfeada9df4b87ba8339eff2e9b000000000006f3f05558a1b5d8678ce0e979fc2e8d53793ecb55ab9135d45cb8bf9b870da347b05fd5f73ae001c';

		this._nonce --;
		console.log('LazyMiner got new job');
		if(this._printSourceBlock) console.debug(`[LazyMiner] < ${this._data.header}`);
		setImmediate(this.calc.bind(this));
	}

	calc() {
		if(this.idle || !this._data) return;
		this._nonce ++; // nonce 0 does not exist

		const tm = +new Date();
		if(tm - this._lastMeasure > 5000) {
			console.debug(`[LazyMiner] ${fmt.hashrate(this._nonce / (tm - this._started) * 1000)}h/s`);
			this._lastMeasure = tm;
		}
		
		const h = keccak(this._data.header + hex.hex32(this._nonce));
		const h64 = Buffer.from(h, 'hex').reverse().readBigUInt64BE(0);

		if(h64 <= this._data.target64) {
			this._data.solution = this._nonce;
			this._data.solutionDiff = (this._data.multiplier || 1) * diff.hashToDiff(h);
			this.emit('solution', this._data);
			if(this._printHash) console.log(h);
			if(this._printTarget) console.log(this._data.target);
			
			if(this._printHash) console.log(hex.hex64(h64));
			if(this._printTarget) console.log(hex.hex64(this._data.target64));
		}

		setImmediate(this.calc.bind(this));
	}
}

module.exports = LazyMiner;