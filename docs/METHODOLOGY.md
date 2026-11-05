# ChainLens methodology — how every number is measured

ChainLens exists because chain performance claims are usually marketing. This page is the contract:
every metric on the dashboard is defined here, precisely enough for anyone to reproduce or audit it.
Other tools and teams are welcome to adopt these definitions.

## Polling

- Every watched chain is sampled in parallel every 12 seconds (configurable via `POLL_MS`).
- Each sample is built from read-only JSON-RPC calls only. Nothing is signed or sent.
- A sample for a chain is **core** (latest block) plus **optional** parts (finalized block, gas price).
  If an optional call fails, its metric is null for that sample; the sample itself still counts.
- Failed requests are retried with backoff (3 attempts, 6s timeout). A poll counts as failed for a
  chain only after its retries are exhausted — see Reliability.

## Block time

**Definition:** `(timestamp₂ − timestamp₁) / (height₂ − height₁)` between this monitor's own two most
recent consecutive successful observations of a chain.

Why not a window of historical blocks? Because some chains cluster block timestamps: on Base Sepolia
and Polygon Amoy, consecutive blocks can carry near-identical timestamps, so a 20-block historical
window computes a "block time" that is an artifact of timestamp quantization, not production rate.
Real-time deltas between independent observations measure the production rate directly. This method
was verified against a 100-block on-chain window on 2026-11-05 (Base Sepolia: 0.200s both ways;
Polygon Amoy: 1.000s both ways).

On the first sample after a monitor starts, block time is null — one observation cannot define a rate.

## Finality

**Definitions, per chain:**
- **Finality lag (blocks)** = `latest height − finalized height`, clamped at 0.
- **Time to finality (seconds)** = `finality lag × that chain's measured block time`, rounded.

"Finalized" means the chain's own finality signal:
- Ethereum Sepolia and Base Sepolia: the EVM `finalized` block tag.
- Portaldot V3: the EVM `finalized` tag, **cross-checked** against the native Substrate finalized
  head (`chain_getFinalizedHead` + `chain_getHeader`). Portaldot V3's dual EVM + Substrate
  architecture makes it the only watched chain whose finality can be verified through two
  independent stacks; the dashboard displays both lags and whether they agree.
- Polygon Amoy: **n/a.** Bor finalizes through Heimdall checkpoints; its EVM `finalized` tag echoes
  the latest block, which would report a false 0-second finality. ChainLens refuses to print a
  number it cannot defend, and labels the metric n/a with the reason, on the dashboard and here.
  Checkpoint-based finality is on the order of minutes.

## Gas price

The RPC-reported `eth_gasPrice` at sample time, displayed in wei, unconverted and unaveraged.

## Reliability

Per chain: `successful polls / total polls` since this monitor instance started, as a percentage.
It measures the public endpoint's behavior as much as the chain's — that is the point: an
observatory should show the quality of its own evidence.

## Verdicts

Fastest block time, fastest finality and lowest gas are recomputed from each sample's measured
values (chains with a failed sample or a null metric are skipped). They are never hardcoded —
if another chain wins a category, the dashboard says so. (On 2026-11-05 samples: Base Sepolia won
block time, Sepolia won gas, Portaldot V3 won finality.)

## Who this serves

Bridge and multi-chain teams verifying finality assumptions before deploying; builders choosing
a network on measured data instead of announcements; and anyone who wants a neutral, reproducible
check on "fast chain" claims — including claims about Portaldot.
