# QA record — Qwen judge's-eye critique (2026-11-05)

Source: Qwen (Qwen3.7-Plus), judging the README + submission copy cold.
Full text: https://chat.qwen.ai/c/264aaba7-e272-449f-aa8d-037d74e86b7a

## The critique — sound, and largely adopted

- The Substrate cross-check was buried → **adopted**: it is now its own README section,
  "Verified two ways — Portaldot's dual stack", including the ±1-block agreement rule.
- Judges want evidence, not claims → **adopted with real data only**: the README now embeds the
  actual dashboard screenshot (docs/dashboard.png) and a **real** `/api/metrics` sample captured
  2026-11-05 (Portaldot height 332217, finalitySec 12, gasWei 21790), trimmed to one chain.
- "Limitation" reads apologetic → **adopted**: it now ends "ChainLens measures finality; it does
  not participate in it." (Qwen's line, kept.)
- Inconsistencies → **adopted**: submission tagline now says "Ethereum Sepolia" (matching the
  README); the submission's Full description now references METHODOLOGY.md and /api/metrics; the
  README gained the pitch-deck link.
- "Methodology not summarized" → not adopted: the README's "What it measures" section already
  carries the substance; the spec link sits one line below it.

## Qwen's proposed replacement README — REJECTED as a whole

Individual good lines were lifted (above). The document itself could not be adopted:

1. **Fabricated sample JSON** — invented height (1234567), invented gas price, invented field
   names (`substrateFinalizedHead`, `reliability: 0.98`) that do not match the real API shape.
   Publishing invented output would break the project's core claim: it refuses to print a number
   it cannot defend.
2. **Invented live-demo URL** (chainlens.vercel.app) for a deployment that had not happened.
3. **Regression of the DeepSeek wording fix** — its FAQ and Limitation restored "it integrates
   Portaldot V3 testnet", the exact overclaim removed an hour earlier.
4. **Dropped shipped features** — its API list omits `/api/metrics`; its architecture sketch omits
   the serverless mode and the Substrate read path.
5. **Unverifiable superlative** — "the only tool that measures finality side by side" (FAQ).
   Not a claim we can defend, so not a claim we make.

Lesson for future rounds: give the reviewing AI the real API output and the current URLs as
attachments, or it will invent plausible-looking ones.
