# FinalityAnchor — deployment status and evidence

ChainLens measures four testnets read-only. Its write path is `FinalityAnchor`
(`contracts/FinalityAnchor.sol`): a small contract that stores ChainLens
finality snapshots on Portaldot V3 itself, so anyone can verify later what
ChainLens measured and when. This document records the contract's deployment
status with transaction-level evidence. Everything below was measured or
observed on 2026-11-05 and can be re-checked against the chain.

## Status

- Contract source: `contracts/FinalityAnchor.sol` (Solidity ^0.8.20, MIT)
- Compiled bytecode: `contracts/FinalityAnchor.bytecode.txt` — 1,036 bytes, compiled with solc 0.8.38+commit.1835d247.Emscripten.clang (optimizer on, 200 runs), sha256 `cb184adac7afef79d95593ee40b07d5d60ba3ce17b0e3dab30a38fa620adbf21`
- Operator account (EVM): `0xd0490BCd2Cdd0EFBc9D37aeBdB1b78B1A9a04c22`
- Deployment: **not yet executed** — blocked by the chain's account-mapping
  gate, documented below. No contract address is claimed anywhere in this
  project until a deployment transaction actually lands.

## The funds are real, and they are stuck

- The Portaldot team funded the operator account with **500 tPOT** on
  2026-11-05. Native view: System.Account free balance is exactly
  5×10^16 units (tPOT has 14 decimals). EVM view: 499.9 tPOT (0.1 is the
  existential deposit). Nonce is 0 in both views.
- On Portaldot V3, an Ethereum-style account's native account is the
  pallet-revive *fallback account*: the operator's SS58 address
  `5GmoWuS5BJMfyWhFyvWeyq4EerFHktEYn63m6PZCSvRZjNpq` decodes to the AccountId
  formed from the EVM address plus 0xEE padding. The 500 tPOT sits there.

## Runtime facts (from the chain's own metadata, fetched 2026-11-05)

- Chain: "PortaldotV3 Test", EVM chain ID 420420777.
- Revive is pallet 80. Relevant calls: `ethTransact` (80/0), `call` (80/1),
  `instantiateWithCode` (80/3), `mapAccount` (80/7),
  `dispatchAsFallbackAccount` (80/9), `ethInstantiateWithCode` (80/10),
  `ethSubstrateCall` (80/12).

## Deployment attempts, in order

All transfers were dust-sized (0.001–0.002 tPOT) and addressed to the
operator's own second wallet. Signatures were verified locally by public-key
recovery before every submission. No funds have moved; the nonce is still 0.

1. **`eth_sendRawTransaction` via the EVM RPC** — three variants (legacy
   EIP-155 at the chain-quoted gas price, EIP-1559 type-2, legacy at 1 gwei).
   All rejected by the transaction pool: error 1010, "Invalid Transaction".
2. **`author_submitExtrinsic` with a hand-encoded unsigned `eth_transact`
   extrinsic** — byte-wrapped submission: 1010 "bad signature" (an encoding
   artifact of the extra length prefix). Bare submission: error 1002, the
   runtime trapped during transaction validation.
3. **`eth_transact` built by @polkadot/api** from the fetched metadata —
   byte-identical to attempt 2, as expected. Result: error 1012,
   "Transaction is temporarily banned" (the pool had seen the same payload
   repeatedly by then).
4. **`eth_transact` with a fresh signed payload** (new value, new hash
   `0x2306d323625e7b918d7d388413acd522a7b8bde86ae9b4992569a9242d60f746`) —
   passed format validation and reached fee evaluation, then failed:
   error 1010, *"Inability to pay some fees, e.g. account balance too low"* —
   for an account whose EVM-visible balance is 499.9 tPOT.
5. **`dispatchAsFallbackAccount`, unsigned** — error 1011,
   "NoUnsignedValidator": the call requires a signed origin.

## Conclusion

Attempt 4 isolates the cause: fee validation for `eth_transact` reads a zero
balance for this account even though the funds are present, because the
account is **unmapped** — its balance lives in the revive fallback account.
Mapping (`mapAccount`) must be signed by that same fallback account, and
under this runtime's account derivation an Ethereum ECDSA key cannot produce
a Substrate signature for it. The chain's own EVM RPC fails on this account
identically (attempt 1), so as of 2026-11-05 a faucet-funded EVM account
cannot write to Portaldot V3 until the Portaldot team enables a mapping path
for it (an `eth_substrate_call` flow, or team-side mapping of funded
accounts). This looks like a platform onboarding gap, not an application
error, and this document is written so the team can reproduce it from the
evidence above.

## What happens the moment the gate opens

1. Deploy `FinalityAnchor` from the operator account
   (`instantiateWithCode`, bytecode in `contracts/FinalityAnchor.bytecode.txt`).
2. Call `anchor(...)` with the current ChainLens snapshot (the values served
   at `/api/metrics`).
3. Publish the contract address and anchor transaction hashes in the README
   and the DoraHacks submission, replacing this status note.

The observatory itself is unaffected: it never needed to write. Anchoring is
the proof layer on top of the measurements, and it ships the day the chain
lets our funded account sign.
