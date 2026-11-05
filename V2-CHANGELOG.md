# ChainLens v2 — changelog (working log, uncommitted)

User verdict on v1: too few features/functions; dashboard looked like generic AI output.
v2: richer measured data, session statistics, verifiable raw samples, embeddable
badges, CSV export, and a full "observatory instrument panel" redesign.
Zero dependencies, read-only, /api/metrics (chainlens-metrics/1) unchanged.

## 1. Richer samples (txCount, gasUsed, rpcLatencyMs, endpoint)
- Files: src/poller.js (sampleEvmChain measures wall time of the chain's batch,
  reads transactions count + gasUsed from the latest block, stamps the RPC
  endpoint from config; _raw stripped before history), threaded automatically
  through poller -> history -> /api/status + /api/history.
- Mirrored in production automatically: api/ shares src/poller.js via api/_state.js.
- Test: live curl of /api/status shows txCount/gasUsed/rpcLatencyMs per chain (see verification log).

## 2. Session stats — summarize(history)
- Files: src/metrics.js (summarize: per chain samples, finalitySec min/avg/p95/max
  with nearest-rank p95, blockTimeSecAvg, gasWeiAvg, reliabilityPct; null finality
  for n/a chains), src/server.js + api/status.js expose it as additive `stats`
  on /api/status.
- Test: unit fixture asserts avg/p95/min/max + n/a-chain null; live curl shows stats.

## 3. GET /api/badge.svg?chain=<id>
- Files: src/metrics.js (badgeSvg: dark label segment "CHAINLENS · <CHAIN>",
  accent value segment with the latest measured finality; Amoy -> "finality n/a"),
  src/server.js route (400 on unknown chain, cache max-age=30), api/badge.js
  + vercel.json rewrite /api/badge.svg -> /api/badge.
- Test: unit asserts SVG contains chain name + value; live curl for all 4 chains + invalid.

## 4. GET /api/sample?chain=<id>
- Files: src/poller.js (sampleChain: fresh single-chain sample + trimmed raw RPC
  payload — latest number/timestamp/gasUsed/txCount, finalized number, gasPrice —
  per-chain 10s cache), src/server.js route, api/sample.js.
- Test: live curl shows computed vs raw agreement (lag = latest - finalized).

## 5. GET /api/history.csv
- Files: src/metrics.js (historyToCsv + CSV_HEADER), src/server.js route,
  api/history-csv.js + vercel.json rewrite /api/history.csv -> /api/history-csv.
- Test: unit asserts header + row shaping incl. empty cells for n/a; live curl head.

## 6. Frontend redesign — "observatory instrument panel"
- Files: public/index.html (full rewrite, single file, vanilla JS/CSS, Google Fonts
  Space Grotesk + IBM Plex Mono with system fallbacks). Palette #07090C/#0D1117/#1E2632,
  chain accents Portaldot #FF5A36, Sepolia #6E8FB2, Base #4D7CFE, Amoy #9B6BFF.
  Masthead with live IST clock, samples counter, LIVE dot; verdict strip restyled
  (computed live from winners, as v1). Polls /api/status 6s, /api/history 30s.
- Test: screenshot review (docs/dashboard-v2.png).

## 7. Settlement ticker + THE FINALITY RACE (hero)
- Files: public/index.html. Ticker appends a real event whenever a chain's
  finalizedHeight advances between polls ("▸ Portaldot V3 block N finalized · ≈12s");
  race lanes position each chain's marker by its current measured finality on a
  1s–3600s log track, pulse on finalization; Amoy lane is hatched "checkpoint-based · n/a".
- Test: screenshot review; events only fire on observed diffs (first sample is baseline).

## 8. Chain instruments + detail drawer
- Files: public/index.html. Asymmetric grid (Portaldot panel wider); each panel shows
  huge finality numeral, lag, block time (live/carried), gas, reliability, RPC latency,
  tx count, gas used; Portaldot adds the Substrate cross-check line. Click opens a
  drawer with session min/avg/p95/max finality, reliability, endpoint URL, chain ID,
  and a lag-history sparkline from /api/history.
- Test: screenshot review.

## 9. Session charts (custom canvas)
- Files: public/index.html. Finality-over-time (log toggle) and gas-over-time drawn
  from /api/history on canvas — chain-colored lines, axis labels, no chart library.
- Test: screenshot review.

## 10. Live block feed
- Files: public/index.html. Streaming table (newest first, cap 30) fed by polling
  diffs: time, chain, height, txs, gas used, latency.
- Test: screenshot review.

## 11. Wait calculator
- Files: public/index.html. Chain select + use-case presets (Quick payment ×1,
  NFT mint ×1.5, Bridge transfer ×2, Exchange deposit ×3); recommended wait =
  session p95 finality × margin, in plain language with the sample count.
  Amoy explains checkpoint finality instead of inventing a number.
- Test: screenshot review.

## 12. Verify-it-yourself panel
- Files: public/index.html. Per-chain button -> GET /api/sample -> raw RPC values
  and computed finality side by side.
- Test: live click-through via API curl (feature 4) + screenshot review.

## 13. Embed section
- Files: public/index.html. Live badge previews for all 4 chains, copyable
  <img> snippets (absolute /api/badge.svg URL) and a copyable dashboard iframe snippet.
- Test: screenshot review; badges served by feature 3 endpoint.

## Verification log (2026-11-05, local server PORT=4178)
- `npm test` — PASS (all v1 tests + new summarize/CSV/badge assertions).
- GET /api/status — ready, additive `stats` present (Portaldot finality
  min 12 / avg 13.5 / p95 18 / max 18 over the window; Amoy finalitySec null);
  latest samples carry txCount/gasUsed/rpcLatencyMs/endpoint; Substrate agrees.
- GET /api/metrics — unchanged chainlens-metrics/1 document (no new fields leaked).
- GET /api/history — samples carry the new fields; no _raw/_obs internals.
- GET /api/badge.svg — 200 image/svg+xml, cache max-age=30, "finality ≈12s";
  Amoy "finality n/a"; unknown chain -> 400.
- GET /api/sample?chain=portaldot — raw latest 0x51631 (333361) - finalized
  0x5162f (333359) = computed lag 2; gasPrice 0x54e2 = computed 21730 wei;
  10s cache returns identical sampledAt; next fresh Base sample computed
  blockTimeSec 0.19 and finalitySec 896 = 4716 blocks x 0.19. Unknown chain -> 400.
- GET /api/history.csv — header + 4 rows per sample; n/a cells empty for Amoy.
- Screenshot docs/dashboard-v2.png reviewed twice. Round 1 found three defects,
  all fixed and re-shot: fmtSec rounded 0.2s block time to "0s" (now one-decimal
  under 10s), gas-chart y labels clipped at the canvas edge (left padding widened),
  race gridlines at 25% steps vs log-scale labels (now at true log positions).
  Round 2 confirms all sections live: ticker events, race markers, instruments,
  charts, feed, wait calculator (recomputed per session), badges, drawer stats.

