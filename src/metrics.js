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
