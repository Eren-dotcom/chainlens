# ChainLens — GLM independent code review (2026-11-05) + Muse dispositions

GLM (chat.z.ai, GLM-5.3-Flash) reviewed the six backend files as uploaded at 12:58 IST — i.e. BEFORE
Muse's pre-deploy perfection pass (carry-forward, forward-only observation guard) landed.
**18 findings: 2 High, 4 Medium, 12 Low.** Muse's disposition of each, verified against the code:

## Fixed
- **H1 (High) — serverless concurrency race on the shared poller.** Real. `Poller.sample()` now
  self-queues through a single in-flight promise (the timer path and the serverless path share it),
  and the serverless warm-up is memoized so concurrent cold requests share one double-sample.
- **H2 (High) — NaN poisoning of winner selection.** Real. `hexToInt` now validates the `0x…` format
  and parses via BigInt, returning null (never NaN) for malformed values; `pickWinners` additionally
  skips non-finite values. (Also fixes L10.)
- **M2 — a fully-finalized chain (lag 0) showed n/a when block time was unmeasured.** Real, one line:
  `finalitySeconds` returns 0 when lag is 0 regardless of block time. Unit-tested.
- **M3 — chain identity taken from static config, never verified.** Real, and the worst failure mode
  for an observatory. Each sample now also reads `eth_chainId`; a mismatch marks the chain ok=false
  with a "chain ID mismatch" error instead of displaying another network's data under a false name.
- **M4 — cold-start latency stacking.** Fixed with H1 (memoized warm-up; delay derived from pollMs).
- **L7 — finalized fetched after latest, understating lag.** Fixed: latest, finalized, gas and
  chainId are now read in one parallel batch.
- **L8 — negative lag silently clamped.** The display clamp stays, but the sample now carries
  `finalitySkew: true` when the finalized head reads ahead of the latest head (backend skew), and
  the methodology documents it.
- **L9 — block time spanning an outage gap.** Fixed: a failed sample now invalidates the chain's
  observation point, so the next rate is measured over a fresh interval (carry-forward covers the
  display for that one interval).
- **L11 — blocksSinceStart could go negative.** Clamped at 0.
- **L12 — cross-check disagreement not flagged in data.** The dashboard already displays agreement;
  the sample now also carries `substrate.agrees` for API consumers.
- **L13 — non-string RPC error messages.** Coerced with String() (retry semantics unchanged — an
  HTML gateway page is usually transient, which is what retries are for).
- **L15 — Substrate read serialized after the EVM round.** Now sampled in the same parallel batch.
- **L17 — server crash on missing dashboard file.** Startup now falls back to an inline error page.

## Mitigated by design (no change)
- **M1 — instantaneous block-time nulls / winner flapping.** The perfection pass's carry-forward
  already keeps a chain's last measured rate in play instead of dropping it out, and the 8-sample
  stability run showed a single stable block time per chain and the same finality winner 8/8.
  A history average was declined: it would blur the "measured live" claim the product stands on.

## Declined with reason
- **L14 — honor Retry-After.** The watched public endpoints recover under the existing backoff
  (100% poll reliability across the stability run); the added hot-path complexity buys nothing
  measurable here.
- **L16 — warming samples "pollute" stats.** The two warm-up samples are genuine live polls of
  real chains, not synthetic data; only their spacing is deliberate. Recorded here for transparency.
- **L18 — winner eligibility annotation in the UI.** Eligibility is already inspectable in the API
  (a chain's null metrics show exactly which categories it sat out); a UI annotation added clutter
  without new information. Kept the data honest instead of decorating it.

## Round 2 (2026-11-05, verification pass)

GLM re-reviewed the fixed code (poller, rpc, metrics, dashboard — the last unseen in round 1):
**12 of 18 confirmed FIXED, 3 PARTIAL, 3 NOT FIXED (the documented declines), plus 9 new Lows**
(7 dashboard, 2 backend). Source: https://chat.z.ai/c/81b07ef3-f67f-4c78-aace-329a6f5783b0

- **M4 and L17 closed by Muse's own verification** — GLM marked them PARTIAL only because the
  files live outside its reading set (api/_state.js, src/server.js). Both fixes are present:
  the memoized warm-up in _state.js (proven live by the 3-way concurrent cold probe in round 1)
  and the server.js dashboard fallback. No third round needed.
- **L8 now fully fixed**: `finalitySkew` is in the declared shape on failed samples too, and the
  dashboard shows a skew notice on the card when it fires.
- **New findings — 8 of 9 fixed:** B2 (hexToInt could return Infinity on absurd hex — one-line
  finite guard + unit test), B1 (samples now record `chainIdVerified`, so "checked" vs "skipped"
  is observable in the API), F1 (dashboard never claims LIVE over stale data — age check at
  2.5× the poll interval, fetch de-overlapped, no-store), F2 (finality bar width NaN% when every
  charted finality is 0), F3 (cross-check no longer claims "differs" when a view is simply
  missing — dashboard and server-side guards), F4 (the "sampled every N seconds" heading is set
  from the server's real pollMs), F6 (a carried-forward block time is labeled "carried from
  previous interval", not "live-measured" — poller sets `blockTimeCarried`), F7 (metric()
  escapes its values like every other render path).
- **F5 declined, with reason**: GLM's fix guards against a chain key missing from the API
  payload. Our poller always returns every configured chain (failures come back as ok:false
  cards), so the case cannot occur against this backend; not coding for a different one.
- The three standing declines (L14, L16, L18) stand; GLM reviewed the reasoning and concurred.
