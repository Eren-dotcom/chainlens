# ChainLens open dataset

ChainLens publishes its measurements as an open dataset: hourly snapshots of
live cross-chain finality, block time, gas and height, in a plain JSON Lines
file anyone can reuse.

## Format

`data/snapshots.jsonl` — one JSON object per line, appended by
`tools/snapshot.mjs`:

```json
{"ts":"2026-11-05T12:00:00.000Z","chains":{"portaldot":{"finalitySec":12,"blockTimeSec":6,"gasWei":21730,"height":333361},"sepolia":{"finalitySec":780,"blockTimeSec":12,"gasWei":null,"height":null}}}
```

Fields per chain:

| Field | Meaning |
|---|---|
| `finalitySec` | Measured time to finality in seconds (lag × measured block time). `null` for checkpoint chains (Amoy, Polygon) — never an invented number. |
| `blockTimeSec` | Measured seconds per block, from consecutive live samples. |
| `gasWei` | Latest `eth_gasPrice` in wei. |
| `height` | Latest block height at snapshot time. |

## How to run it

```bash
node tools/snapshot.mjs
# CHAINLENS_URL=http://localhost:4178 node tools/snapshot.mjs  # against a local server
```

Hourly via cron:

```cron
0 * * * * cd /path/to/chainlens && node tools/snapshot.mjs >> data/snapshot.log 2>&1
```

## Licence

Free reuse, CC0-style: copy it, chart it, cite it, build on it. Attribution
("data: ChainLens") is appreciated but not required.

## Honesty note

The dataset starts when you start running the snapshot tool — there is no
backfilled history, and no snapshot exists before the first run. Gaps in the
file mean the tool (or the upstream RPCs) was down, not that data was removed.
