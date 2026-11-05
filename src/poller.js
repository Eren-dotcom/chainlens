// Multi-chain polling engine. Every poll samples every watched chain in
// parallel; a chain that drops a request degrades to ok=false for that
// sample instead of failing the round (public RPCs drop requests — the
// per-chain reliability % below measures exactly that).
// Read-only: only eth_getBlockByNumber / eth_gasPrice / Substrate header
// reads. Nothing is signed, nothing is sent.

import { rpcCall, hexToInt } from './rpc.js';
import { blockTimeFromWindow, finalityLag, finalitySeconds, pickWinners, finalityStatus } from './metrics.js';
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
    endpoint: cfg.rpc,
    height: null, blockTimeSec: null, finalizedHeight: null,
    finalityLagBlocks: null, finalitySec: null, gasWei: null, error: null,
    txCount: null, gasUsed: null, rpcLatencyMs: null,
    finalityNote: cfg.finalityNote || null, finalitySkew: false, chainIdVerified: false,
  };
  const t0 = Date.now(); // wall time of this chain's whole sample (incl. retries)
  try {
    // One parallel batch: the finalized head must be read at the same
    // moment as the latest head, or the lag between them is understated.
    const [latest, finalized, gas, chainIdHex] = await Promise.all([
      rpcCall(cfg.rpc, 'eth_getBlockByNumber', ['latest', false]),
      cfg.finalityTag === false
        ? Promise.resolve(undefined)
        : rpcCall(cfg.rpc, 'eth_getBlockByNumber', ['finalized', false]).catch(() => null),
      rpcCall(cfg.rpc, 'eth_gasPrice', []).catch(() => null),
      rpcCall(cfg.rpc, 'eth_chainId', []).catch(() => null),
    ]);
    if (!latest) throw new Error('latest block not found');
    out.height = hexToInt(latest.number);
    const ts = hexToInt(latest.timestamp);
    if (out.height == null || ts == null) throw new Error('malformed latest block');
    // Identity check: an endpoint that answers for a different chain must
    // never be displayed under this chain's name — the worst failure an
    // observatory can have. A failed chainId read just skips the check.
    if (chainIdHex != null) {
      const reported = hexToInt(chainIdHex);
      if (reported != null) {
        out.chainIdVerified = true; // the check ran; consumers can see it ran
        if (reported !== cfg.chainId) {
          throw new Error(`chain ID mismatch: endpoint reports ${reported}, expected ${cfg.chainId}`);
        }
      }
    }
    out.txCount = Array.isArray(latest.transactions) ? latest.transactions.length : null;
    out.gasUsed = hexToInt(latest.gasUsed);
    // Trimmed raw payload, kept only for the on-demand /api/sample path
    // (stripped before a sample enters history): anyone can recompute our
    // numbers from exactly what the RPC returned.
    out._raw = {
      latest: { number: latest.number, timestamp: latest.timestamp, gasUsed: latest.gasUsed, txCount: out.txCount },
      finalized: finalized ? { number: finalized.number } : null,
      gasPrice: gas ?? null,
    };
    out._obs = { height: out.height, timestamp: ts };
    if (prev) out.blockTimeSec = blockTimeFromWindow(out._obs, prev);
    if (finalized) out.finalizedHeight = hexToInt(finalized.number);
    // A finalized head ahead of the latest head means the reads came from
    // skewed backends; the lag clamps to 0 for display, the skew is flagged.
    out.finalitySkew = out.finalizedHeight != null && out.finalizedHeight > out.height;
    out.finalityLagBlocks = finalityLag(out.height, out.finalizedHeight);
    out.finalitySec = finalitySeconds(out.finalityLagBlocks, out.blockTimeSec);
    out.gasWei = gas != null ? hexToInt(gas) : null;
    out.rpcLatencyMs = Date.now() - t0;
    out.ok = true;
  } catch (e) {
    out.error = e.message;
    out.rpcLatencyMs = Date.now() - t0;
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
    this.lastBlockTime = {}; // key -> last measured block time (carry-forward, below)
    for (const c of cfg.chains) this.stats[c.key] = { ok: 0, total: 0 };
  }

  // Sampling self-queues: concurrent callers (timer + serverless requests)
  // share one in-flight round instead of interleaving on shared state.
  async sample() {
    if (this._inflight) return this._inflight;
    const run = this._doSample();
    this._inflight = run;
    try {
      return await run;
    } finally {
      if (this._inflight === run) this._inflight = null;
    }
  }

  async _doSample() {
    const pdCfg = this.cfg.chains.find((c) => c.key === 'portaldot');
    const [results, substrate] = await Promise.all([
      Promise.all(this.cfg.chains.map((c) => sampleEvmChain(c, this.prevObs[c.key]))),
      pdCfg ? sampleSubstrate(pdCfg) : Promise.resolve(null),
    ]);
    const chains = {};
    for (const r of results) {
      const st = this.stats[r.key];
      st.total += 1;
      if (r.ok) {
        st.ok += 1;
        if (this.firstHeight[r.key] == null) this.firstHeight[r.key] = r.height;
        r.blocksSinceStart = Math.max(0, r.height - this.firstHeight[r.key]);
        // Only advance the observation point forwards: a load-balanced RPC
        // can answer with a stale or one-block-behind head, and letting the
        // reference point move backwards would corrupt the next interval.
        if (r._obs && (!this.prevObs[r.key] || r._obs.height > this.prevObs[r.key].height)) {
          this.prevObs[r.key] = r._obs;
        }
        // Carry-forward: if this interval produced no new block on a slow
        // chain (Sepolia's 12s blocks vs 12s polls), the fresh rate is null
        // for one sample. Reuse the last measured rate so the dashboard
        // doesn't flicker; the next interval spans the gap and self-heals.
        if (r.blockTimeSec != null) {
          this.lastBlockTime[r.key] = r.blockTimeSec;
        } else if (this.lastBlockTime[r.key] != null) {
          r.blockTimeSec = this.lastBlockTime[r.key];
          r.blockTimeCarried = true; // dashboard labels it carried, not live-measured
          r.finalitySec = finalitySeconds(r.finalityLagBlocks, r.blockTimeSec);
        }
      } else {
        // A failed round invalidates the observation point: the next
        // successful rate must span a fresh interval, not the outage gap.
        delete this.prevObs[r.key];
      }
      delete r._obs;
      delete r._raw;
      r.reliabilityPct = st.total ? +((st.ok / st.total) * 100).toFixed(1) : null;
      chains[r.key] = r;
    }
    if (substrate && substrate.ok && substrate.lagBlocks != null && chains.portaldot?.finalityLagBlocks != null) {
      substrate.agrees = Math.abs(chains.portaldot.finalityLagBlocks - substrate.lagBlocks) <= 1;
    }
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

// On-demand single-chain sample for /api/sample: one fresh read of one
// chain, returning the computed fields plus the trimmed raw RPC payload
// they were computed from, so anyone can verify the math. Cached per chain
// for 10s — a burst of verify clicks must not hammer the public RPCs.
// Block time uses this path's own previous observation, like the poller.
const sampleCache = new Map(); // key -> { at, data }
const samplePrevObs = {}; // key -> last { height, timestamp }

export async function sampleChain(key) {
  const cfg = CHAINS.find((c) => c.key === key);
  if (!cfg) return null;
  const hit = sampleCache.get(key);
  if (hit && Date.now() - hit.at < 10000) return hit.data;
  const r = await sampleEvmChain(cfg, samplePrevObs[key]);
  if (r.ok && r._obs && (!samplePrevObs[key] || r._obs.height > samplePrevObs[key].height)) {
    samplePrevObs[key] = r._obs;
  }
  const raw = r._raw || null;
  delete r._obs;
  delete r._raw;
  const data = { chain: key, sampledAt: new Date().toISOString(), computed: r, raw };
  sampleCache.set(key, { at: Date.now(), data });
  return data;
}

// --- v3: endpoint race -------------------------------------------------
// For every chain, race all configured endpoints with a single attempt:
// who is tallest, who is stale, who is down. Never throws — failures are data.
let raceCache = null; // { at, data }
export async function raceEndpoints() {
  if (raceCache && Date.now() - raceCache.at < 15000) return raceCache.data;
  const chains = [];
  for (const cfg of CHAINS) {
    const eps = [];
    const jobs = (cfg.endpoints || [cfg.rpc]).map(async (url) => {
      const t0 = Date.now();
      try {
        const hex = await rpcCall(url, 'eth_blockNumber', [], 4000, 1);
        const height = hexToInt(hex);
        if (height == null) throw new Error('malformed block number');
        return { url, height, latencyMs: Date.now() - t0, ok: true, error: null };
      } catch (e) {
        return { url, height: null, latencyMs: Date.now() - t0, ok: false, error: e.message };
      }
    });
    eps.push(...(await Promise.all(jobs)));
    if (cfg.substrateRpc) {
      const t0 = Date.now();
      try {
        const head = await rpcCall(cfg.substrateRpc, 'chain_getHeader', [], 4000, 1);
        const height = hexToInt(head.number);
        if (height == null) throw new Error('malformed substrate header');
        eps.push({ url: cfg.substrateRpc, kind: 'substrate', height, latencyMs: Date.now() - t0, ok: true, error: null });
      } catch (e) {
        eps.push({ url: cfg.substrateRpc, kind: 'substrate', height: null, latencyMs: Date.now() - t0, ok: false, error: e.message });
      }
    }
    const okHeights = eps.filter((e) => e.ok && e.height != null).map((e) => e.height);
    const maxH = okHeights.length ? Math.max(...okHeights) : null;
    const minH = okHeights.length ? Math.min(...okHeights) : null;
    chains.push({
      chain: cfg.key,
      endpoints: eps,
      spreadBlocks: okHeights.length >= 2 ? maxH - minH : null,
      staleUrls: maxH != null ? eps.filter((e) => e.ok && e.height != null && maxH - e.height > 5).map((e) => e.url) : [],
    });
  }
  const data = { sampledAt: new Date().toISOString(), chains };
  raceCache = { at: Date.now(), data };
  return data;
}

// --- v3: "is my block final yet?" checker --------------------------------
// Fresh reads on the chain's primary RPC. Never throws to the route.
const checkCache = new Map(); // key -> { at, data }
const checkPrevObs = {}; // key -> last { height, timestamp }
export async function checkFinality(key, query) {
  const cfg = CHAINS.find((c) => c.key === key);
  if (!cfg) return { chain: key, status: 'unknown-chain', error: 'unknown chain' };
  const ck = key + ':' + (query.tx ? 'tx:' + query.tx.toLowerCase() : 'block:' + query.block);
  const hit = checkCache.get(ck);
  if (hit && Date.now() - hit.at < 6000) return hit.data;
  const done = (data) => { checkCache.set(ck, { at: Date.now(), data }); return data; };
  try {
    if (cfg.finalityTag === false && !query.tx) {
      const latestBlk = await rpcCall(cfg.rpc, 'eth_getBlockByNumber', ['latest', false], 6000, 1).catch(() => null);
      return done({ chain: key, block: query.block ?? null, latest: latestBlk ? hexToInt(latestBlk.number) : null, finalized: null, status: 'checkpoint-based', note: cfg.finalityNote || null, blocksToFinal: null, etaSec: null, sampledAt: new Date().toISOString() });
    }
    let block = query.block ?? null;
    if (query.tx) {
      const tx = await rpcCall(cfg.rpc, 'eth_getTransactionByHash', [query.tx], 6000, 1).catch(() => null);
      if (!tx) return done({ chain: key, block: null, latest: null, finalized: null, status: 'not-found', blocksToFinal: null, etaSec: null, sampledAt: new Date().toISOString() });
      if (tx.blockNumber == null) return done({ chain: key, block: null, latest: null, finalized: null, status: 'pending-tx', blocksToFinal: null, etaSec: null, sampledAt: new Date().toISOString() });
      block = hexToInt(tx.blockNumber);
      if (cfg.finalityTag === false) {
        const latestBlk = await rpcCall(cfg.rpc, 'eth_getBlockByNumber', ['latest', false], 6000, 1).catch(() => null);
        return done({ chain: key, block, latest: latestBlk ? hexToInt(latestBlk.number) : null, finalized: null, status: 'checkpoint-based', note: cfg.finalityNote || null, blocksToFinal: null, etaSec: null, sampledAt: new Date().toISOString() });
      }
    }
    const [latestBlk, finBlk] = await Promise.all([
      rpcCall(cfg.rpc, 'eth_getBlockByNumber', ['latest', false], 6000, 1),
      rpcCall(cfg.rpc, 'eth_getBlockByNumber', ['finalized', false], 6000, 1).catch(() => null),
    ]);
    const latest = hexToInt(latestBlk.number);
    const ts = hexToInt(latestBlk.timestamp);
    const finalized = finBlk ? hexToInt(finBlk.number) : null;
    // Measure block time with this checker's own previous observation.
    let blockTime = null;
    const prev = checkPrevObs[key];
    if (prev && latest != null && ts != null) blockTime = blockTimeFromWindow({ height: latest, timestamp: ts }, prev);
    if (latest != null && ts != null && (!prev || latest > prev.height)) checkPrevObs[key] = { height: latest, timestamp: ts };
    const status = finalityStatus(block, latest, finalized);
    const blocksToFinal = status === 'pending' && finalized != null ? Math.max(0, block - finalized) : (status === 'final' ? 0 : null);
    let etaSec = null; let etaNote = null;
    if (status === 'pending') {
      if (blockTime != null && blocksToFinal != null) etaSec = Math.round(blocksToFinal * blockTime);
      else etaNote = 'needs a second check to measure block time';
    }
    return done({ chain: key, block, latest, finalized, status, blocksToFinal, etaSec, ...(etaNote ? { etaNote } : {}), sampledAt: new Date().toISOString() });
  } catch (e) {
    return done({ chain: key, block: query.block ?? null, latest: null, finalized: null, status: 'error', error: e.message, blocksToFinal: null, etaSec: null, sampledAt: new Date().toISOString() });
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
