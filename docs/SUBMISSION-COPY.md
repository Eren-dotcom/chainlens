# ChainLens — DoraHacks submission copy (Qwen polish, QA'd by Muse, 2026-11-05)

## Build name
ChainLens

## Tagline / Brief
Live cross-chain finality observatory: Portaldot V3 vs. Ethereum Sepolia, Base Sepolia, and Polygon Amoy.

## Built with
Node.js, JavaScript, Ethereum JSON-RPC API, Substrate JSON-RPC API, HTML/CSS

## Links
- GitHub: https://github.com/Eren-dotcom/chainlens
- Live demo: https://chainlens-five.vercel.app
- Demo video: (YouTube URL — fill in after upload)
- Pitch deck: https://github.com/Eren-dotcom/chainlens/blob/main/docs/PITCH-DECK.md

## Full description

**Problem.** Chains market block time, but users actually wait for finality — the time until a block cannot be reverted. No live, side-by-side measurement exists for the networks builders choose between, leaving "fast chain" claims unchecked.

**Solution.** ChainLens is a live cross-chain observatory. It polls four testnets in parallel (Portaldot V3, Ethereum Sepolia, Base Sepolia, and Polygon Amoy) and displays their block time, finality lag, gas price, and endpoint reliability on a single dashboard, measured live from public RPCs. Around that live core it builds working tools, not just charts: the Finality Race (four lanes on a log scale, pulsing as each chain finalizes), a settlement ticker of real finalization events, session statistics (min / average / p95 finality), history charts, a live block feed, a per-chain detail drawer, a Wait Calculator that answers "how long until it's final?" from measured p95 finality per use case, a verify-it-yourself panel that re-samples a chain and shows the raw RPC values next to ChainLens's math, embeddable live finality badges, and CSV/JSON export of the full sample history. It is strictly read-only: no wallets, no keys, no transactions.

**What the live data shows** (measured 2026-11-05, re-measured on every poll):
- Portaldot V3 finalizes in about 12 seconds (finality lag ~2 blocks at 6-second blocks).
- Ethereum Sepolia requires about 15 minutes (lag ~70 blocks).
- Base Sepolia produces the fastest blocks at every 0.2 seconds (Flashblocks), yet its finalized head trails by roughly 4,300–6,500 blocks — about 15–23 minutes to finality. Fastest blocks, slow finality.
- Sepolia's gas price is the lowest of the four.
- Polygon Amoy finalizes through Heimdall checkpoints, not the EVM finalized tag. ChainLens reports its finality as n/a rather than the misleading "0 seconds" the tag suggests.

**How it works.** A zero-dependency Node.js poller samples every chain in parallel using `eth_getBlockByNumber` (latest + `finalized`) and `eth_gasPrice`. For Portaldot, it also uses the Substrate calls `chain_getHeader` and `chain_getFinalizedHead`, cross-checking finality across both stacks of its dual architecture. Block time is measured between consecutive samples, as some chains cluster timestamps, causing historical windows to misread them. The verdict strip (fastest finality / block time / gas) is computed from measured values on every sample and is never hardcoded. If an endpoint drops requests, the chain degrades gracefully, and its reliability percentage reflects the drop. Every metric is defined in docs/METHODOLOGY.md in the repository, and the live numbers are also served as a versioned JSON document (GET /api/metrics, spec chainlens-metrics/1) for other tools to consume — alongside a live SVG finality badge per chain (GET /api/badge.svg), an on-demand raw sampler for verification (GET /api/sample), session statistics on GET /api/status, and the full history as CSV (GET /api/history.csv).

**How to run it.** Run `npm start` to launch the dashboard and JSON APIs on http://localhost:4178. Use `npm run once` to print a single comparison sample, `npm test` for metric unit tests, and `npm run smoke` for a live four-chain smoke test. Requires Node.js ≥ 18; no install step needed.

**On-chain anchoring (FinalityAnchor).** ChainLens also ships a write path: `FinalityAnchor`, a small contract (source + compiled bytecode in the repo) that stores ChainLens finality snapshots on Portaldot V3 itself, turning measurements into permanent, checkable records. Its deployment is currently blocked by a Portaldot platform gate, documented with transaction-level evidence in docs/ANCHOR-STATUS.md: the Portaldot team funded our operator account with 500 tPOT, but the funds sit in the chain's revive fallback account and cannot pay fees until the account is mapped — a step this runtime does not let an Ethereum-style key perform for itself (the chain's own EVM RPC fails on the account identically). We publish the evidence rather than a claim: the contract deploys the day the gate opens.

**Why it helps Portaldot.** Builders deciding where to deploy can see Portaldot V3 finalize faster than established testnets on the metric that matters most for user experience: seconds, not minutes. The data is live and reproducible. It also provides a neutral measuring stick for the ecosystem: ChainLens will report accurately if another chain wins.

**Limitation.** The ChainLens observatory is read-only by design; its companion contract FinalityAnchor is written and compiled but not yet deployed, for the documented platform reason above (docs/ANCHOR-STATUS.md). No contract address is claimed.

## Track
Multi-Chain & Cross-Chain Infra

## Testnet integration (organizer field, honesty rule)
Read-only observatory with no contract deployment. It reads the Portaldot V3 testnet live via EVM and Substrate RPC (chain ID 420420777), compared against Ethereum Sepolia, Base Sepolia, and Polygon Amoy public RPCs.

## Looking for teammates
No (solo participant).
