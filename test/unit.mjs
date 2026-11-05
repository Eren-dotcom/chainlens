// Offline unit tests for the metric math. Run: npm test
import assert from 'node:assert';
import { blockTimeFromWindow, finalityLag, finalitySeconds, pickWinners } from '../src/metrics.js';
import { hexToInt } from '../src/rpc.js';

// hexToInt: strict quantity parsing — null (never NaN) for malformed input
assert.equal(hexToInt('0x10'), 16);
assert.equal(hexToInt('0x0'), 0);
assert.equal(hexToInt('0xFF'), 255);
assert.equal(hexToInt('1699999999'), null); // a decimal string is not a hex quantity
assert.equal(hexToInt('0x'), null);
assert.equal(hexToInt(''), null);
assert.equal(hexToInt(undefined), null);
assert.equal(hexToInt(null), null);
assert.equal(hexToInt(42), 42);
assert.equal(hexToInt(NaN), null);

// blockTimeFromWindow
assert.equal(blockTimeFromWindow({ height: 120, timestamp: 720 }, { height: 100, timestamp: 600 }), 6);
assert.equal(blockTimeFromWindow({ height: 50, timestamp: 100 }, { height: 40, timestamp: 80 }), 2);
assert.equal(blockTimeFromWindow(null, { height: 1, timestamp: 1 }), null);
assert.equal(blockTimeFromWindow({ height: 10, timestamp: 5 }, { height: 10, timestamp: 5 }), null); // no progress

// finalityLag
assert.equal(finalityLag(105, 103), 2);
assert.equal(finalityLag(100, 104), 0); // clamped, never negative
assert.equal(finalityLag(null, 5), null);
assert.equal(finalityLag(5, null), null);

// finalitySeconds
assert.equal(finalitySeconds(2, 6), 12);
assert.equal(finalitySeconds(65, 12), 780);
assert.equal(finalitySeconds(null, 6), null);
assert.equal(finalitySeconds(2, null), null);
assert.equal(finalitySeconds(0, null), 0); // fully finalized: 0s by definition, no block time needed
assert.equal(finalitySeconds(0, 6), 0);

// pickWinners: min per category, skips failed chains and null metrics
const chains = {
  a: { ok: true, blockTimeSec: 6, finalitySec: 15, gasWei: 22000 },
  b: { ok: true, blockTimeSec: 2, finalitySec: 780, gasWei: 1000000000 },
  c: { ok: false, blockTimeSec: 1, finalitySec: 1, gasWei: 1 }, // failed: must be ignored despite "best" numbers
  d: { ok: true, blockTimeSec: null, finalitySec: null, gasWei: null }, // no data: skipped
};
const w = pickWinners(chains);
assert.equal(w.fastestBlockTime.chain, 'b');
assert.equal(w.fastestFinality.chain, 'a');
assert.equal(w.lowestGas.chain, 'a');
// a NaN metric must be skipped, not crown a winner or block later candidates
const nanW = pickWinners({
  first: { ok: true, blockTimeSec: NaN, finalitySec: NaN, gasWei: NaN },
  second: { ok: true, blockTimeSec: 6, finalitySec: 12, gasWei: 100 },
});
assert.equal(nanW.fastestBlockTime.chain, 'second');
assert.equal(nanW.lowestGas.chain, 'second');
assert.equal(pickWinners({}).fastestFinality, null);
assert.equal(pickWinners({ x: { ok: true, blockTimeSec: null, finalitySec: null, gasWei: null } }).lowestGas, null);

console.log('unit tests: PASS');
