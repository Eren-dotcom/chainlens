# ChainLens — DoraHacks submission copy (QA'd by Muse, 2026-11-05)

## Build name
ChainLens

## Tagline / Brief
Live cross-chain finality observatory: Portaldot V3 vs Sepolia, Base Sepolia and Polygon Amoy.

## Built with
Node.js, JavaScript, Ethereum JSON-RPC API, Substrate JSON-RPC API, HTML/CSS

## Links
- GitHub: https://github.com/Eren-dotcom/chainlens
- Live demo: (Vercel URL — fill in after deploy)
- Demo video: (YouTube URL — fill in after upload)
- Pitch deck: https://github.com/Eren-dotcom/chainlens/blob/main/docs/PITCH-DECK.md

## Full description

**Problem.** Every chain markets its block time. Almost nobody shows the number users actually wait for: **time to finality** — how long until a block can no longer be reverted. There is no live, side-by-side measurement of the networks a builder chooses between, so "fast chain" claims go unchecked.

**Solution.** ChainLens is a live cross-chain observatory. It polls four testnets in parallel — Portaldot V3, Ethereum Sepolia, Base Sepolia and Polygon Amoy — and puts their block time, finality lag, gas price and endpoint reliability on one honest dashboard, measured live from public RPCs. It is read-only by design: no wallet, no keys, no transactions.

**What the live data shows** (measured 2026-11-05, re-measured on every poll):
- Portaldot V3 finalizes in about 12 seconds (finality lag ~2 blocks at 6-second blocks).
- Ethereum Sepolia needs about 15 minutes (lag ~70 blocks).
- Base Sepolia produces the fastest blocks here — every 0.2 seconds (Flashblocks) — yet its finalized head trails by ~6,500 blocks: over 20 minutes to finality. Fastest blocks, slow finality.
- Sepolia's gas price is the lowest of the four.
- Polygon Amoy finalizes through Heimdall checkpoints, not the EVM finalized tag. ChainLens reports its finality as n/a instead of the misleading "0 seconds" that tag would suggest.

**How it works.** A zero-dependency Node.js poller samples every chain in parallel: `eth_getBlockByNumber` (latest + `finalized`), `eth_gasPrice`, and — for Portaldot — the Substrate calls `chain_getHeader` and `chain_getFinalizedHead`, so Portaldot's finality is cross-checked on both stacks of its dual architecture. Block time is measured between consecutive samples, because some chains cluster block timestamps and historical windows misread them. The verdict strip (fastest finality / block time / gas) is computed from the measured values on every sample, never hardcoded. A chain whose endpoint drops requests degrades gracefully and its reliability percentage shows it.

**How to run it.** `npm start` — dashboard and JSON APIs on http://localhost:4178. `npm run once` prints one full comparison sample; `npm test` runs the metric unit tests; `npm run smoke` runs a live four-chain smoke test. Node.js ≥ 18, no install step.

**Why it helps Portaldot.** Builders deciding where to deploy can watch Portaldot V3 beat established testnets on the metric that matters most for user experience — finality in seconds, not minutes — using live data anyone can reproduce. It also gives the ecosystem a neutral measuring stick: ChainLens would show it if another chain won.

**Limitation.** ChainLens is a live-data observatory, not a deployed smart contract. It integrates Portaldot V3 testnet by reading its EVM and Substrate RPCs in real time.

## Track
Multi-Chain & Cross-Chain Infra

## Testnet integration (organizer field, honesty rule)
Read-only observatory — no contract deployment; it integrates Portaldot V3 testnet via live EVM + Substrate RPC reads (chain ID 420420777), compared against Ethereum Sepolia, Base Sepolia and Polygon Amoy public RPCs.

## Looking for teammates
No (solo participant).
