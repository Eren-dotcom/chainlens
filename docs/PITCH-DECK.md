# ChainLens — pitch deck text (9 slides, drafted 2026-11-05 from live-measured data)

## Slide 1 — Title
ChainLens
Live cross-chain finality observatory: Portaldot V3 vs Sepolia, Base Sepolia and Polygon Amoy.
Portaldot Hacker House 2026 · Multi-Chain & Cross-Chain Infra

## Slide 2 — Problem
Every chain markets block time. Users wait for finality.
- Block time is the headline number in every chain announcement.
- Finality — when a block can no longer be reverted — is what wallets, bridges and apps actually wait on.
- No live side-by-side measurement exists, so "fast" claims go unchecked.

## Slide 3 — Solution
One live screen. Four testnets. Measured, not claimed.
- Portaldot V3, Ethereum Sepolia, Base Sepolia, Polygon Amoy, polled in parallel every 12 seconds.
- Block time, finality lag, gas price, endpoint reliability, and a live blocks-produced race.
- Read-only by design: no wallet, no keys, no transactions. Zero dependencies.

## Slide 4 — The headline finding (measured live, 2026-11-05)
Time to finality:
- Portaldot V3: ~12 seconds (lag ~2 blocks × 6s)
- Ethereum Sepolia: ~15 minutes (lag ~70 blocks × 12s)
- Base Sepolia: ~20+ minutes (lag ~6,500 blocks × 0.2s)
- Polygon Amoy: n/a — checkpoint finality (see slide 6)
Base makes a block every 0.2 seconds — and still takes 100x longer than Portaldot to finalize. Fastest blocks ≠ fastest finality.

## Slide 5 — How it works
- Zero-dependency Node.js poller; per-chain parallel sampling with retry/backoff.
- EVM: eth_getBlockByNumber (latest + finalized tag), eth_gasPrice.
- Portaldot dual-stack: Substrate chain_getHeader + chain_getFinalizedHead cross-check the EVM finalized view — two independent reads of the same finality.
- Dashboard + JSON APIs (/api/status, /api/history); serverless mode samples per request.

## Slide 6 — Honest measurement (the ChainLens difference)
- Block time measured between consecutive live samples: some chains cluster block timestamps, and historical windows misread them (verified against a 100-block on-chain window).
- Amoy's EVM finalized tag echoes the latest block — a fake "0s finality". ChainLens reports n/a and says why, on the dashboard.
- Verdicts (fastest finality / block time / gas) are computed from measured values every sample — Sepolia wins gas, Base wins block time, Portaldot wins finality. Nothing is hardcoded.

## Slide 7 — Why Multi-Chain, why Portaldot
- Chain choice is the first decision every multi-chain builder makes; ChainLens is the measuring stick.
- Portaldot's dual EVM + Substrate architecture is the only one here whose finality can be cross-checked two independent ways — and the data shows it finalizing in seconds.
- A neutral tool that would report another chain's win is exactly what makes Portaldot's win credible.

## Slide 8 — Roadmap
- More networks (mainnets and further testnets) behind the same metric definitions.
- Historical finality charts and regression alerts when a chain's finality degrades.
- A public per-chain health API for wallets and bridges to consume.

## Slide 9 — Links
- GitHub: https://github.com/Eren-dotcom/chainlens
- Live demo: https://chainlens-five.vercel.app
- Demo video: (YouTube URL — fill in after upload)
- Run it yourself: npm start (Node ≥ 18, no dependencies to install)
