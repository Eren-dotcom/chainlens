# QA record — Design Arena dashboard redesign (2026-11-05)

Project: https://www.designarena.ai/chat/f7e02786-886e-4435-8320-b13c359117b0 ("ChainLens Dark
Dashboard", winning direction "Option D").

## Verdict: design not adopted; principles checked, nearly all already present

**Why the design itself cannot be used:**

1. Design Arena could not open the uploaded screenshot (its file chooser never launched, two
   attempts), so it designed from the text brief alone — it never saw the real dashboard.
2. The design uses an **invented dataset**: chains Avalanche / Solana / Ethereum mainnet (the real
   dashboard compares Ethereum Sepolia, Base Sepolia, Polygon Amoy testnets), Portaldot finality
   "2.4s" (measured: ~12s), plus metrics ChainLens does not have — TPS, USD fees, uptime %,
   24h trend sparklines, "1.2M transactions / 24h". Rebuilding the UI around invented numbers
   would break the project's honesty rule.

**Its five criticisms, checked against the real dashboard (public/index.html):**

| Criticism | Reality |
|---|---|
| No single focal point | Verdict strip is the first, largest element; then chart; then cards. Already ordered conclusion → evidence → detail. |
| Chart lacks scale labels / "lower is better" | Chart is titled "Time to finality (log scale — lower is better)" and every bar carries its value label. |
| Cards lack consistent structure | All cards render from one template with identical row order. |
| Home chain not distinguished | Portaldot card has a coral border and a "HOME CHAIN" badge. |
| Coral overused | Coral is reserved for the home chain, winner values and the finality winner's bar. |

**Adopted:** nothing structural. The one fair point — a relative freshness cue ("updated Xs ago")
vs our absolute timestamp — is cosmetic and not worth a change this close to the deadline; the
dashboard already shows its update time and sample number.

Lesson, same as the Qwen round: a reviewer that cannot see the artifact invents one. Both records
now say so, so future rounds attach artifacts in a form the tool can actually open.
