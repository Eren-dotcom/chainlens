# ChainLens — DoraHacks submission copy (Qwen polish, QA'd by Muse, 2026-11-05)

## Build name
ChainLens

## Tagline / Brief
Live cross-chain finality observatory: Portaldot V3 vs. five testnets and three mainnets — with a block-finality checker, endpoint race, and bridge wait estimator.

## Built with
Node.js, JavaScript, Ethereum JSON-RPC API, Substrate JSON-RPC API, HTML/CSS

## Links
- GitHub: https://github.com/Eren-dotcom/chainlens
- Live demo: https://chainlens-five.vercel.app
- Demo video: (YouTube URL — fill in after upload)
- Pitch deck: https://github.com/Eren-dotcom/chainlens/blob/main/docs/PITCH-DECK.md

## Full description

**Problem.** Chains market block time, but users actually wait for finality — the time until a block cannot be reverted. No live, side-by-side measurement exists for the networks builders choose between, leaving "fast chain" claims unchecked.

**Solution.** ChainLens is a live cross-chain observatory. It polls nine networks in parallel — six testnets (Portaldot V3, Ethereum Sepolia, Base Sepolia, Polygon Amoy, Arbitrum Sepolia, OP Sepolia) and three mainnets behind a toggle (Ethereum, Base, Polygon) — and displays their block time, finality lag, gas price, and endpoint reliability on a single dashboard, measured live from public RPCs. Around that live core it builds working tools, not just charts: the Finality Race (log-scale lanes, pulsing as each chain finalizes), a settlement ticker of real finalization events, session statistics (min / average / p95 finality, gas percentiles, a published-formula Finality Index), history charts, a live block feed, a per-chain detail drawer, a Wait Calculator that answers "how long until it's final?" from measured p95 finality per use case, a verify-it-yourself panel that re-samples a chain and shows the raw RPC values next to ChainLens's math, embeddable live finality badges, and CSV/JSON export of the full sample history. On top of that, v3 adds the tools users actually ask for: an **"Is my block final yet?" checker** (paste a block number or transaction hash, get a plain-language verdict against the live finalized head), an **Endpoint Race** that races every configured RPC head-to-head and flags stale or down endpoints — the usual reason tools disagree about a chain — a **Bridge Wait Estimator** that separates the measured finality leg from labelled protocol constants instead of inventing a single number, a **confirmations-to-time converter** with "stop counting blocks" finalized-tag snippets, **degradation alerts** that fire only on measured facts, a **Portaldot deep-dive** (EVM vs Substrate finalized lag with a GRANDPA explainer), an **API explorer**, and an **open dataset** snapshot tool. It is strictly read-only: no wallets, no keys, no transactions — the single exception is a deploy-it-yourself page where the visitor's own wallet signs.

**What the live data shows** (measured 2026-11-05, re-measured on every poll):
- Portaldot V3 finalizes in about 12 seconds (finality lag ~2 blocks at 6-second blocks).
- Ethereum Sepolia requires about 15 minutes (lag ~70 blocks).
- Base Sepolia produces the fastest blocks at every 0.2 seconds (Flashblocks), yet its finalized head trails by roughly 4,300–6,500 blocks — about 15–23 minutes to finality. Fastest blocks, slow finality.
- Arbitrum Sepolia (~14–19 min) and OP Sepolia (~21–23 min) land in the same slow-finality band.
- Mainnet confirms the pattern: Ethereum ~16–18 minutes to finality, Base ~20–23 minutes.
- Sepolia's gas price is the lowest of the testnets.
- Polygon Amoy and Polygon mainnet finalize through Heimdall checkpoints, not the EVM finalized tag. ChainLens reports their finality as n/a rather than the misleading "0 seconds" the tag suggests.

**How it works.** A zero-dependency Node.js poller samples every chain in parallel using `eth_getBlockByNumber` (latest + `finalized`) and `eth_gasPrice`. For Portaldot, it also uses the Substrate calls `chain_getHeader` and `chain_getFinalizedHead`, cross-checking finality across both stacks of its dual architecture. Block time is measured between consecutive samples, as some chains cluster timestamps, causing historical windows to misread them. The verdict strip (fastest finality / block time / gas) is computed from measured values on every sample and is never hardcoded. If an endpoint drops requests, the chain degrades gracefully, and its reliability percentage reflects the drop. Every metric is defined in docs/METHODOLOGY.md in the repository, and the live numbers are also served as a versioned JSON document (GET /api/metrics, spec chainlens-metrics/1) for other tools to consume — alongside a live SVG finality badge per chain (GET /api/badge.svg), an on-demand raw sampler for verification (GET /api/sample), session statistics on GET /api/status, the full history as CSV (GET /api/history.csv), the endpoint race (GET /api/endpoints), the finality checker (GET /api/check), and the anchor bytecode (GET /api/anchor).

**How to run it.** Run `npm start` to launch the dashboard and JSON APIs on http://localhost:4178. Use `npm run once` to print a single comparison sample, `npm test` for metric unit tests, and `npm run smoke` for a live smoke test across all watched chains. Requires Node.js ≥ 18; no install step needed.

**On-chain anchoring (FinalityAnchor).** ChainLens also ships a write path: `FinalityAnchor`, a small contract (source + compiled bytecode in the repo) that stores ChainLens finality snapshots on Portaldot V3 itself, turning measurements into permanent, checkable records. Its deployment from our operator account is currently blocked by a Portaldot platform gate, documented with transaction-level evidence in docs/ANCHOR-STATUS.md: the Portaldot team funded our operator account with 500 tPOT, but the funds sit in the chain's revive fallback account and cannot pay fees until the account is mapped — a step this runtime does not let an Ethereum-style key perform for itself (the chain's own EVM RPC fails on the account identically). We publish the evidence rather than a claim — and the dashboard routes around the gate honestly: any visitor can deploy the exact compiled bytecode from their own wallet via the Deploy FinalityAnchor Yourself section (their wallet signs; ChainLens never sees a key).

**Why it helps Portaldot.** Builders deciding where to deploy can see Portaldot V3 finalize faster than established testnets on the metric that matters most for user experience: seconds, not minutes. The data is live and reproducible. It also provides a neutral measuring stick for the ecosystem: ChainLens will report accurately if another chain wins.

**Limitation.** The ChainLens observatory is read-only by design; its companion contract FinalityAnchor is written and compiled but not yet deployed, for the documented platform reason above (docs/ANCHOR-STATUS.md). No contract address is claimed.

## Track
Multi-Chain & Cross-Chain Infra

## Testnet integration (organizer field, honesty rule)
Read-only observatory with no contract deployment. It reads the Portaldot V3 testnet live via EVM and Substrate RPC (chain ID 420420777), compared against Ethereum Sepolia, Base Sepolia, Polygon Amoy, Arbitrum Sepolia and OP Sepolia testnets, plus Ethereum, Base and Polygon mainnets, all via public RPCs. A deploy-it-yourself page lets visitors deploy the compiled FinalityAnchor contract to Portaldot V3 from their own wallets; ChainLens itself holds no keys and deploys nothing.

## Current Project Progress (organizer question)
Complete and live. ChainLens v3 is deployed at https://chainlens-five.vercel.app and open source at https://github.com/Eren-dotcom/chainlens: a zero-dependency, read-only observatory polling nine networks (Portaldot V3, five comparison testnets, three mainnets) with live block time, time-to-finality, gas percentiles, endpoint reliability and a dual EVM+Substrate finality cross-check for Portaldot. It ships working tools on top of the measurements — a block/transaction finality checker, an RPC endpoint race, a bridge wait estimator, a wait calculator and confirmations converter, live embeddable badges, a versioned metrics API (chainlens-metrics/1), CSV/JSON export and an open-dataset snapshot tool — with unit tests passing and every number measured live from public RPCs. The FinalityAnchor contract (source + compiled bytecode) is in the repo, with a deploy-it-yourself page for visitors' own wallets. Demo video recorded from the live site.

## Outstanding Items (organizer question)
One item, documented with full evidence in docs/ANCHOR-STATUS.md: deploying FinalityAnchor from our own operator account is blocked by a Portaldot V3 platform gate — the account was funded with 500 tPOT by the Portaldot team, but the funds sit in the chain's pallet-revive fallback account and cannot pay fees until the account is mapped, a step this runtime does not let an Ethereum-style key perform for itself (the chain's own EVM RPC fails identically). The contract deploys the day the gate opens; meanwhile any visitor can deploy the same bytecode from their own wallet via the dashboard. No contract address is claimed. Post-hackathon: grow the open dataset with hourly snapshots and add more endpoints per chain to the race.

## Looking for teammates
No (solo participant).
