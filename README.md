# ChainLens

**Live cross-chain observatory: Portaldot V3 vs Ethereum Sepolia, Base Sepolia and Polygon Amoy — block time, finality and gas, measured live from public RPCs.**

Built for Portaldot Hacker House 2026, Multi-Chain & Cross-Chain Infra track. Zero dependencies, read-only by design: ChainLens never signs and never sends a transaction — it only reads.

## Why this exists

Every chain claims to be fast. ChainLens measures instead of claims. It polls four testnets side by side and answers the question users and builders actually care about — **how long until my block is final?** — with live numbers on one screen.

What the live data shows (measured 2026-11-05, re-measured continuously by the dashboard):

- **Portaldot V3 finalizes in about 12 seconds** (finality lag ~2 blocks × 6s blocks).
- Ethereum Sepolia needs **~15 minutes** (lag ~70 blocks × 12s).
- Base Sepolia produces blocks every **0.2s** (Flashblocks) — the fastest block time here — yet its finalized head trails by ~6,500 blocks, about **20+ minutes** to finality.
- Sepolia's gas price is the lowest of the four.
- Polygon Amoy finalizes through Heimdall checkpoints rather than the EVM `finalized` tag; ChainLens reports its finality as **n/a** instead of the fake "0 seconds" the tag would imply.

Portaldot's finality is also **cross-checked two ways**: the EVM `finalized` tag and the native Substrate finalized head, shown side by side on the dashboard. That cross-check is only possible because of Portaldot V3's dual EVM + Substrate architecture — ChainLens puts that V3 feature to work as a verification method, and it is built for the people who need these numbers most: bridge and multi-chain teams verifying finality assumptions before they deploy.

Every metric is defined precisely in [docs/METHODOLOGY.md](docs/METHODOLOGY.md) — the measurement spec is part of the product, written to be reused and audited.

## What it measures, per chain

- **Block height** and **blocks produced since the monitor started** (the live "race")
- **Block time** — measured between ChainLens's own consecutive samples. Some chains cluster block timestamps, which makes historical-window averages lie (a 20-block window reads Base's clustered timestamps wrong); real-time height/timestamp deltas are honest everywhere. Verified against a 100-block on-chain window on 2026-11-05.
- **Finality lag** — latest head minus finalized head, in blocks and in estimated seconds (lag × that chain's own measured block time)
- **Gas price** — RPC-reported, in wei
- **Endpoint reliability** — share of successful polls per chain since the monitor started; dropped requests are retried with backoff before a poll counts as failed

Verdicts at the top of the dashboard (fastest finality / fastest block time / lowest gas) are computed from the measured values on every sample — not hardcoded.

## Run it

```bash
npm start          # dashboard + APIs on http://localhost:4178
npm run once       # one full comparison sample as JSON (takes two polls)
npm test           # offline unit tests for the metric math
npm run smoke      # live smoke test against all four chains
```

Requires Node.js ≥ 18. No `npm install` needed — there are no dependencies.

APIs: `GET /api/status` (latest comparison + verdicts), `GET /api/history?n=50` (recent samples), and `GET /api/metrics` — the stable, versioned metrics document (`chainlens-metrics/1`) that other tools can consume and cite; see "Adopt this spec" in the methodology.

Every RPC endpoint can be overridden by environment variable (`PORTALDOT_RPC`, `PORTALDOT_SUBSTRATE_RPC`, `SEPOLIA_RPC`, `BASE_RPC`, `AMOY_RPC`); `PORT` and `POLL_MS` configure the server and poll interval (default 12s).

## How it works

```
src/rpc.js      JSON-RPC client with retry/backoff; terminal errors fail fast
src/chains.js   the four watched chains (Portaldot carries a Substrate endpoint too)
src/metrics.js  pure metric math — block time, finality lag/seconds, verdict picker (unit-tested)
src/poller.js   parallel multi-chain sampler; per-chain reliability + race counters;
                Portaldot finality cross-checked via Substrate headers
src/server.js   dashboard + /api/status + /api/history
public/         the comparison dashboard (verdict strip, finality chart, chain cards)
```

On serverless hosting the poller runs per request instead of on a timer, so the public demo takes a fresh live sample on each API call; block time there is computed against the previous request's observation when available.

## Chains watched

| Chain | Chain ID | Role |
|---|---|---|
| Portaldot V3 Testnet | 420420777 | home chain — EVM + Substrate dual read |
| Ethereum Sepolia | 11155111 | comparison |
| Base Sepolia | 84532 | comparison |
| Polygon Amoy | 80002 | comparison (finality n/a — checkpoint-based) |

## Limitation

ChainLens is a live-data observatory, not a deployed smart contract: it connects to Portaldot V3 testnet only by reading its EVM and Substrate RPCs in real time. It holds no keys and needs no funds — that is the design, stated plainly.

## License

MIT
