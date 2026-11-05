// Shared poller instance for the Vercel serverless functions.
// On Vercel there is no long-running process, so instead of polling on a
// timer, each API request takes one fresh live sample. Counters, history
// and the previous-observation state (needed for block-time math)
// accumulate for as long as the function instance stays warm.
import { Poller } from '../src/poller.js';

let poller = null;
let warming = null;

export function getPoller() {
  if (!poller) poller = new Poller();
  return poller;
}

export async function sampleOnce() {
  const p = getPoller();
  if (Object.keys(p.prevObs).length === 0) {
    // Cold instance: block time needs two observations. Warm up once —
    // concurrent cold requests share this same memoized warm-up, and
    // Poller.sample() itself queues, so no duplicate rounds can run.
    if (!warming) {
      warming = (async () => {
        await p.sample();
        await new Promise((r) => setTimeout(r, Math.min(p.cfg.pollMs, 6000)));
        await p.sample();
      })();
    }
    await warming;
  } else {
    await p.sample();
  }
  return p;
}
