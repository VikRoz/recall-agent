# Actual fresh conversation: memory retrieval succeeded, capture scope stopped the turn

Date: 7 November 2026.

## Goal and assumptions

The coordinator operated exactly one separately authorized continuation with the frozen Stage 3 second task, own included ChatGPT quota, one Tatum attempt, at most one linked-resolution write, two content reads and $0. Original stopped runs and consumed native reservations remain unchanged. Source: `3e034456909d4ecff0edaff7f432cfa22759834e`; plan6675c4bb / context97ccdfc4.

## Actual observations

The one command started09:39:20.606Z and ended09:39:51.182Z with exit1. Native model `gpt-5.6-luna` started one user turn, stopped with `TOOL_ERROR`, and consumed its one reservation. Final durable counters: **Tatum1 / writes0 / content reads1 / guarded service requests23**, stopped `AGENT_WRITE_STOPPED`, no write intents/jobs. The exact owned temporary key was deleted; retries0, additional spend$0. The Free/account/key observation was09:35:56Z with99,970 included credits; proof had not expired at stop.

The new native conversation completed `prepare_report`. It fetched an actual Tatum response and returned the previously stored gas-payer failure from real Walrus with blob `YJ1F4vBD8iCTpPO7x1BukyKeFv0TlYfsXb7at2coK94`. Its plaintext, operation ID and payload hash match the original completed receipt from the prior run. The frozen native startup also requires validation of all three baseline payloads before exposing tools. The saved report directly exposes the single applicable gas observation. This now proves fresh native plaintext retrieval of that new record; it does not complete the model report or resolution.

The second model-selected call was `verify_gas_payer`, proposing the wallet sender as a candidate payer. Actual evidence identifies another payer. A verifier call can test a hypothesis; it is not proof that the model believed the hypothesis or spontaneously hallucinated a fact.

## Concrete current cause

`verifyGasPayer` tried optional automatic capture for the failed hypothesis. The resolution-only scope correctly rejected a new failure before reservation/submission, returning `CONTINUATION_RESOLUTION_ONLY`. That storage-policy rejection propagated as a critical MCP tool error instead of returning the valid semantic verdict `fail` with the actual observed payer. The business verifier and optional capture policy are coupled incorrectly for this finite scope.

Current SDK initialization, signed account access, content retrieval and Tatum succeeded. This failure is neither MCP bootstrap nor health availability nor expired proof. The older ordinary trial's historical initialization cause remains unknown.

## Evidence and checks

- `evidence/ordinary-continuation-live-2026-11-07/{run,tools,tatum-response}.json`: sanitized completed/failed tool events, actual original Tatum bytes, native/counter/cleanup facts and source hashes. No credential/header/backend transcript is published.
- `evidence/verify-continuation-live.mjs`: offline comparison to the prior payload/receipt, recomputed Tatum facts/report, frozen second task, spent reservation and historical Git bytes.
- Private originals remain in the mGqXhs workspace: native events/summary, raw response, current stopped ledger, launch/cleanup metadata. The original trace is not edited.
- Both original baseline manifest/ledger/native bundles were compared again and remain unchanged. No new receipt was produced; candidate count remains3. No final independent reader ran because there was no completed resolution.

## Adversarial review and decision

The coordinator approved an **offline-only fix**: explicitly model `linked-resolution-only` capture scope in the session and decide whether capture is admitted *before* calling the experience writer. A failed hypothesis must remain a normal verifier result with `memory:null` and an explicit `captureSkipped:not-admitted-by-scope`; the model may then continue using actual facts. The existing resolution writer guard remains strict, before receipt reuse and before submit. Fail writes stay prohibited.

Rejected: forcing a correct next call or tuning the frozen user task; permitting new failure writes; returning only the old cached failure receipt; catching arbitrary storage/continuation errors after write. Those either bias the observation, widen the grant or hide real integrity/uncertainty failures. Provider, integrity, unknown-write and cap errors remain critical. Default full capture and opt-out behavior must remain compatible.

## Sources and open gate

Sources: the actual artifacts above; `docs/ORDINARY_CONTINUATION_OFFLINE_2026-11-07.md`; frozen `app/agent-session.ts`, `app/agent-provider.mjs`, `app/agent-continuation-contract.mjs`; coordinator's explicit human approval and actual command result. No new source lookup/API occurred during this fixation.

Open: implement and verify the approved offline capture-scope separation, then freeze/review the integrated revision. There is **no new real/native/key allowance**, no resume/refund of this consumed run, and no automatic immediate third live request. Whole-task completion, linked resolution, final reader and judge packaging remain open. No push, publication or deployment.

Subsequent offline correction completed: [capture-scope separation](CAPTURE_SCOPE_OFFLINE_2026-11-07.md), integrated166/166 acceptance. This adds no new actual model/provider outcome and does not change the stopped trace or its consumed allowance.
