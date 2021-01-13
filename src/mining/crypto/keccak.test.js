const keccak = require('./keccak')
test('keccak implementation', () => {
  expect(keccak('002c3c20fa06a3604606bead2b14d8dd51cc0580c1d4330fd329ff0f6ebd41ad8b010000c4907e9503f3b2d1e03e75e7a6a0d4ae54f1283afcbaf32e573ff25261858ea15c4ecf5f52f73b1b819b4e3c')).toBe('3ed475841026d5b07a1dea9d0f8642b380451c4cc2d006301ede4cefe7000000');
  expect(keccak('70000000edccf8ca4900d02d34e974ff8eabfeada9df4b87ba8339eff2e9b000000000006f3f05558a1b5d8678ce0e979fc2e8d53793ecb55ab9135d45cb8bf9b870da347b05fd5f73ae001c2d30b66d')).toBe('f43bf128ea9afc1edbe72efb75683d72251c678da50b4a286fd7c17800000000');
  expect(() => keccak('')).toThrow(Error);
  expect(() => keccak(null)).toThrow(Error);
  expect(() => keccak({})).toThrow(Error);
  expect(() => keccak([null,1,2])).toThrow(Error);
})