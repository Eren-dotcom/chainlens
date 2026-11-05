// Shared poller instance for the Vercel serverless functions.
// On Vercel there is no long-running process, so instead of polling on a
// timer, each API request takes one fresh live sample. Counters, history
// and the previous-observation state (needed for block-time math)
// accumulate for as long as the function instance stays warm.
import { Poller } from '../src/poller.js';

let poller = null;

export function getPoller() {
  if (!poller) poller = new Poller();
  return poller;
}

export async function sampleOnce() {
  const p = getPoller();
  const cold = Object.keys(p.prevObs).length === 0;
  await p.sample();
  if (cold) {
    // Block time is measured between two observations; on a cold instance
    // take the second one right away so the first response is complete.
    await new Promise((r) => setTimeout(r, 6000));
    await p.sample();
  }
  return p;
}
