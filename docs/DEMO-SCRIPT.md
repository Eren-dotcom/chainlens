# ChainLens — demo video shooting script (target ≤ 2:30, hard cap 3:00)

Rules (carried from NodePulse): real screencast of the real live dashboard only; never call a frozen screen live; if an endpoint drops mid-recording, keep it in — reliability is part of the story.

**S1 — Hook (0:00–0:12) — finality chart close-up**
"Base Sepolia makes a new block every fifth of a second. So why does a transaction there take over twenty minutes to become final — while Portaldot does it in about twelve seconds? This is ChainLens, and it measures the difference live."

**S2 — What it is (0:12–0:30) — full dashboard**
"ChainLens is a live cross-chain observatory. It watches four testnets at once — Portaldot V3, Ethereum Sepolia, Base Sepolia, and Polygon Amoy — and compares the number that actually matters: time to finality."

**S3 — The race (0:30–0:50) — chain cards, blocks-since-start counters**
"Watch the counters. Base produces hundreds of blocks while Portaldot produces a handful. If block time were the whole story, this race would already be over. It isn't."

**S4 — Finality deep-dive (0:50–1:15) — Portaldot card + substrate cross-check line**
"Finality is the gap between the latest block and the finalized one. On Portaldot that gap is about two blocks — roughly twelve seconds — and ChainLens proves it two ways: the EVM finalized tag, and the native Substrate finalized head, checked independently. On Sepolia the same gap is about seventy blocks: fifteen minutes."

**S5 — Honest measurement (1:15–1:35) — Amoy card showing n/a**
"ChainLens refuses to print numbers it can't defend. Polygon finalizes through checkpoints, and its EVM finalized tag would fake a zero-second finality — so Amoy is reported as n/a, with the reason on screen. Block times are measured between live samples, because some chains cluster their timestamps and fool the obvious method."

**S6 — Verdicts (1:35–1:50) — verdict strip**
"The verdicts at the top are computed from the live measurements on every poll — nothing is hardcoded. Base wins block time. Sepolia wins gas. Portaldot wins finality — by about a hundred times."

**S7 — Run it (1:50–2:10) — terminal card (npm run once output) + README card**
"It's zero-dependency Node.js. One command starts it, one command prints a full comparison as JSON, and the tests — including a live four-chain smoke test — are in the repo."

**S8 — Close (2:10–2:25) — full dashboard**
"ChainLens: measured, not claimed. Built for Portaldot Hacker House 2026, Multi-Chain and Cross-Chain Infra. Links are below — run it and check the numbers yourself."
