// Live smoke test: one real sample against every watched chain.
// Run: npm run smoke — needs network access to the public RPCs.
import { Poller } from '../src/poller.js';

const p = new Poller();
await p.sample(); // block time is measured between consecutive samples
await new Promise((r) => setTimeout(r, p.cfg.pollMs));
const s = await p.sample();

let fail = 0;
for (const [key, c] of Object.entries(s.chains)) {
  console.log(`${key.padEnd(10)} ok=${c.ok} height=${c.height} blockTime=${c.blockTimeSec}s finalityLag=${c.finalityLagBlocks} blocks (~${c.finalitySec}s) gas=${c.gasWei} wei${c.error ? ' error=' + c.error : ''}`);
  if (key === 'portaldot' && !c.ok) fail = 1; // the home chain must answer
}
const okCount = Object.values(s.chains).filter((c) => c.ok).length;
console.log(`substrate cross-check: ok=${s.substrate?.ok} lag=${s.substrate?.lagBlocks} blocks`);
console.log(`winners: finality=${s.winners.fastestFinality?.chain} blockTime=${s.winners.fastestBlockTime?.chain} gas=${s.winners.lowestGas?.chain}`);
if (okCount < 3) { console.log('smoke: FAIL (fewer than 3 chains answered)'); process.exit(1); }
if (!s.substrate?.ok) { console.log('smoke: FAIL (substrate cross-check down)'); process.exit(1); }
if (fail) { console.log('smoke: FAIL (portaldot down)'); process.exit(1); }
// Metric sanity, from live data: Portaldot blocks are 6s and finalize in seconds.
const pd = s.chains.portaldot;
if (!(pd.blockTimeSec >= 5 && pd.blockTimeSec <= 7)) { console.log(`smoke: FAIL (portaldot blockTime ${pd.blockTimeSec}s, expected ~6)`); process.exit(1); }
if (!(pd.finalitySec != null && pd.finalitySec <= 60)) { console.log(`smoke: FAIL (portaldot finality ${pd.finalitySec}s, expected seconds)`); process.exit(1); }
if (s.chains.amoy.finalitySec !== null) { console.log('smoke: FAIL (amoy finality must be n/a, not a number)'); process.exit(1); }
console.log('smoke: PASS');
