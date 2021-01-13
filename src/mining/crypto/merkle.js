const crypto = require('crypto');
/**
 * Calculate Merkle root and tree helper functions
 * @module mining/crypto/merkle
 */

 

/**
 * Returns single sha256 Merkle root
 * @param {string} root Merkle root initial value
 * @return {string} HEX encoded Merkle root
 */
const single = (root) => {
	return crypto.createHash('sha256').update(Buffer.from(root, "hex")).digest('hex');
}

/**
 * Returns double sha256 Merkle root
 * @param {string} root Merkle root initial value
 * @return {string} HEX encoded Merkle root
 */
const double = (root) => {
	var buf = crypto.createHash('sha256').update(Buffer.from(root, "hex")).digest();
	return crypto.createHash('sha256').update(buf).digest('hex');
}


/**
 * Calculate Merkle tree given root and leafs
 * @param {string} root='' Merkle root initial value (hex)
 * @param {Array} leafs=[] Array of hex-encoded leafs
 * @param {function} fn=double
 * @returns {string} Merkle tree
 */
const tree = (root, leafs, fn=double) => {
	var tree = fn(root);
	var buf;
	for(var l of leafs) {
		tree += l;
		buf = crypto.createHash('sha256').update(Buffer.from(tree, "hex")).digest();
		tree = crypto.createHash('sha256').update(buf).digest('hex');
	}
	buf = null;
	return tree;
}

module.exports = {
	single,
	double,
	tree,
}