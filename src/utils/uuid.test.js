const uid = require('./uuid');

test('UID', () => {
  const ids = [];
  for(var i = 0 ; i < 100 ; i ++) {
    const u = uid();
    expect(ids.indexOf(u)).toBe(-1);
    ids.push(u);
  }
})