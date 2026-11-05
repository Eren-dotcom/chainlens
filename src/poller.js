// Multi-chain polling engine. Every poll samples every watched chain in
// parallel; a chain that drops a request degrades to ok=false for that
// sample instead of failing the round (public RPCs drop requests — the
// per-chain reliability % below measures exactly that).
// Read-only: only eth_getBlockByNumber / eth_gasPrice / Substrate header
// reads. Nothing is signed, nothing is sent.

import { rpcCall, hexToInt } from './rpc.js';
import { blockTimeFromWindow, finalityLag, finalitySeconds, pickWinners } from './metrics.js';
import { CHAINS } from './chains.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const pollMsRaw = Number(process.env.POLL_MS || 12000);

export const CONFIG = {
  pollMs: Number.isFinite(pollMsRaw) && pollMsRaw >= 3000 ? pollMsRaw : 12000,
  chains: CHAINS,
};

// Block time is measured between this poller's own consecutive samples,
// not from a window of historical blocks: some chains (Base, Polygon Bor)
// cluster block timestamps, which makes a 20-block window read 0.2s for a
// 2s chain. Height/timestamp deltas across real time are honest everywhere.
async function sampleEvmChain(cfg, prev) {
  const out = {
    key: cfg.key, name: cfg.name, chainId: cfg.chainId, ok: false,
    height: null, blockTimeSec: null, finalizedHeight: null,
    finalityLagBlocks: null, finalitySec: null, gasWei: null, error: null,
    finalityNote: cfg.finalityNote || null,
  };
  try {
    const latest = await rpcCall(cfg.rpc, 'eth_getBlockByNumber', ['latest', false]);
    if (!latest) throw new Error('latest block not found');
    out.height = hexToInt(latest.number);
    const ts = hexToInt(latest.timestamp);
    out._obs = { height: out.height, timestamp: ts };
    if (prev) out.blockTimeSec = blockTimeFromWindow(out._obs, prev);
    const [finalized, gas] = await Promise.all([
      cfg.finalityTag === false
        ? Promise.resolve(undefined)
        : rpcCall(cfg.rpc, 'eth_getBlockByNumber', ['finalized', false]).catch(() => null),
      rpcCall(cfg.rpc, 'eth_gasPrice', []).catch(() => null),
    ]);
    if (finalized) out.finalizedHeight = hexToInt(finalized.number);
    out.finalityLagBlocks = finalityLag(out.height, out.finalizedHeight);
    out.finalitySec = finalitySeconds(out.finalityLagBlocks, out.blockTimeSec);
    out.gasWei = gas != null ? hexToInt(gas) : null;
    out.ok = true;
  } catch (e) {
    out.error = e.message;
  }
  return out;
}

// Portaldot-only: finality cross-checked on the native Substrate side.
// EVM 'finalized' and Substrate finalized head are two independent views
// of the same chain; a real cross-chain tool should show both.
async function sampleSubstrate(cfg) {
  try {
    const [latestHead, finHash] = await Promise.all([
      rpcCall(cfg.substrateRpc, 'chain_getHeader', []),
      rpcCall(cfg.substrateRpc, 'chain_getFinalizedHead', []),
    ]);
    const finHead = await rpcCall(cfg.substrateRpc, 'chain_getHeader', [finHash]);
    const latest = hexToInt(latestHead.number);
    const finalized = hexToInt(finHead.number);
    return { ok: true, latest, finalized, lagBlocks: finalityLag(latest, finalized) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export class Poller {
  constructor(cfg = CONFIG) {
    this.cfg = cfg;
    this.latest = null;
    this.history = [];
    this.startedAt = Date.now();
    this.timer = null;
    this._sampling = false;
    this.stats = {}; // key -> { ok, total }
    this.firstHeight = {}; // key -> height at first successful sample
    this.prevObs = {}; // key -> last { height, timestamp } for block-time math
    for (const c of cfg.chains) this.stats[c.key] = { ok: 0, total: 0 };
  }

  async sample() {
    const results = await Promise.all(this.cfg.chains.map((c) => sampleEvmChain(c, this.prevObs[c.key])));
    const chains = {};
    for (const r of results) {
      const st = this.stats[r.key];
      st.total += 1;
      if (r.ok) {
        st.ok += 1;
        if (this.firstHeight[r.key] == null) this.firstHeight[r.key] = r.height;
        r.blocksSinceStart = r.height - this.firstHeight[r.key];
        if (r._obs) this.prevObs[r.key] = r._obs;
      }
      delete r._obs;
      r.reliabilityPct = st.total ? +((st.ok / st.total) * 100).toFixed(1) : null;
      chains[r.key] = r;
    }
    const pd = this.cfg.chains.find((c) => c.key === 'portaldot');
    const substrate = pd ? await sampleSubstrate(pd) : null;
    const sample = {
      ts: new Date().toISOString(),
      chains,
      substrate,
      winners: pickWinners(chains),
    };
    this.latest = sample;
    this.history.push(sample);
    if (this.history.length > 200) this.history.shift();
    return sample;
  }

  async tick() {
    if (this._sampling) return; // overlap guard: a slow round never piles up
    this._sampling = true;
    try { await this.sample(); } catch { /* a round never crashes the loop */ }
    this._sampling = false;
  }

  start() {
    this.tick();
    this.timer = setInterval(() => this.tick(), this.cfg.pollMs);
    return this;
  }

  stop() { if (this.timer) clearInterval(this.timer); }

  status() {
    return {
      ready: this.latest != null,
      startedAt: new Date(this.startedAt).toISOString(),
      pollMs: this.cfg.pollMs,
      latest: this.latest,
    };
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain && process.argv.includes('--once')) {
  const p = new Poller();
  await p.sample(); // first observation: block times need a second one
  await new Promise((r) => setTimeout(r, p.cfg.pollMs));
  const s = await p.sample();
  console.log(JSON.stringify(s, null, 2));
  process.exit(0);
}
