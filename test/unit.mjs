// Offline unit tests for the metric math. Run: npm test
import assert from 'node:assert';
import { blockTimeFromWindow, finalityLag, finalitySeconds, pickWinners, shapeMetrics, summarize, historyToCsv, CSV_HEADER, badgeSvg, finalityIndex, finalityStatus } from '../src/metrics.js';
import { hexToInt } from '../src/rpc.js';
import { CHAINS } from '../src/chains.js';

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

// B2: an absurdly long (regex-valid) hex quantity must degrade to null,
// never Infinity — Number(BigInt(h)) overflows for very long strings
assert.equal(hexToInt('0x' + 'f'.repeat(300)), null);

// shapeMetrics: the /api/metrics document keeps a stable, adoptable shape
const skel = shapeMetrics(null);
assert.equal(skel.spec, 'chainlens-metrics/1');
assert.deepEqual(skel.chains, {});
assert.equal(skel.generatedAt, null);
const shaped = shapeMetrics({
  ts: '2026-11-05T00:00:00.000Z',
  chains: { a: { name: 'A', chainId: 1, ok: true, height: 10, blockTimeSec: 6, finalizedHeight: 8, finalityLagBlocks: 2, finalitySec: 12, finalitySkew: false, gasWei: 100, reliabilityPct: 100, finalityNote: null, error: null, blocksSinceStart: 3 } },
  substrate: { ok: true, latest: 10, finalized: 8, lagBlocks: 2 },
  winners: { fastestFinality: { chain: 'a', value: 12 } },
});
assert.equal(shaped.chains.a.finalitySec, 12);
assert.equal(shaped.chains.a.finalitySkew, false);
assert.equal('error' in shaped.chains.a, false); // internal fields are not published
assert.equal(shaped.winners.fastestFinality.chain, 'a');

// summarize: session stats over the history ring (v2)
// 20 samples, finality 10,20,...,200 -> avg 105, p95 nearest-rank = 190, min 10, max 200
const hist = [];
for (let i = 1; i <= 20; i++) {
  hist.push({ ts: `t${i}`, chains: {
    a: { ok: true, finalitySec: i * 10, blockTimeSec: 6, gasWei: 1000 + i },
    b: { ok: i > 2, finalitySec: null, blockTimeSec: 2, gasWei: 500 }, // Amoy-like: never a measured finality; 2 failed rounds
  } });
}
const sum = summarize(hist);
assert.equal(sum.a.samples, 20);
assert.equal(sum.a.finalitySec.min, 10);
assert.equal(sum.a.finalitySec.avg, 105);
assert.equal(sum.a.finalitySec.p95, 190);
assert.equal(sum.a.finalitySec.max, 200);
assert.equal(sum.a.blockTimeSecAvg, 6);
assert.equal(sum.a.gasWeiAvg, 1011); // avg of 1001..1020 = 1010.5, rounded
assert.equal(sum.a.reliabilityPct, 100);
assert.equal(sum.b.finalitySec, null); // n/a chain: no invented stats
assert.equal(sum.b.samples, 20);
assert.equal(sum.b.reliabilityPct, 90); // 18/20 ok
assert.deepEqual(summarize([]), {});

// historyToCsv: header + one row per chain per sample, nulls as empty cells
const csv = historyToCsv([{ ts: '2026-11-05T00:00:00.000Z', chains: {
  a: { height: 10, finalizedHeight: 8, finalityLagBlocks: 2, finalitySec: 12, blockTimeSec: 6, gasWei: 100, txCount: 3, gasUsed: 21000, rpcLatencyMs: 120 },
  b: { height: 5, finalizedHeight: null, finalityLagBlocks: null, finalitySec: null, blockTimeSec: 2, gasWei: 7, txCount: 0, gasUsed: 0, rpcLatencyMs: 80 },
} }]);
const lines = csv.trimEnd().split('\n');
assert.equal(lines[0], CSV_HEADER);
assert.equal(lines[1], '2026-11-05T00:00:00.000Z,a,10,8,2,12,6,100,3,21000,120');
assert.equal(lines[2], '2026-11-05T00:00:00.000Z,b,5,,,,2,7,0,0,80');
assert.equal(historyToCsv([]), CSV_HEADER + '\n');

// badgeSvg: chain name + measured value in the SVG; Amoy -> n/a; no sample -> no data
const pdCfg = { key: 'portaldot', short: 'Portaldot V3' };
const amoyCfg = { key: 'amoy', short: 'Amoy', finalityTag: false };
const badge = badgeSvg(pdCfg, { ok: true, finalitySec: 12 });
assert.ok(badge.includes('<svg'));
assert.ok(badge.includes('CHAINLENS · PORTALDOT V3'));
assert.ok(badge.includes('finality ≈12s'));
assert.ok(badge.includes('#FF5A36'));
assert.ok(badgeSvg(amoyCfg, { ok: true, finalitySec: null }).includes('finality n/a'));
assert.ok(badgeSvg(pdCfg, null).includes('finality no data'));
assert.ok(badgeSvg(pdCfg, { ok: true, finalitySec: 780 }).includes('finality ≈13m'));

// --- v3: finalityIndex ---
assert.equal(finalityIndex(5), 100);
assert.equal(finalityIndex(1800), 0);
assert.equal(finalityIndex(null), null);
assert.equal(finalityIndex(NaN), null);
assert.equal(finalityIndex(2), 100); // clamped
assert.equal(finalityIndex(99999), 0); // clamped
const midIdx = finalityIndex(95);
assert.ok(midIdx > 40 && midIdx < 60, `finalityIndex(95)=${midIdx} should be 40..60`);
assert.ok(finalityIndex(10) > finalityIndex(100) && finalityIndex(100) > finalityIndex(1000)); // monotonic decreasing

// --- v3: finalityStatus — all four branches ---
assert.equal(finalityStatus(5, 10, 8), 'final');
assert.equal(finalityStatus(8, 10, 8), 'final');
assert.equal(finalityStatus(9, 10, 8), 'pending');
assert.equal(finalityStatus(11, 10, 8), 'not-seen');
assert.equal(finalityStatus(null, 10, 8), 'unknown');
assert.equal(finalityStatus(5, null, 8), 'unknown');
assert.equal(finalityStatus(5, 10, null), 'unknown');
assert.equal(finalityStatus(NaN, 10, 8), 'unknown');

// --- v3: summarize gasStats + finalityIndex ---
// gas fixture: 100,200,...,1000 -> p50 nearest-rank = 500, p95 = 1000, avg 550
const hist3 = [];
for (let i = 1; i <= 10; i++) {
  hist3.push({ ts: `t${i}`, chains: {
    g: { ok: true, finalitySec: 12, blockTimeSec: 6, gasWei: i * 100 },
    n: { ok: true, finalitySec: null, blockTimeSec: 2, gasWei: 7 },
  } });
}
const sum3 = summarize(hist3);
assert.equal(sum3.g.gasStats.avg, 550);
assert.equal(sum3.g.gasStats.p50, 500);
assert.equal(sum3.g.gasStats.p95, 1000);
assert.equal(sum3.g.gasStats.max, 1000);
assert.equal(sum3.g.finalityIndex, finalityIndex(12));
assert.equal(sum3.n.finalityIndex, null); // n/a chain: no invented index
assert.equal(sum3.n.gasStats.avg, 7);
assert.deepEqual(summarize([{ ts: 'x', chains: { z: { ok: false, finalitySec: null, blockTimeSec: null, gasWei: null } } }]).z.gasStats, null);

// --- v3: chains config integrity ---
const keys = CHAINS.map((c) => c.key);
assert.equal(new Set(keys).size, keys.length, 'chain keys unique');
assert.equal(new Set(CHAINS.map((c) => c.chainId)).size, CHAINS.length, 'chainIds unique');
assert.equal(CHAINS.length, 9);
for (const c of CHAINS) {
  assert.ok(c.network === 'testnet' || c.network === 'mainnet', `${c.key} has network`);
  assert.ok(Array.isArray(c.endpoints) && c.endpoints.length >= 1, `${c.key} has endpoints`);
  assert.equal(c.endpoints[0], c.rpc, `${c.key} endpoints[0] === rpc`);
}

// --- v3: badgeSvg new chains ---
const arbCfg = CHAINS.find((c) => c.key === 'arbitrum');
assert.ok(badgeSvg(arbCfg, { ok: true, finalitySec: 900 }).includes('ARBITRUM SEPOLIA'));
const polyCfg = CHAINS.find((c) => c.key === 'polygon-mainnet');
assert.ok(badgeSvg(polyCfg, { ok: true, finalitySec: null }).includes('finality n/a'));

console.log('unit tests: PASS');
