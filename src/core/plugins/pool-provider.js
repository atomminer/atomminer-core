/**
 * Test plugin if it meet requirements to be a pool provider plugin
 * @module core/plugins/pool-provider
 */

/**
 * Verify if provided plugin is valid pool-provider plugin
 * @param {object} p plugin to check
 */
const verify = (p) => {
  if(!p) return false;
  if(typeof p.get !== 'function') return false;
  return true;
}

module.exports = verify;