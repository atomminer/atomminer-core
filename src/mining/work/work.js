/**
 * Generate and cache mining work(s) from Stratum job. Measure time between new jobs from the pool
 * and amount of works it has to generate on average to make an intelligent decision about
 * how many works do we need to cache on next update for max efficiency.
 * 
 * @module mining/work/work
 */
const Merkle = require('../crypto/merkle');
const diff = require('../../utils/diff');
const hex = require('../../utils/hex');

const RootFn = {
	'keccak': Merkle.single,
	'blakecoin': Merkle.single,
	'groestl': Merkle.single,
	'gr0estl': Merkle.single,		// groestl alias
}

const Multipliers = {
	'keccak' : 0x80,
	'keccakc': 0x100,
}

/**
 * Extract block height from coinbase. Pretty useless, but why not?
 * @param {string} coinbase1 Coinbase to decode
 * @returns {Number} Block height
 */
const decodeBlockHeight = (coinbase1) => {
	var height = 1;
	try {
		var buf = Buffer.from(coinbase1, 'hex');
		var pi = 32;
		while(buf[pi] != 0xff && pi < buf.length) pi++;
		while(buf[pi] == 0xff && pi < buf.length) pi++;
		if(buf[pi - 1] == 0xff && buf[pi - 2] == 0xff) {
			var len = buf[++pi];
			height = buf.readUInt16LE(++pi);
			pi += 2;
			if(len == 4) height += 0x10000 * buf.readUInt16LE(pi);
			else if(len == 3) height += 0x10000 * buf[pi];
		}
	} 
	catch (error) {
	}
	return height;
}

/**
 * Generate and cache mining work(s) from Stratum job. Measure time between new jobs from the pool
 * and amount of works it has to generate on average to make an intelligent decision about
 * how many works do we need to cache on next update for max efficiency.
 * 
 * Example: pool send new job every 24 seconds on average; 1 active miner is connected that can hash
 * the whole work in ~6 seconds. It is far more beneficial to generate 4 works items when new job received
 * and feed new work from cache (i.e instantly) vs generating work every time miner is idle.
 * I.e return work from cache when miner needs it and the slowly schedule self to refill cache
 * 
 * Self-adjusting cache size is more efficient when:
 * 1. miners are "randomly" switching between pools, which is always
 * 2. miners can connect/disconnect at random time
 * 
 * @class Work
 * @param {Transport} pool pool instance
 */
class Work {
	constructor(pool) {
		if(!pool) throw new Error('Pool is null');
		this._pool = pool;
		this._cache = [];
		this._jobID = null;
		this._rpc2 = false;
		// RPC 1.x fields
		this._diff = 0;
		this._prevhash = null;
		this._coinbase1 = null;
		this._coinbase2 = null;
		this._leafs = [];
		this._version = null;
		this._bits = 0;
		this._time = 0;
		this._xnonceSize = 0; // ?
		this._xnonce = 0; 
		this._xnonce2Size = 0; //?
		this._xnonce2 = 0; 
		this._merkle = null;
		this._multiplier = 1;
		this._height = 1;
		// todo: RPC 2.0 fields
		this._blob = null;
		// internal counters
		this._lastUpdate = 0;
		this._avglifespan = 0; 		// average job lifespan.
		this._cacheDrained = 0; 	// drain event counter happened during current job.
		this._worksCreated = 0;		// amount of works created during current job.
		this._worksConsumed = 0;	// amount of works consumed during current job.
		this._cacheSize = 1; 			// by default, hold 1 work active and refill when it is consumed.

		// debug
		this._printWorkStats = true; 			// print debug stats
		this._printTarget = false;				// print new target 
		this._printScheduleWork = true;		// print when work is being scheduled

		this.update();
	}

	/** Invoked after pool received new job */
	update() {
		if(!this._pool) return;
		if(!this._pool._job) return;
		const tm = +new Date();
		const rpc2 = this._pool.jsonRPC2;
		const rpc1 = ~rpc2;
		const jobID = rpc2 ? this._pool._job.job_id : this._pool._job[0];
		this._multiplier = Multipliers[this._pool.config.algo] || 1;
		// there's absolutely no reason to (re)calculate target for every block
		if(this._diff != this._pool._diff) {
			this._diff = this._pool._diff;
			this._target = diff.diffToTarget(this._pool._diff / this._multiplier);
			this._target64 = diff.diffToTarget64(this._pool._diff / this._multiplier);
			if(this._printTarget) console.debug(`Target for ${this._pool._diff}: ${this._target}`);
		}
		
		// same job. this.get() will take care of cache when required. however target could change between jobs
		if(jobID === this._jobID) return;
		if(rpc1) {
			if(!Array.isArray(this._pool._job)) return console.error('Work::update Invalid job. Array expected');
			if(this._pool._job.length < 8) return console.error('Work::update Invalid job length');

			this._diff = this._pool.diff;

			this._prevhash = this._pool._job[1];
			this._coinbase1 = this._pool._job[2];
			this._coinbase2 = this._pool._job[3];
			this._leafs = Array.isArray(this._pool._job[4]) ? this._pool._job[4] : [];
			this._version = this._pool._job[5];
			this._bits = this._pool._job[6];
			this._time = this._pool._job[7];
			this._xnonceSize = this._pool._extraNonce.length; // ?
			this._xnonce = this._pool._extraNonce; 
			this._xnonce2Size = 4; // assuming extranonce 2 is 32bit value
			this._xnonce2 = 0;

			this._height = decodeBlockHeight(this._coinbase1);

			this._pool._coinDiff = diff.bitsToDiff(this._bits);
		}
		else {
			if(!this._pool._job.blob) return console.error('Work::update Invalid job. Missing blob');
			throw new Error('not implemented');
		}	

		// save it for last, in case something went wrong
		this._jobID = jobID;

		// analyze production-demand ratio and adjust this._cacheSize if required
		if(this._lastUpdate) {
			const dt = tm - this._lastUpdate;
			this._avglifespan = this._avglifespan ? ((dt + this._avglifespan) >> 1) : dt;

			// debug info
			if(this._printWorkStats) {
				console.debug(`-----------------  Updating new job counters -----------------`);
				console.debug(`Lifespan: ${(this._avglifespan/1000).toFixed(3)}s`);
				console.debug(`Cache   : ${this._cacheSize}`);
				console.debug(`Consumed: ${this._worksConsumed}`);
				console.debug(`Produced: ${this._worksCreated}`);
				console.debug(`Drained : ${this._cacheDrained}`);
			}

			// clearly, cache is too small
			if(this._cacheDrained) this._cacheSize += this._cacheDrained;
			else {
				if(this._worksConsumed < (this._worksCreated - this._cacheSize - 1)) {
					if(this._cacheSize > this._worksConsumed) this._cacheSize = this._cacheSize >> 1;
					else this._cacheSize --;
				}
			}
		}

		if(this._cacheSize <= 0) this._cacheSize = 1;

		// fill new cache with the required amount of works before we proceed further
		this._cache = [];
		while(this._cache.length < this._cacheSize) this._generate();
		
		this._lastUpdate = tm;
		this._cacheDrained = 0;
		this._worksCreated = 0;
		this._worksConsumed = 0;
	}

	/** Get new mining work */
	get() {
		if(!(this._pool && this._pool._job)) return null;
		// if works are consumed faster than generated. Example:
		// we had single miner and cache refill was fast enough to provide enough works. Second miner connected
		// and requires an extra work on every job. Next this.update() should generate 2 jobs right away to prevent downtime
		if(!this._cache.length) {
			this._cacheDrained ++;
			this._generate();
		}
		// we're about to remove 1 cached work. schedule cache refill
		setImmediate(() => { 
			if(this._printScheduleWork) console.log(`Work: scheduled refill for job ${this._jobID}`); 
			this._generate(); 
		});
		this._worksConsumed ++;
		return this._cache.pop();
	}

	_generate() {
		var work = '';
		if(this._rpc2) {
			throw new Error('not implemented');
		}
		else {
			var coinbase = this._coinbase1;
			coinbase += this._xnonce;
			coinbase += hex.hex32(this._xnonce2); // again, assuming that _xnonce2 is 32bit
			coinbase += this._coinbase2;

			const tree = Merkle.tree(coinbase, this._leafs, RootFn[this._pool.config.algo]);

			this._xnonce2 = (this._xnonce2 + 1) >>> 0;

			work += this._version;
			work += this._prevhash;
			work += tree;
			work += this._time;
			work += this._bits;
			//work += '00000000'; // <-- 32bit nonce should be here
			work = Buffer.from(work, 'hex').swap32().toString('hex');
			work = {
				poolid: this._pool.id,
				jobid: this._jobID,
				height: this._height,

				header: work,
				nonce2: hex.hex32(this._xnonce2),
				time: this._time, 						// just in case if we will want to implement time rolling

				multiplier: this._multiplier,	// algo diff multiplier
				target: this._target,
				target64: this._target64,
			};
		}
		this._cache.push(work);
		this._worksCreated ++;
	}
}

module.exports = Work;