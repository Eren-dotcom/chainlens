# QA record — arena.ai demo-script round (2026-11-05)

Source: arena.ai agent mode, conversation 01a1aad8-5ce9-709c-9c49-14524e3a5cd0.
Outcome: **v2 script adopted in full** (docs/DEMO-SCRIPT.md) — the strongest return of the round.

## What arena caught, and Muse's verification

- **"ChainLens proves it two ways" was an overclaim** — two independent reads are a double-check,
  not a proof. Fixed to "double-checks it two ways". Same honesty family as the "integrates" fix.
- **"Base produces hundreds of blocks" was only true late in its segment** — at 0.2s blocks the
  on-screen counter reads ~150 at segment start and ~250 at the end, so "hundreds" (≥200) could be
  challenged by a judge watching the counter. Fixed to "over a hundred blocks", true throughout.
  (Assumes the shoot restarts the monitor fresh — now on the pre-recording checklist.)
- **S1 overran its slot** (41 words in 12s); timings re-balanced, total unchanged at 2:25.
- **S5's "fake a zero-second finality" needed one live verification** — done 2026-11-05 against the
  endpoint ChainLens actually uses: Amoy latest 52045659 vs finalized 52045657 (2-block lag →
  ≈0–2s naive read vs minutes of real checkpoint finality). The line is airtight.
- Structural: the close now bookends on the S1 chart shot with a silent still-running hold —
  "the last thing a judge sees is the product measuring in real time". Adopted.
- Pacing direction adopted for the shoot: card-by-card highlight as S2 names each chain, directed
  zoom on the cross-check line in S4, the intentional 7s silent hold in S3, live terminal output
  under S7's VO.

## Kept despite review pressure

- "Portaldot wins finality — by about a hundred times": the measured ratios are ~76× (Sepolia,
  ~912s) to ~115× (Base, ~1380s) against Portaldot's ~12s; "about a hundred" fairly characterizes
  the field. Arena listed it among numbers to keep exact; it stays.
