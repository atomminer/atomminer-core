/**
 * This is pure js version of keccak with no dependencies, as used in keccak(c) coins.
 * Performance of this method is rather sad, however works well for one-tim jobs like verify solution
 * 
 * DO NOT use for mining!
 * 
 * NOTE: requires 80-byte hex encoded message. Throws exception on wrong data.
 * Reason: hardcoded padding and constants. Use caution
 * 
 * @module mining/crypto/keccak
 */

// keccak test vector (maxcoin):
//console.log(hash('002c3c20fa06a3604606bead2b14d8dd51cc0580c1d4330fd329ff0f6ebd41ad8b010000c4907e9503f3b2d1e03e75e7a6a0d4ae54f1283afcbaf32e573ff25261858ea15c4ecf5f52f73b1b819b4e3c'));
//> 3ed475841026d5b07a1dea9d0f8642b380451c4cc2d006301ede4cefe7000000

const roundconsts = [
	0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an,
	0x8000000080008000n, 0x000000000000808bn, 0x0000000080000001n,
	0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an,
	0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
	0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n,
	0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n,
	0x000000000000800an, 0x800000008000000an, 0x8000000080008081n,
	0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n
];

const ROTL64 = (x, n) => {
	return 0xffffffffffffffffn & ((0xffffffffffffffffn &(x << BigInt(n))) | ((x) >> (BigInt(64) - BigInt(n))));
}

// assuming block is BE already
const hash = (block) => {
	if(block.length != 160) throw new Error('Only 80-byte blocks are supported');
	const st = [];
	const bc = [];
	const pad = '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
	var i = 0;

	//const paddeddata = block.length % 2 ? ('0'+block) : block;
	const paddeddata = block;
	thedata = paddeddata + pad; //thedata.substr(paddeddata.length);
	const dlen = paddeddata.length / 2;
	
	var buf = Buffer.from(thedata, 'hex');
	for(i = 0 ; i < 25 ; i++) st.push(buf.readBigUInt64LE(i*8));
	// padding
	st[10] = 1n;
	st[16] = 0x8000000000000000n;
	buf = null;

	const round = (n) => {
		// theta
		bc[0] = st[4] ^ st[9] ^ st[14] ^ st[19] ^ st[24] ^ ROTL64(st[1] ^ st[6] ^ st[11] ^ st[16] ^ st[21], 1);
		bc[1] = st[0] ^ st[5] ^ st[10] ^ st[15] ^ st[20] ^ ROTL64(st[2] ^ st[7] ^ st[12] ^ st[17] ^ st[22], 1);
		bc[2] = st[1] ^ st[6] ^ st[11] ^ st[16] ^ st[21] ^ ROTL64(st[3] ^ st[8] ^ st[13] ^ st[18] ^ st[23], 1);
		bc[3] = st[2] ^ st[7] ^ st[12] ^ st[17] ^ st[22] ^ ROTL64(st[4] ^ st[9] ^ st[14] ^ st[19] ^ st[24], 1);
		bc[4] = st[3] ^ st[8] ^ st[13] ^ st[18] ^ st[23] ^ ROTL64(st[0] ^ st[5] ^ st[10] ^ st[15] ^ st[20], 1);
	
		st[0] ^= bc[0]; 
		
		// rho
		tmp = ROTL64(st[ 1] ^ bc[1], 1n);
		st[ 1] = ROTL64(st[ 6] ^ bc[1], 44n);
		st[ 6] = ROTL64(st[ 9] ^ bc[4], 20n);
		st[ 9] = ROTL64(st[22] ^ bc[2], 61n);
		st[22] = ROTL64(st[14] ^ bc[4], 39n);
		st[14] = ROTL64(st[20] ^ bc[0], 18n);
		st[20] = ROTL64(st[ 2] ^ bc[2], 62n);
		st[ 2] = ROTL64(st[12] ^ bc[2], 43n);
		st[12] = ROTL64(st[13] ^ bc[3], 25n);
		st[13] = ROTL64(st[19] ^ bc[4],  8n);
		st[19] = ROTL64(st[23] ^ bc[3], 56n);
		st[23] = ROTL64(st[15] ^ bc[0], 41n);
		st[15] = ROTL64(st[ 4] ^ bc[4], 27n);
		st[ 4] = ROTL64(st[24] ^ bc[4], 14n);
		st[24] = ROTL64(st[21] ^ bc[1],  2n);
		st[21] = ROTL64(st[ 8] ^ bc[3], 55n);
		st[ 8] = ROTL64(st[16] ^ bc[1], 45n);
		st[16] = ROTL64(st[ 5] ^ bc[0], 36n);
		st[ 5] = ROTL64(st[ 3] ^ bc[3], 28n);
		st[ 3] = ROTL64(st[18] ^ bc[3], 21n);
		st[18] = ROTL64(st[17] ^ bc[2], 15n);
		st[17] = ROTL64(st[11] ^ bc[1], 10n);
		st[11] = ROTL64(st[ 7] ^ bc[2],  6n);
		st[ 7] = ROTL64(st[10] ^ bc[0],  3n);
		st[10] = tmp; // meta: r%rn%-rho
	
		// chi
		bc[0] = st[ 0]; bc[1] = st[ 1]; 
		st[ 0] ^= (~bc[1]) & st[ 2]; 
		st[ 1] ^= (~st[ 2]) & st[ 3]; 
		st[ 2] ^= (~st[ 3]) & st[ 4]; 
		st[ 3] ^= (~st[ 4]) & bc[0]; 
		st[ 4] ^= (~bc[0]) & bc[1];
		
		bc[0] = st[ 5]; bc[1] = st[ 6]; 
		st[ 5] ^= (~bc[1]) & st[ 7]; 
		st[ 6] ^= (~st[ 7]) & st[ 8]; 
		st[ 7] ^= (~st[ 8]) & st[ 9]; 
		st[ 8] ^= (~st[ 9]) & bc[0]; 
		st[ 9] ^= (~bc[0]) & bc[1];
		
		bc[0] = st[10]; bc[1] = st[11]; 
		st[10] ^= (~bc[1]) & st[12]; 
		st[11] ^= (~st[12]) & st[13]; 
		st[12] ^= (~st[13]) & st[14]; 
		st[13] ^= (~st[14]) & bc[0]; 
		st[14] ^= (~bc[0]) & bc[1];
		
		bc[0] = st[15]; bc[1] = st[16]; 
		st[15] ^= (~bc[1]) & st[17]; 
		st[16] ^= (~st[17]) & st[18]; 
		st[17] ^= (~st[18]) & st[19]; 
		st[18] ^= (~st[19]) & bc[0]; 
		st[19] ^= (~bc[0]) & bc[1];
		
		bc[0] = st[20]; bc[1] = st[21]; 
		st[20] ^= (~bc[1]) & st[22]; 
		st[21] ^= (~st[22]) & st[23]; 
		st[22] ^= (~st[23]) & st[24]; 
		st[23] ^= (~st[24]) & bc[0]; 
		st[24] ^= (~bc[0]) & bc[1];
	
		// Iota
		st[0] ^= roundconsts[n];
	}

	i = 0;
	for(; i < 24 ; i++) round(i);

	buf = Buffer.alloc(200);
	for(i = 0 ; i < 25 ; i++) st[i] = buf.writeBigUInt64LE(st[i], i*8);
	const hash = buf.toString('hex').substr(0, 64);
	buf = null;
	return hash;
}

module.exports = hash;