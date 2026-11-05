# ChainLens v3 — changelog (working log, uncommitted)

Full merged scope: tier features (more chains + mainnet view, deploy-it-yourself,
Portaldot deep-dive) + problem-driven features (finality checker, endpoint race,
bridge wait estimator, confirmations converter, gas bands/spikes, alerts,
Finality Index, API explorer, open dataset).
Zero dependencies, read-only (sole exception: the deploy button, where the
visitor's own browser wallet signs — ChainLens never holds keys).
/api/metrics (chainlens-metrics/1) verified unchanged for the original fields;
new chains appear as additional keys only.

## 1. Nine chains, network + endpoints (src/chains.js)
- Every chain gains `network` ('testnet'|'mainnet') and `endpoints` (primary
  first; `endpoints[0] === rpc` asserted in tests). Portaldot keeps substrateRpc.
- New: arbitrum (Arbitrum Sepolia 421614), optimism (OP Sepolia 11155420),
  ethereum (mainnet 1), base-mainnet (Base 8453), polygon-mainnet (Polygon 137,
  finalityTag:false with the Bor/Heimdall note, mirroring Amoy). Env overrides
  per chain as specified.
- Test: unit asserts 9 chains, unique keys/chainIds, network + endpoints shape.

## 2. Metrics: gasStats, Finality Index, finalityStatus (src/metrics.js)
- summarize() keeps every existing field; adds per-chain `gasStats`
  {avg,p50,p95,max} (nearest-rank, null when no gas samples) and
  `finalityIndex` from the average finality (null for n/a chains).
- finalityIndex(s): log scale — 100 at <=5s, 0 at >=1800s, linear in log10,
  clamped; null for null/non-finite.
- finalityStatus(block, latest, finalized): 'final' | 'pending' | 'not-seen'
  | 'unknown'.
- badgeSvg accents for the 5 new keys; polygon-mainnet shows 'finality n/a'
  via the existing finalityTag check (unit-asserted).

## 3. Poller helpers: raceEndpoints + checkFinality (src/poller.js)
- raceEndpoints(): every endpoint of every chain raced with a single attempt
  (rpcCall attempts=1, 4000ms); per chain {endpoints[{url,height,latencyMs,ok,
  error}], spreadBlocks, staleUrls (>5 blocks behind the chain max)}.
  Portaldot also races its Substrate head as a pseudo-endpoint
  (kind:'substrate'). Whole result cached 15s. Never throws.
- checkFinality(key, {block}|{tx}): fresh primary-RPC reads; tx resolution via
  eth_getTransactionByHash (not-found / pending-tx branches); checkpoint
  chains short-circuit to status 'checkpoint-based' with the chain's note;
  block time measured by the checker's own prev-obs map, etaSec null +
  etaNote 'needs a second check to measure block time' until known. Per
  (chain+query) 6s cache. Never throws to the route.

## 4. New routes (src/server.js + api/endpoints.js, api/check.js, api/anchor.js)
- GET /api/endpoints -> raceEndpoints() JSON.
- GET /api/check?chain=&block=|tx= — validation: unknown chain 400; exactly
  one of block/tx 400; block must be a non-negative decimal integer; tx must
  match /^0x[0-9a-fA-F]{64}$/.
- GET /api/anchor — FinalityAnchor bytecode ('0x'+trimmed file, 1036 bytes)
  + parsed ABI + chain metadata; files read once at startup in the local
  server, per-request via fs in the serverless mirror. Graceful 500 if missing.
- vercel.json unchanged (plain /api/<name> mapping covers the new files).

## 5. Open dataset (tools/snapshot.mjs + docs/DATASET.md)
- Snapshot tool fetches ${CHAINLENS_URL || production}/api/status and appends
  one JSON line {ts, chains:{key:{finalitySec, blockTimeSec, gasWei, height}}}
  to data/snapshots.jsonl, printing a one-line summary.
- DATASET.md documents format, fields, hourly cron usage, CC0-style reuse,
  and the honesty note: the dataset starts when you start running it.
- No snapshot data ships: the one verification run below wrote a genuine line
  from the local server, which was then deleted so the dataset starts clean.

## 6. Frontend (public/index.html — extended, same design system)
- META/ORDER replaced by TESTNET (6) / MAINNET (3) lists; every dynamic
  section (race, instruments, legends, calc + checker selects, verify
  buttons, embed rows, charts, feed, alerts) renders for the active network
  and rebuilds on toggle. n/a handling generalized via the NA set
  {amoy, polygon-mainnet} (mirrors finalityTag:false in src/chains.js).
- (a) Masthead network toggle + "Copy link to this view" (?network=&chain=);
  URL params honoured on load, chain param opens that drawer after first data.
- (b) Alert banner: reliability <97%, endpoint STALE/DOWN from the race poll,
  current finality >2x session avg — measured facts only, hidden otherwise.
- (c) "Is my block final yet?" checker: auto-detects block vs tx hash, plain-
  language verdicts FINAL / NOT YET (blocks behind + ETA) / PENDING TX /
  NOT FOUND / NOT SEEN / CHECKPOINT-BASED; "confirmed != final" explainer.
- (d) Endpoint Race panel: per-chain table (host, head, latency, OK/STALE/
  DOWN chips, spread readout; Substrate row labelled), polled every 30s.
- (e) Wait Calculator extended: confirmations->time converter on the measured
  block time + live folklore table (6/12/64 confs x active chains); "Stop
  counting blocks" box with copyable ethers/viem `finalized`-tag snippets.
- (f) Bridge Wait Estimator: measured leg (source session p95 finality, or
  checkpoint text for Bor chains) shown separately from CONSTANT legs —
  +7 days canonical challenge for optimistic-rollup -> Ethereum-L1 routes,
  ~20-30 min checkpoint cadence note for Polygon family. Never merged.
  Disclaimer: expectations only, no tracking/recovery.
- (g) Gas band line per instrument (now / p50 / p95 from gasStats) + gas
  spike ticker events (>1.5x session p95, >=10 samples, throttled 5 min).
- (h) Finality Index on each instrument + drawer, with the formula in plain
  text; n/a chains show 'INDEX n/a'.
- (i) Portaldot Deep-Dive (testnet view only): EVM vs Substrate finalized
  lag big numbers + agrees/differs chip, dual-line lag chart from
  /api/history (substrate lag at sample.substrate.lagBlocks), recent
  Portaldot finalized events, 2-line GRANDPA explainer.
- (j) Deploy FinalityAnchor Yourself: /api/anchor on load (name, bytecode
  size, chain ID), Copy bytecode, Deploy with my wallet — eth_requestAccounts,
  chain check with wallet_switchEthereumChain / wallet_addEthereumChain
  (chainId hex computed in code; tPOT decimals 18 labelled in a code comment
  as the EVM-standard display value, unverified), eth_sendTransaction with
  the bytecode, receipt polling shows contractAddress. All errors as text.
  "Your wallet signs. ChainLens never sees a key and stays read-only."
- (k) API Explorer: rows for status / metrics / history?n=5 / history.csv /
  sample / endpoints / check (sample) / anchor / badge.svg, Try buttons
  fetch and show ~1200-char truncated responses in a <pre>.
- (l) Open Graph meta tags; footer methodology extended with the v3 notes
  (L2 finalized-tag semantics, Bor n/a, Index formula, CONSTANT labelling).
- Polling: 6s status / 30s history kept, + 30s endpoints. All new fetches
  wrapped in try/catch — the page works if a v3 endpoint 404s.

## Verification log (2026-11-05, local server PORT=4178)
- `npm test` — PASS (all v1+v2 tests + new v3 assertions: finalityIndex
  endpoints/midpoint/monotonicity, finalityStatus all four branches,
  summarize gasStats p50/p95 + finalityIndex present/null-for-n/a, chains
  config integrity, badgeSvg arbitrum label + polygon-mainnet n/a).
  Tail of output:
  ```
  > chainlens@0.1.0 test
  > node test/unit.mjs

  unit tests: PASS
  ```
- Frontend JS syntax-checked headlessly (script extracted, parsed): OK.
- Boot note: the first boot attempt hit EADDRINUSE — a stale v2 server from
  an earlier session still held port 4178 (its /api/status answered with the
  old 4-chain shape). It was killed and the v3 server booted clean.
- GET /api/status — ready, all 9 chains present; Portaldot finalitySec 12,
  lag 2, chainIdVerified true; stats for all 9 chains; Portaldot gasStats
  {avg 21705, p50 21705, p95 21705, max 21705} on the first samples and
  finalityIndex 85; polygon-mainnet finalitySec null with finalityNote set.
- GET /api/metrics — spec chainlens-metrics/1; Portaldot field list exactly
  the v2 set (name, chainId, ok, height, blockTimeSec, finalizedHeight,
  finalityLagBlocks, finalitySec, finalitySkew, chainIdVerified, gasWei,
  reliabilityPct, finalityNote); new chains present as additional keys only.
- GET /api/endpoints — Portaldot spread 0 (EVM head == Substrate head,
  333823 at check time); single-endpoint chains spread null. Honest finding:
  the four secondary endpoints (rpc.sepolia.org, sepolia.base.org,
  rpc-amoy.polygon.technology, arbitrum-sepolia.drpc.org) answered DOWN
  from this VM's network while every publicnode primary answered — the race
  reports that as data; on an unrestricted network they may well answer.
- GET /api/check?chain=portaldot&block=1 —
  {"chain":"portaldot","block":1,"latest":333822,"finalized":333820,
  "status":"final","blocksToFinal":0,...}. Note honestly: on a cold server
  block=1 returns final — correct behaviour, block 1 is ancient history.
  Validation: missing block+tx -> 400, bad tx shape -> 400, unknown chain
  -> 400. Amoy block check -> status 'checkpoint-based' with the Bor note.
- GET /api/anchor — contract FinalityAnchor, chainId 420420777,
  bytecodeBytes 1036, bytecode starts 0x60, ABI 6 entries.
- GET /api/badge.svg?chain=arbitrum — 200 image/svg+xml, contains
  'CHAINLENS · ARBITRUM SEPOLIA'; chain=polygon-mainnet contains
  'finality n/a'.
- GET / — 200, 70,721 bytes (v3 dashboard).
- tools/snapshot.mjs against the local server — printed
  'snapshot 2026-11-05T11:11:13.972Z — portaldot 12s · sepolia 996s ·
  base 1147s · amoy n/a · arbitrum 987s · optimism 1172s · ethereum 876s ·
  base-mainnet 1286s · polygon-mainnet n/a' and appended one genuine line;
  the line and data/ dir were then removed (dataset starts clean, per §5).
- NOT verified here: browser rendering of the new dashboard (no screenshot
  pass in this build step — parent QA should eyeball the live page after
  deploy, incl. the mainnet toggle and the wallet flow, which needs a real
  browser wallet and cannot be exercised headlessly).
