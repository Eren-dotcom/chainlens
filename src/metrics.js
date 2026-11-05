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
