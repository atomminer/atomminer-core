const hex = require('./hex')

test('HEX', () => {
  expect(hex.hex32(0)).toBe('00000000');
  expect(hex.hex32(0.0012)).toBe('00000000');
  expect(hex.hex32(0xff)).toBe('000000ff');
  expect(hex.hex32(-1)).toBe('ffffffff');

  expect(hex.hex32(null)).toBe('00000000');
  expect(hex.hex32({})).toBe('00000000'); 
  expect(hex.hex32('beef')).toBe('00000000');

  expect(hex.hex64(0)).toBe('0000000000000000');
  expect(hex.hex64(0.0012)).toBe('0000000000000000');
  expect(hex.hex64(0xff)).toBe('00000000000000ff');
  expect(hex.hex64(-1)).toBe('ffffffffffffffff');

  expect(hex.hex64(null)).toBe('0000000000000000');
  expect(hex.hex64({})).toBe('0000000000000000'); 
  expect(hex.hex64('beef')).toBe('0000000000000000');
});
