// Pure metric helpers, unit-tested in test/unit.mjs.

// Average seconds per block across a window of blocks (latest vs older).
export function blockTimeFromWindow(latest, older) {
  if (!latest || !older) return null;
  const dh = latest.height - older.height;
  const dt = latest.timestamp - older.timestamp;
  if (dh <= 0 || dt <= 0) return null;
  return +(dt / dh).toFixed(2);
}

// Blocks between the latest head and the finalized head.
export function finalityLag(latest, finalized) {
  if (latest == null || finalized == null) return null;
  return Math.max(0, latest - finalized);
}

// Estimated seconds until a block finalizes: lag in blocks x block time.
// A chain whose finalized head has caught up (lag 0) finalizes in 0 seconds
// by definition — that answer does not need a measured block time.
export function finalitySeconds(lagBlocks, blockTimeSec) {
  if (lagBlocks === 0) return 0;
  if (lagBlocks == null || blockTimeSec == null) return null;
  return Math.round(lagBlocks * blockTimeSec);
}

// Shape a sample into the stable, versioned, machine-readable metrics
// document served at /api/metrics — the artifact other tools can consume
// and the concrete thing "adopt this spec" points at. A null sample yields
// the empty skeleton (same shape, no chains yet).
export function shapeMetrics(sample) {
  const doc = {
    spec: 'chainlens-metrics/1',
    methodology: 'https://github.com/Eren-dotcom/chainlens/blob/main/docs/METHODOLOGY.md',
    generatedAt: sample ? sample.ts : null,
    chains: {},
    substrate: sample ? sample.substrate : null,
    winners: sample ? sample.winners : null,
  };
  if (!sample) return doc;
  for (const [key, c] of Object.entries(sample.chains)) {
    doc.chains[key] = {
      name: c.name, chainId: c.chainId, ok: c.ok,
      height: c.height, blockTimeSec: c.blockTimeSec,
      finalizedHeight: c.finalizedHeight,
      finalityLagBlocks: c.finalityLagBlocks, finalitySec: c.finalitySec,
      finalitySkew: c.finalitySkew ?? null,
      chainIdVerified: c.chainIdVerified ?? null,
      gasWei: c.gasWei, reliabilityPct: c.reliabilityPct,
      finalityNote: c.finalityNote || null,
    };
  }
  return doc;
}

// Finality Index: log-scale score 0..100 from average finality seconds.
// 5s or faster = 100, 30 min (1800s) or slower = 0, linear in log10 between.
export function finalityIndex(finalitySec) {
  if (finalitySec == null || !Number.isFinite(finalitySec)) return null;
  const lo = Math.log10(5), hi = Math.log10(1800);
  const v = Math.round((100 * (hi - Math.log10(finalitySec))) / (hi - lo));
  return Math.max(0, Math.min(100, v));
}

// Plain-language status of a block relative to latest/finalized heads.
export function finalityStatus(block, latest, finalized) {
  if (block == null || latest == null || finalized == null) return 'unknown';
  if (!Number.isFinite(block) || !Number.isFinite(latest) || !Number.isFinite(finalized)) return 'unknown';
  if (block > latest) return 'not-seen';
  if (block <= finalized) return 'final';
  return 'pending';
}

// Session statistics over the history ring, per chain. Only ok samples
// feed the metric stats; reliability counts every sample in the window.
// finalitySec is null as a whole for chains that never report a measured
// finality (Amoy) — no invented numbers.
export function summarize(history) {
  const acc = {};
  for (const s of history || []) {
    for (const [key, c] of Object.entries(s.chains || {})) {
      const a = (acc[key] ||= { total: 0, ok: 0, fin: [], bt: [], gas: [] });
      a.total += 1;
      if (!c || !c.ok) continue;
      a.ok += 1;
      if (Number.isFinite(c.finalitySec)) a.fin.push(c.finalitySec);
      if (Number.isFinite(c.blockTimeSec)) a.bt.push(c.blockTimeSec);
      if (Number.isFinite(c.gasWei)) a.gas.push(c.gasWei);
    }
  }
  const avg = (xs) => (xs.length ? +(xs.reduce((x, y) => x + y, 0) / xs.length).toFixed(2) : null);
  const pctl = (xs, p) => {
    if (!xs.length) return null;
    const srt = [...xs].sort((x, y) => x - y);
    return srt[Math.max(0, Math.ceil((p / 100) * srt.length) - 1)]; // nearest-rank
  };
  const out = {};
  for (const [key, a] of Object.entries(acc)) {
    const finAvg = a.fin.length ? avg(a.fin) : null;
    out[key] = {
      samples: a.total,
      finalitySec: a.fin.length
        ? { min: Math.min(...a.fin), avg: finAvg, p95: pctl(a.fin, 95), max: Math.max(...a.fin) }
        : null,
      blockTimeSecAvg: avg(a.bt),
      gasWeiAvg: a.gas.length ? Math.round(avg(a.gas)) : null,
      gasStats: a.gas.length
        ? { avg: Math.round(avg(a.gas)), p50: pctl(a.gas, 50), p95: pctl(a.gas, 95), max: Math.max(...a.gas) }
        : null,
      finalityIndex: finAvg != null ? finalityIndex(finAvg) : null,
      reliabilityPct: a.total ? +((a.ok / a.total) * 100).toFixed(1) : null,
    };
  }
  return out;
}

// Flat CSV export of the history ring: one row per chain per sample.
export const CSV_HEADER =
  'timestamp,chain,height,finalizedHeight,lagBlocks,finalitySec,blockTimeSec,gasWei,txCount,gasUsed,rpcLatencyMs';

export function historyToCsv(history) {
  const rows = [CSV_HEADER];
  const cell = (v) => (v == null ? '' : v);
  for (const s of history || []) {
    for (const [key, c] of Object.entries(s.chains || {})) {
      rows.push([
        s.ts, key, cell(c.height), cell(c.finalizedHeight), cell(c.finalityLagBlocks),
        cell(c.finalitySec), cell(c.blockTimeSec), cell(c.gasWei), cell(c.txCount),
        cell(c.gasUsed), cell(c.rpcLatencyMs),
      ].join(','));
    }
  }
  return rows.join('\n') + '\n';
}

// Shields-style SVG badge for one chain, from its latest sample. The value
// is always the measured finality (or an honest state) — never a constant.
const BADGE_ACCENTS = { portaldot: '#FF5A36', sepolia: '#6E8FB2', base: '#4D7CFE', amoy: '#9B6BFF', arbitrum: '#28A0F0', optimism: '#FF0420', ethereum: '#627EEA', 'base-mainnet': '#4D7CFE', 'polygon-mainnet': '#8247E5' };
const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function badgeSvg(cfg, c) {
  const label = `CHAINLENS · ${cfg.short.toUpperCase()}`;
  let value;
  if (!c || !c.ok) value = 'finality no data';
  else if (cfg.finalityTag === false) value = 'finality n/a';
  else if (c.finalitySec == null) value = 'finality pending';
  else if (c.finalitySec < 120) value = `finality ≈${Math.round(c.finalitySec)}s`;
  else value = `finality ≈${Math.round(c.finalitySec / 60)}m`;
  const accent = BADGE_ACCENTS[cfg.key] || '#4D7CFE';
  const lw = Math.ceil(label.length * 6.4) + 12;
  const vw = Math.ceil(value.length * 6.4) + 12;
  const w = lw + vw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${escXml(label)}: ${escXml(value)}">
<rect width="${lw}" height="20" fill="#0D1117"/>
<rect x="${lw}" width="${vw}" height="20" fill="${accent}"/>
<text x="${lw / 2}" y="14" fill="#E8EDF2" font-family="Verdana,DejaVu Sans,sans-serif" font-size="10" text-anchor="middle">${escXml(label)}</text>
<text x="${lw + vw / 2}" y="14" fill="#07090C" font-family="Verdana,DejaVu Sans,sans-serif" font-size="10" font-weight="bold" text-anchor="middle">${escXml(value)}</text>
</svg>`;
}

// Pick the winning chain per category from a { key: chainSample } map.
// Chains with ok=false or a null metric are skipped. Ties keep the first.
export function pickWinners(chains) {
  const best = (get) => {
    let winner = null;
    for (const [key, c] of Object.entries(chains)) {
      if (!c || !c.ok) continue;
      const v = get(c);
      if (v == null || !Number.isFinite(v)) continue; // a NaN would block every later candidate
      if (!winner || v < winner.value) winner = { chain: key, value: v };
    }
    return winner;
  };
  return {
    fastestBlockTime: best((c) => c.blockTimeSec),
    fastestFinality: best((c) => c.finalitySec),
    lowestGas: best((c) => c.gasWei),
  };
}
