/**
 * Difficulty decoding tools
 * @module utils/diff
 */

// reference:
// bits -> target (SetCompact() in bitcoin/src/arith_uint256.cpp)
// bits -> difficulty (GetDifficulty() in bitcoin/src/rpc/blockchain.cpp)
// target -> bits (GetCompact() in bitcoin/src/arith_uint256.cpp)

/**
 * Convert difficulty to full target
 * @param {Number} diff Difficulty
 * @return {string} 256-bit hex-encoded target
 */
const diffToTarget = (diff) => {
	// for (k = 6; k > 0 && diff > 1.0; k--)
	// 		diff /= 4294967296.0;
	// m = (uint64_t)(4294901760.0 / diff);
	// if (m == 0 && k == 6)
	// 		memset(target, 0xff, 32);
	// else {
	// 		memset(target, 0, 32);
	// 		target[k] = (uint32_t)m;
	// 		target[k + 1] = (uint32_t)(m >> 32);
	// }
	var buf = Buffer.alloc(32).fill(0);

	if(!isFinite(diff) || diff <= 0) {
		buf.fill(0xff);
		return buf.toString('hex');
	}

	var k = 6;
	for (; k > 0 && diff > 1.0; k--) {
		diff /= 4294967296.0;
	}
	var m = BigInt(4.294901760e+9 / diff)
	buf.writeUInt32LE(Number(0xffffffffn & m) >>> 0, k << 2);
	buf.writeUInt32LE(Number(m >> 32n) >>> 0, 4 + (k << 2));
	return buf.toString('hex');
}

/**
 * Convert difficulty to 64-bit MSB of the target
 * @param {Number} diff Difficulty
 * @return {BigInt} 64-bit MSB of the target
 */
const diffToTarget64 = (diff) => {
	// const t = diffToTarget(diff);
	// const buf = Buffer.from(t, 'hex').reverse();
	// var t64 = BigInt(buf.readUInt32BE(24) >>> 0) << 32n;
	// t64 = t64 | (BigInt(buf.readUInt32BE(28) >>> 0) & 0xffffffffn);
	// return t64;

	// const buf = Buffer.from(diffToTarget(diff), 'hex').reverse();
	// const t64 =
	// 					BigInt(buf[31]) << 56n |
	// 					BigInt(buf[30]) << 48n |
	// 					BigInt(buf[29]) << 40n |
	// 					BigInt(buf[28]) << 32n |
	// 					BigInt(buf[27]) << 24n |
	// 					BigInt(buf[26]) << 16n |
	// 					BigInt(buf[25]) << 8n  |
	// 					BigInt(buf[24]);
	// return t64;

	if(!isFinite(diff) || diff <= 0) return 0xffffffffffffffffn;

	var mod = 0x00ffff0000000n;
	var mult = 4096*diff; //(0x10 << 8)*diff;
	if(mult < 1) return mod;
	return mod / BigInt(mult);
}

/**
 * Convert hash/target to difficulty
 * @param {string} hash Hash value. Target can be used as hash
 * @return {Number} Difficulty
 */
const hashToDiff = (hash) => {
	const hn = Number(BigInt('0x'+Buffer.from(hash, 'hex').reverse().toString('hex')));
	const t1 = Number(0x00000000ffff0000000000000000000000000000000000000000000000000000n);
	return t1/hn;
}

/**
 * Convert nBits to 64-bit MSB of the resulting target
 * @param {Number} bits 32-bit nBits
 * @return {Number} Difficulty
 */
const bitsToDiff = (bits) => {
	var nb = typeof bits === 'string' ? parseInt(bits, 16) >>> 0 : bits;
	if(!isFinite(nb) || nb <= 0) return 0;
	var shift = (nb >>> 24) & 0xff;
	var d = 0x0000ffff / (nb & 0x00ffffff);
	while(shift < 29) {
		d *= 256.0;
		shift++;
	}

	while(shift > 29) {
		d /= 256.0;
		shift--;
	}
	return d;
}

/**
 * Convert difficulty to nBits
 * @param {Number} diff Difficulty
 * @return {Number} Bits
 */
const diffToBits = (diff) => {
	if(!isFinite(diff) || diff <= 0) return 0;
	for(var shiftBytes = 1; true; shiftBytes++) {
			var word = (0x00ffff * Math.pow(0x100, shiftBytes)) / diff;
			if (word >= 0xffff) break;
	}
	word &= 0xffffff;
	var size = 0x1d - shiftBytes;
	// the 0x00800000 bit denotes the sign, so if it is already set, divide the
	// mantissa by 0x100 and increase the size by a byte
	if (word & 0x800000) {
			word >>= 8;
			size++;
	}
	if ((word & ~0x007fffff) != 0) return 0;
	if (size > 0xff) return 0;
	var bits = (size << 24) | word;
	return bits;
}

module.exports = {
	diffToTarget,
	diffToTarget64,
	bitsToDiff,
	diffToBits,
	hashToDiff,
}