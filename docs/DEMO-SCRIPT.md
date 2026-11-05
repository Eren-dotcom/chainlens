# ChainLens — demo video shooting script v2 (target ≤ 2:30, hard cap 3:00) · Total 2:25 · VO ≈ 287 words

Revised by arena.ai (agent mode) and QA-adopted by Muse, 2026-11-05 — see docs/QA-ARENA-SCRIPT.md.
Rules (carried from NodePulse): real screencast of the real live dashboard only; never call a frozen screen live; if an endpoint drops mid-recording, keep it in — reliability is part of the story.
Added for this shoot: the 0:00 frame must visibly tick (counter or chart in motion) — "live" is shown, not asserted.

**S1 — Hook (0:00–0:14) — finality chart close-up, counter visibly ticking** *(39 words; deliver ~10% faster than the rest)*
"Base Sepolia makes a block every fifth of a second. So why does a transaction there take over twenty minutes to become final — while Portaldot does it in about twelve seconds? This is ChainLens — and it's live right now."

**S2 — What it is (0:14–0:31) — full dashboard; name each card as it's spoken** *(31 words)*
"ChainLens is a live cross-chain observatory. It watches four testnets at once — Portaldot V3, Ethereum Sepolia, Base Sepolia, and Polygon Amoy — and compares the number that actually matters: time to finality."

**S3 — The race (0:31–0:51) — chain cards, blocks-since-start counters** *(29 words)*
"Watch the counters. Base produces over a hundred blocks while Portaldot produces a handful. If block time were the whole story, this race would already be over. It isn't."
(VO ends ~0:44; hold ~7s on the racing counters with no VO — the numbers close the segment.)

**S4 — Finality deep-dive (0:51–1:16) — Portaldot card; zoom to the Substrate cross-check line as it's spoken** *(52 words)*
"Finality is the gap between the latest block and the finalized one. On Portaldot that gap is about two blocks — roughly twelve seconds — and ChainLens double-checks it two ways: the EVM finalized tag, and the native Substrate finalized head, read independently. On Sepolia the same gap is about seventy blocks: fifteen minutes."

**S5 — Honest measurement (1:16–1:36) — Amoy card showing n/a, reason on screen** *(52 words)*
"ChainLens refuses to print numbers it can't defend. Polygon finalizes through checkpoints, and its EVM finalized tag would fake a zero-second finality — so Amoy is reported as n/a, with the reason on screen. Block times are measured between live samples, because some chains cluster their timestamps — and a clock-based read gets fooled."

**S6 — Verdicts (1:36–1:50) — verdict strip; verify the on-screen strip matches these three lines at recording time** *(32 words)*
"The verdicts at the top are computed from the live measurements on every poll — nothing is hardcoded. Base wins block time. Sepolia wins gas. (beat) Portaldot wins finality — by about a hundred times."

**S7 — Run it (1:50–2:09) — terminal card (npm run once output) + README card** *(28 words)*
"It's zero-dependency Node.js. One command starts it, one command prints a full comparison as JSON, and the tests — including a live four-chain smoke test — are in the repo."
(The terminal visibly types the command and streams live output during the VO; cut to the README card for the last ~5s.)

**S8 — Close (2:09–2:25) — cut back to the S1 finality chart close-up (bookend); counter still ticking** *(24 words)*
"ChainLens: measured, not claimed. Built for Portaldot Hacker House 2026, Multi-Chain and Cross-Chain Infra. Links are below. It's still running — check the numbers yourself."
(Hold ~3s on the still-live screen after the last word — no VO, no new graphics — and cut on live.)

**Pre-recording checklist:** confirm zero runtime deps ✓ (no package.json dependencies) · confirm verdict strip matches S6 triplet at shoot time · confirm naive Amoy EVM read yields ~0s ✓ (verified 2026-11-05: latest 52045659 vs finalized 52045657 — a 2-block lag, ≈0-2s naive vs minutes of real checkpoint finality) · confirm the 0:00 frame is ticking · restart the monitor fresh so the race counters start near zero.

**Changes from v1:** S1 closer rewritten ("and it's live right now"); timings re-balanced (S1 14s, S8 16s; total stays 2:25); S3 "hundreds" → "over a hundred" (counter-accurate for the whole segment); S4 "proves / checked" → "double-checks / read" (overclaim fix); S5 last sentence clarified ("a clock-based read gets fooled"); S8 bookend shot + silent ticking hold + final line. Every measured number unchanged.
