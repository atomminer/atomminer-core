/**
 * Hex utils
 * @module utils/hex
 */

 /**
 * Convert uint32_t to hex with padding
 * @param {Number} v Numeric value
 * @return {string} Hex string
 */
const hex32 = v => {
  if(!isFinite(v)) return '00000000';
  return ('00000000' + (parseInt(v) >>> 0).toString(16)).substr(-8);
}

/**
 * Convert uint64_t to hex with padding
 * @param {Number|BigInt} v Numeric value
 * @return {string} Hex string
 */
const hex64 = v => {
  if(!v) return '0000000000000000';
  return ('0000000000000000' + BigInt.asUintN(64, BigInt(~~v)).toString(16)).substr(-16);
}

module.exports = {
  hex32,
  hex64
}