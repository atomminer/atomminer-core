
function swap16(val) {
	return ((val & 0xFF) << 8)
				 | ((val >> 8) & 0xFF);
}

function swap32(val) {
	return ((val & 0xFF) << 24)
				 | ((val & 0xFF00) << 8)
				 | ((val >> 8) & 0xFF00)
				 | ((val >> 24) & 0xFF);
}

module.exports = {
	swap16,
	swap32,
}