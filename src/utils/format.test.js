const fmt = require('./format');

test('Format', () => {
  ///////////////////////////////////////////////////////////////////
  // number
  expect(fmt.number(0)).toBe('0.00');
  expect(fmt.number('')).toBe('');
  expect(fmt.number('test')).toBe('');
  expect(fmt.number(null)).toBe('');
  expect(fmt.number({})).toBe('');
  expect(fmt.number(1024, 0, 2)).toBe('1 ?'); // overflow

  expect(fmt.number(-1000, 1)).toBe('-1.0 K');

  expect(fmt.number(1000, 1)).toBe('1.0 K');
  expect(fmt.number(1030000, 2)).toBe('1.03 M');

  expect(fmt.number(2340000, 0)).toBe('2 M');

  expect(fmt.number(1030000000, 2)).toBe('1.03 G');
  expect(fmt.number(1030000000000, 2)).toBe('1.03 T');
  expect(fmt.number(1030000000000000, 2)).toBe('1.03 P');
  expect(fmt.number(1030000000000000000, 2)).toBe('1.03 E');

  expect(fmt.number(1030000, -2354)).toBe('1.03 M');
  ///////////////////////////////////////////////////////////////////
  // hashrate
  expect(fmt.hashrate(0)).toBe('0.00');
  expect(fmt.hashrate('')).toBe('');
  expect(fmt.hashrate('test')).toBe('');
  expect(fmt.hashrate(null)).toBe('');
  expect(fmt.hashrate({})).toBe('');

  expect(fmt.hashrate(-1000, 1)).toBe('-1.0 K');

  expect(fmt.hashrate(1000, 1)).toBe('1.0 K');
  expect(fmt.hashrate(1030000, 2)).toBe('1.03 M');

  expect(fmt.hashrate(1030000000, 2)).toBe('1.03 G');
  expect(fmt.hashrate(1030000000000, 2)).toBe('1.03 T');
  expect(fmt.hashrate(1030000000000000, 2)).toBe('1.03 P');
  expect(fmt.hashrate(1030000000000000000, 2)).toBe('1.03 E');

  expect(fmt.hashrate(1030000, -2354)).toBe('1.03 M');
  ///////////////////////////////////////////////////////////////////
  // hashrate
  expect(fmt.size(0)).toBe('0.00');
  expect(fmt.size('')).toBe('');
  expect(fmt.size('test')).toBe('');
  expect(fmt.size(null)).toBe('');
  expect(fmt.size({})).toBe('');

  expect(fmt.size(1000, 1)).toBe('1000.0');
  expect(fmt.size(1024, 1)).toBe('1.0 K');
  expect(fmt.size(1030000, 2)).toBe('1005.86 K');

  expect(fmt.size(1500000000, 2)).toBe('1.40 G');
  expect(fmt.size(1700000000000, 3)).toBe('1.546 T');
  expect(fmt.size(1800000000000000, 2)).toBe('1.60 P');
  expect(fmt.size(1900000000000000000, 2)).toBe('1.65 E');

  expect(fmt.size(1060000, -2354)).toBe('1.01 M');
});