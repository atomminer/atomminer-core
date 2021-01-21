/**
 * Create unique ID. Unlike GUID, this one does not include dashes and easier to use to identify objects
 * @module utils/uid
 */
const crypto = require('crypto');

const uuid = () => {
  return ([1e7]+1e3+4e3+8e3+1e11).replace(/[018]/g, c =>
    (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
  );
}
module.exports = uuid;