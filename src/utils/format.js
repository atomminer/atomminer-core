/**
 * Various helper formatters.
 * @module utils/format
 */

/**
 * Format number
 * @param {number} i Hashrate in hash/seconds
 * @param {number} precision=2 Precision
 * @param {number} base=1000 Base
 * @returns {string} Formatted hashrate
 */
const number = (i, precision = 2, base=1000) => {
	if(!(isFinite(precision) && precision >= 0)) precision = 2;
	if(typeof i !== 'number') return '';
	if(i == 0) return i.toFixed(precision);
	const sizes = ['', ' K', ' M', ' G', ' T', ' P', ' E'];
	const sign = i < 0 ? -1 : 1;
	i = Math.abs(i);
	const idx = parseInt(Math.floor(Math.log(i) / Math.log(base)))
	if(idx <= 0) return (sign * i).toFixed(precision);
	return (sign * i / Math.pow(base, idx)).toFixed(precision) + (sizes[idx] || ' ?');
}

/**
* Format hashrate to human-readable form 
* @param {number} i Hashrate in hash/seconds
* @param {number} precision Precision
* @returns {string} Formatted hashrate
*/
const hashrate = (i, precision = 2) => {
	return number(i, precision);
}

/**
	* Format size to human-readable form 
	* @param {number} i Size/speed in bytes
	* @param {number} precision Precision
	* @returns {string} Formatted size
	*/
const size = (i, precision = 2) => {
	return number(i, precision, 1024);
}

module.exports = {
	number,
	hashrate,
	size,
}