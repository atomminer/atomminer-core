const uuid = require('./uuid');

test('UUID', () => {
  const ids = [];
  for(var i = 0 ; i < 100 ; i ++) {
    const u = uuid();
    expect(ids.indexOf(u)).toBe(-1);
    ids.push(u);
  }
})