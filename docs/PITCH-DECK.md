# ChainLens — pitch deck text (9 slides, drafted 2026-11-05 from live-measured data)

## Slide 1 — Title
ChainLens
Live cross-chain finality observatory: Portaldot V3 vs five testnets and three mainnets.
Portaldot Hacker House 2026 · Multi-Chain & Cross-Chain Infra

## Slide 2 — Problem
Every chain markets block time. Users wait for finality.
- Block time is the headline number in every chain announcement.
- Finality — when a block can no longer be reverted — is what wallets, bridges and apps actually wait on.
- No live side-by-side measurement exists, so "fast" claims go unchecked.

## Slide 3 — Solution
One live screen. Nine networks. Measured, not claimed.
- Six testnets (Portaldot V3, Sepolia, Base Sepolia, Amoy, Arbitrum Sepolia, OP Sepolia) plus Ethereum, Base and Polygon mainnet behind a toggle, polled in parallel.
- Block time, finality lag, gas price with percentile bands, endpoint reliability, block contents and RPC latency — plus session statistics and a 0–100 Finality Index on a published formula.
- Tools, not just charts: the Finality Race, a settlement ticker, a "Is my block final yet?" checker, an RPC endpoint race, a bridge wait estimator, a wait calculator and confirmations converter, a Portaldot deep-dive, a verify-it-yourself raw sampler, embeddable live finality badges, and an API explorer.
- Read-only by design: no wallet, no keys, no transactions. Zero dependencies.

## Slide 4 — The headline finding (measured live, 2026-11-05)
Time to finality:
- Portaldot V3: ~12 seconds (lag ~2 blocks × 6s)
- Ethereum Sepolia: ~15 minutes (lag ~70 blocks × 12s)
- Base Sepolia: ~15–23 minutes (lag ~4,300–6,500 blocks × 0.2s)
- Arbitrum Sepolia ~14–19 min · OP Sepolia ~21–23 min · Ethereum mainnet ~16–18 min · Base mainnet ~20–23 min
- Polygon Amoy + Polygon mainnet: n/a — checkpoint finality (see slide 6)
Base makes a block every 0.2 seconds — and still takes 100x longer than Portaldot to finalize. Fastest blocks ≠ fastest finality — on testnet and mainnet alike.

## Slide 5 — How it works
- Zero-dependency Node.js poller; per-chain parallel sampling with retry/backoff.
- EVM: eth_getBlockByNumber (latest + finalized tag), eth_gasPrice.
- Portaldot dual-stack: Substrate chain_getHeader + chain_getFinalizedHead cross-check the EVM finalized view — two independent reads of the same finality.
- Dashboard + JSON APIs (/api/status with session stats, /api/history, /api/metrics, /api/badge.svg, /api/sample, /api/history.csv, /api/endpoints, /api/check, /api/anchor); serverless mode samples per request.

## Slide 6 — Honest measurement (the ChainLens difference)
- Block time measured between consecutive live samples: some chains cluster block timestamps, and historical windows misread them (verified against a 100-block on-chain window).
- Amoy's EVM finalized tag echoes the latest block — a fake "0s finality". ChainLens reports n/a and says why, on the dashboard.
- Verdicts (fastest finality / block time / gas) are computed from measured values every sample — Sepolia wins gas, Base wins block time, Portaldot wins finality. Nothing is hardcoded.

## Slide 7 — Why Multi-Chain, why Portaldot
- Chain choice is the first decision every multi-chain builder makes; ChainLens is the measuring stick.
- Portaldot's dual EVM + Substrate architecture is the only one here whose finality can be cross-checked two independent ways — and the data shows it finalizing in seconds.
- A neutral tool that would report another chain's win is exactly what makes Portaldot's win credible.

## Slide 8 — Roadmap
- Grow the open dataset: hourly snapshots across all nine networks, published for anyone to cite.
- More endpoints per chain in the race, and long-window finality history beyond a single session.
- Deploy FinalityAnchor the day the Portaldot account-mapping gate opens, and anchor the dataset on-chain.
- Wider adoption of the chainlens-metrics/1 document by wallets and bridges.

## Slide 9 — Links
- GitHub: https://github.com/Eren-dotcom/chainlens
- Live demo: https://chainlens-five.vercel.app
- Demo video: https://youtu.be/i1y2EOLO880
- Run it yourself: npm start (Node ≥ 18, no dependencies to install)
