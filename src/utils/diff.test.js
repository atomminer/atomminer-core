const diff = require('./diff')

describe('diff utils test', () => {
	test('diff to target', () => {
		expect(diff.diffToTarget(1/256)).toBe(  '000000000000000000000000000000000000000000000000000000ffff000000');
		expect(diff.diffToTarget(1/128)).toBe(  '000000000000000000000000000000000000000000000000000080ff7f000000');
		expect(diff.diffToTarget(1/32)).toBe(   '0000000000000000000000000000000000000000000000000000e0ff1f000000');
		expect(diff.diffToTarget(1)).toBe(      '0000000000000000000000000000000000000000000000000000ffff00000000');
		expect(diff.diffToTarget(2)).toBe(      '0000000000000000000000000000000000000000000000000080ff7f00000000');
		expect(diff.diffToTarget(4)).toBe(      '00000000000000000000000000000000000000000000000000c0ff3f00000000');
		expect(diff.diffToTarget(16)).toBe(     '00000000000000000000000000000000000000000000000000f0ff0f00000000');
		expect(diff.diffToTarget(16384)).toBe(  '000000000000000000000000000000000000000000000000fcff030000000000');
		expect(diff.diffToTarget(65536)).toBe(  '000000000000000000000000000000000000000000000000ffff000000000000'); // 2 ** 16
		expect(diff.diffToTarget(4194304)).toBe('0000000000000000000000000000000000000000000000fcff03000000000000'); // 2 ** 22

		expect(diff.diffToTarget(0)).toBe(      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
		expect(diff.diffToTarget(null)).toBe(   'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
		expect(diff.diffToTarget({})).toBe(     'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
	});

	test('hash to diff', () => {
		expect(diff.hashToDiff('000000000000000000000000000000000000000000000000000080ff7f000000')).toBe(0.0078125);
		expect(diff.hashToDiff('0000000000000000000000000000000000000000000000000000ffff00000000')).toBe(1);
		expect(diff.hashToDiff('0000000000000000000000000000000000000000000000000080ff7f00000000')).toBe(2);

		expect(diff.hashToDiff('f43bf128ea9afc1edbe72efb75683d72251c678da50b4a286fd7c17800000000')).toBe(2.119924174272025);
	});
	
	test('diff to target64', () => {
		var t1, t2;
		t1 = diff.diffToTarget64(1/256); // 0.5
		t2 = diff.diffToTarget64(1/128); // 1
		expect(t1).toBe(0x000000ffff000000n); //0x000000ff ff000000n
		expect(t2).toBe(0x0000007fff800000n); //0x0000007f ff800000n
		expect(t1 > t2).toBe(true);

		expect(diff.diffToTarget64(1)).toBe(0x00000000ffff0000n);
		expect(diff.diffToTarget64(2)).toBe(0x000000007fff8000n);
		expect(diff.diffToTarget64(4)).toBe(0x000000003fffc000n);
		expect(diff.diffToTarget64(16)).toBe(0x000000000ffff000n);
		expect(diff.diffToTarget64(64)).toBe(0x0000000003fffc00n);
		expect(diff.diffToTarget64(16384)).toBe(0x000000000003fffcn);
		expect(diff.diffToTarget64(4194304)).toBe(0x00000000000003ffn);

		expect(diff.diffToTarget64(0)).toBe(0xffffffffffffffffn);
		expect(diff.diffToTarget64(0.00001)).toBe(0x00ffff0000000n);
	})

	test('bits <--> diff', () => {
		expect(diff.bitsToDiff(0x1a01b870)).toBe(9751444.325244784);  // LTC block 1979996  diff: 9751444.32524478  https://chainz.cryptoid.info/ltc/block.dws?1979996.htm
		expect(diff.bitsToDiff(0x1a0c6bb3)).toBe(1350725.7965388333); // GRS block 3416476  diff: 1350725.79653883  https://chainz.cryptoid.info/grs/block.dws?3416476.htm
		expect(diff.bitsToDiff(0x1c38a4ea)).toBe(4.519370276765958);  // 42  block 216421   diff: 4.51937028   https://chainz.cryptoid.info/42/block.dws?216421.htm
		expect(diff.bitsToDiff(0x1910a93f)).toBe(257779932.59782234); // DASH block 1402906 diff: 257779932.597822 https://explorer.dash.org/insight/block/00000000000000064c52afa28283a178dba9dc374ae4b8e208d1b9b13a000bb8
		expect(diff.bitsToDiff(0x1900896c)).toBe(8000872135.9681635);
		expect(diff.bitsToDiff(0x1e00896c)).toBe(0.007276750817225696);
		expect(diff.bitsToDiff('1a01b870')).toBe(9751444.325244784);

		expect(diff.bitsToDiff(0)).toBe(0);
		expect(diff.bitsToDiff(null)).toBe(0);
		expect(diff.bitsToDiff({})).toBe(0);
		expect(diff.bitsToDiff(0xffffffff)).toBe(0);

		expect(diff.diffToBits(9751444.32524478)).toBe(0x1a01b870);
		expect(diff.diffToBits(1350725.79653883)).toBe(0x1a0c6bb3);
		expect(diff.diffToBits(4.5193702767)).toBe(0x1c38a4ea);
		expect(diff.diffToBits(257779932.59782234)).toBe(0x1910a93f);

		expect(diff.diffToBits(0)).toBe(0);
		expect(diff.diffToBits(null)).toBe(0);
		expect(diff.diffToBits({})).toBe(0);
	});
})