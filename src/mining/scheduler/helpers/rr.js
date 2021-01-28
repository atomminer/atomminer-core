
class RoundRobinBase {
	constructor() {
		this.minerids = [];
		this.poolids = [];
		this.minerpool = {}; // current assignment(s)
		this.poolfactor = 1; // object or number; {poolid: factor}

		this.cbAssigned = null; // callback. fired for every miner when it is assigned/reassigned to the new pool
	}

	/**
	 * add miner and assign it to the pool (initial)
	 * @param {string} id Miner id
	 * @returns poolid Return ID of the pool this miner is assigned to or null if no pools available
	 */
	addminer(id) {
		if(this.minerids.indexOf(id) == -1) this.minerids.push(id);
		var poolid = this.minerpool[id];
		if(poolid) return poolid; // if it is already assigned for any unknown reason
		this.minerpool[id] = this.assign(id);
		return this.minerpool[id];
	}

	/** remove miner and clear its assignment */
	removeminer(id) {
		const idx = this.minerids.indexOf(id);
		if(idx == -1) return;
		this.minerids.splice(idx, 1);
		if(this.minerpool[id]) delete this.minerpool[id];
	}

	/** Update current list of pools */
	updatepools(pools) {
		if(!(pools && Array.isArray(pools))) pools = [];
		this.poolids = pools;
		for(var a of Object.keys(this.minerpool)) {
			if(this.poolids.indexOf(this.minerpool[a]) == -1) delete this.minerpool[a];
		}
	}

	/** Returns list (IDs) of unassigned miners */
	unassigned() {
		return this.minerids.filter(m => !this.minerpool[m]);
		// var list = [];
		// if(Object.keys(this.minerpool).length == this.minerids.length) return [];

		// const assigned = Object.keys(this.minerpool);
		// for(var m of this.minerids) {
		// 	if(assigned.indexOf(m) == -1) list.push(m);
		// }

		// return list;
	}

	/** Return list of miners assigned to the pool */
	minersByPool(poolid) {
		return Object.keys(this.minerpool).filter(m => this.minerpool[m] === poolid);
	}

	/** Add pool. Can be added multiple times. Good idea to use assignminers() right after to take care of unassigned miners */
	addpool(id) {
		const idx = this.poolids.indexOf(id);
		if(idx == -1) this.poolids.push(id);
		for(var m of this.unassigned()) this.assign(m);
	}

	/** 
	 * Remove pool and clear miners that were assigned to it 
	 * @returns list of affected miners
	 */
	removepool(id) {
		const idx = this.poolids.indexOf(id);
		const list = [];
		if(idx == -1) return [];
		this.poolids.splice(idx, 1);
		for(var a of Object.keys(this.minerpool)) {
			if(this.minerpool[a] === id) {
				list.push(a);
				delete this.minerpool[a];
			}
		}
		return list;
	}

	/**
	 * Assign miner to the pool. Will attempt to spread miners during initial assignment
	 * @param {string} id Miner ID
	 * @returns poolid this miner is assigned to or null if no pools
	 */
	assign(id) {
		// big todo: in case of multiple miners we should try to assign them to the different pools to maximize efficiency
		const nextpool = (poolid) => {
			if(!this.poolids.length) return null;
			if(this.poolids.length == 1) return this.poolids[0];
			var idx = this.poolids.indexOf(poolid) + 1;
			if(idx >= this.poolids.length) idx = 0
			return this.poolids[idx];
		}
		const poolid = nextpool(this.minerpool[id] || null);
		if(poolid) {
			this.minerpool[id] = poolid;
			this.cbAssigned && this.cbAssigned(id, poolid);
		}
		return;
	}
}

module.exports = RoundRobinBase;