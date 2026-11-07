# Whole transaction observations — offline implementation

Date: 7 November 2026.

## Goal and assumptions

Implement the coordinator-approved first part of the remaining-path proposal: useful historical transaction observations in the existing typed experience store. No actual account/profile/key/login, grant, model/provider call, publication or deployment. Existing spent allowances remain closed; additional spend$0.

## Decision and approval

The master chat approved offline implementation on7 November under the user's delegated development authority. Chosen: seven whole transaction notes independent of an optional linked resolution, plus an ordinary own-account entry in the next increment. Existing-types-only requires observations we do not have; one-resolution-plus-six depends on model behavior. Fallback remains preserved. This is an audit notebook, not general model learning.

The approval specifically requires per-transaction reproducible provenance; semantic dedup independent of timestamps/raw response hashes; unchanged old schemas/parent matching; all payloads validated before a first write; historical observations separate from fresh reports; no fabricated participation, truncation or replacement; separate ordinary admission and unchanged historical limits. New budgets are offline sizing only, not a real grant.

## Implemented contract

`recall-transaction-fact/1` is a tagged variant alongside gas/tool observations, in the same store/namespace. It contains the entire existing normalized transaction, workspace/network/digest/source, observation time and provenance. Provenance hashes **canonical official protobuf JSON of the selected raw transaction**, not its batch, and identifies that hash scope explicitly. The normalizer hash covers the exact `activity.ts` module bytes. Raw provider/account responses are not returned to the model.

TatumData retains provenance only after successful complete normalization. A session with explicit fact-capture consent validates every whole payload, corpus capacity and semantic conflict before any write. No array is truncated. `prepare_report` is the ordinary capture/retrieval path; no prescribed first tool or task was added. The ordinary assembly can report selected transactions with no observed wallet involvement, returning explicit sender/payer/balance-change coverage flags. The inherited fallback ActivitySession retains its stricter participation check.

Semantic identity is workspace/network/digest. Repeated facts with the same normalizer and normalized transaction reuse the first payload/receipt even if time or raw transport hash differs. Conflicting facts under the same normalizer stop. Old-normalizer notes remain explicitly incompatible historical context and are neither overwritten nor counted as another transaction. Complete-row validation rejects semantic duplicate transaction notes; old gas/tool resolution links remain checked separately.

Reports return `historicalObservations` separately, marked historical with provenance, receipt, comparison and `replacesFreshData:false`. Fresh report data still comes from the data adapter. Facts-only consent skips technical writes before admission while preserving normal verifier outcomes. Capturing prepare_report is honestly annotated as potentially writing.

## Verification

Nine new targeted tests passed, including an installed protobuf binary decode with BigInt and nested bytes. Official ExecutedTransaction.toJson/fromJson provides the replayable proof; hashScope is protobuf-json-selected-transaction. A custom raw JSON canonicalizer was rejected after independent review reproduced a BigInt serialization failure. No global canonicalization or lossy integer conversion was introduced. Other checks: mixed old/new records and parent links; repeat read in an independent process; per-transaction hash independent of batch composition; oversized second payload before any write; semantic conflict stop; old-normalizer behavior; explicit opt-out and facts-only verifier behavior; absent-wallet disclosure; malformed facts and duplicate semantic identity. Existing agent/ordinary targeted regression:21/21 passed before the final annotation/validator tightening. Full integrated acceptance follows the ordinary activation increment; no live result is claimed here.

## Sources

- `docs/REMAINING_PATH_PROPOSAL_2026-11-07.md` and the master chat's explicit offline implementation approval.
- `app/agent-facts.ts`, `agent-experience.ts`, `agent-session.ts`, `tatum.ts` and ordinary/provider/MCP seams.
- Existing ActivityTransaction normalizer, complete reader, SDK store, journals and old tests.

## Decisions and open questions

No new store/framework/migration, provider route, model or global operation cap. The current seven references are still candidates; no new Mainnet note exists. Next: separate ordinary own-account activation, offline SDK/Seal seven-note trace, shared-counter restart and clean-package tests. Real pricing/sponsorship and native behavior require a later bounded live approval.
