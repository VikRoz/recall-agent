# Single fresh-conversation continuation — proposal, not live admission

Date: 7 November 2026.

## Goal and assumptions

Complete stage 4B's missing observation: a genuinely fresh model conversation reads the already stored Tatum gas-payer observation and may create one linked resolution after a successful factual verification. The original first task ran and saved its observation. Its second native reservation burned at startup, so neither that slot nor the stopped application allowance may be reused.

Current evidence shows three completed receipts with matching current metadata. It does not show plaintext readback of the third record. The existing Tatum key file is absent. No model, Tatum, Walrus, profile or key operation is authorized by this document.

## Proposed design and adversarial review

Use a **new finite continuation allowance** and one fresh native process. Retain the same candidate account, owner, delegate, package, workspace and namespaces. Construct a baseline as the union of two original receipt bundles; preserve each manifest, ledger, source revision, record, receipt and stop reason. Require every selected write to have a hash-bound done intent/job/receipt and all original run files to remain unchanged.

The strongest counterargument: accepting records from a stopped run could hide an uncertain write or reset an exhausted budget. Therefore the new admission must accept only the explicitly enumerated completed operations, reject *any* unsettled intent/job or held/incomplete lease, and pin the stopped reason plus native budget separately. It must never set the old ledger's stop to null, synthesize a successful aggregate ledger, overwrite an old receipt, remove a spent reservation or automatically issue another allowance. Metadata presence alone is insufficient. A fresh content read must validate the three payload hashes against those receipts before model use.

This is an admission-contract change. The current `checkBaseline` deliberately requires one wholly successful old ledger and cannot admit this two-source union. The current runner also requires two tasks. **Do not run it unchanged or patch its private context to bypass those checks.** Implement a distinct one-task continuation kind after coordinator review, reusing existing provider/native/gate code. The default ordinary product launcher and original two-task evidence remain unchanged.

Alternatives rejected:

- Resume/reset the stopped run: destroys budget and failure provenance.
- Repeat both original tasks: needlessly repeats the hypothesis and adds calls/writes; does not isolate the missing observation.
- Start an unrelated empty workspace/account: loses continuity with the stored observation and evades the relevant readback test.
- Copy plaintext into the new model prompt: does not demonstrate Walrus retrieval and adds a lesson hint.
- Do nothing: safe fallback if this finite continuation cannot be implemented and verified before the internal deadline.

## Frozen model input

Model: `gpt-5.6-luna`, own included ChatGPT usage, exactly one new native user turn and one fresh conversation. The task is byte-for-byte the Stage 3 second task, without an added payer, lesson, memory ID or tool sequence:

> Prepare a concise expense report for wallet 0x77776760c06997206b13fa76f127aa016d24a645f04fce516be153ece0bddf23 using Sui Mainnet transaction 2GrJYm3r55QKF36pSMBhuZiYTtqXzRaNPbgS7XGsMAKQ. Who paid gas, what changed for the wallet, and what cannot be inferred from this transaction?

The model retains the general operating policy and optional independent tools. It chooses what to call. The runner must not force `verify_gas_payer`, manufacture a new mismatch or insert the previous conversation. A correct report without a new resolution is an accepted partial/negative observation, not grounds for a retry.

## Exact proposed envelope

| Operation | Ceiling and admission |
| --- | --- |
| Native generation | One user turn, one new native process/conversation; reserve durably before bootstrap, never refund after failure. Maximum 12 tool calls and 120 seconds for the turn. |
| Tatum | One attempt for the frozen selected transaction; two included credits maximum. Action-time Free/account-key binding and displayed balance at least two included credits, proof no older than five minutes. No other digest, discovery, batch, redirect or retry. |
| Walrus content recall | At most two: initial complete read of the baseline and final independent readback if a resolution was saved. Cache reuse must not masquerade as independent readback. |
| Walrus write | At most one, only `resolved` with `supersedes` equal to the existing Tatum failure ID and only after successful `verify_gas_payer` on the fresh actual Tatum response. New failures, address rules and unrelated resolutions are outside this grant. |
| Guarded service requests | At most 64 across admission, startup, signed inventories, recall, allowed Seal transport, write/status and final verification. At most eight bounded job polls. Counts are shared across processes. |
| Cost | $0; only included model usage, included Tatum credits and the official sponsored Walrus relayer. No payment, upgrade, paid fallback or automatic retry. |

Lowering Tatum admission from the original two-attempt/four-credit envelope to one attempt/two credits must be explicit in the new continuation kind. Do not change the old pilot limits globally. Implementation may conservatively require four available credits while still consuming at most two, if preserving the established Free validator is simpler; this decision must be frozen before live approval.

Bound SDK requests separately from Tatum calls; every external request must have one applicable counter, including Seal RPC. Stop on quota/access/timeout/unknown error, extra/missing/corrupt memory, changed source/identity/config, uncertain write, or request/time exhaustion. Stop does not authorize restart. A pending/unknown write consumes the single write reservation; no replacement submission.

## Concrete offline reachability and required acceptance

Existing code already has the factual path: `AgentSession.view` restores only matching network/source/digest/observed-payer experience; `verifyGasPayer` can write a resolution linked to an unresolved parent after equality with fresh transaction evidence. `WalrusRecordStore` validates read payload hashes against the receipt journal, and caches within one process while inventory remains unchanged. A new process invalidates the cache. The Stage 3 independent-process fixture demonstrated this core path; it did not demonstrate the new admission envelope.

Before any real launch, demonstrate **the new envelope**, not just the old two-task fixture:

1. Build a three-record synthetic baseline across two original ledgers, one stopped *after* its only done write; validate the receipt union without rewriting either ledger. Reject unrecognized stops, unsettled/sent-only intents, missing jobs, changed hashes, conflicting identities, duplicate IDs and held leases.
2. Run one independent stdio client using the installed SDK/Seal and intercepted transport. Restore all three payloads, fetch one selected synthetic Tatum response, expose the applicable observation, verify the correct payer and save at most one linked synthetic resolution. A separate reader verifies four exact records and linkage. Keep both old ledgers/native budgets byte-identical.
3. Prove the optional branch: correct report with no verifier means zero writes; incorrect verifier cannot submit a new failure under this grant. Repeating a completed resolution cannot spend another write. Corrupt/missing plaintext stops before inference or writes.
4. Drive the native runner with a fake app-server. Assert one process and one task equal to the frozen second text; failed startup consumes the reservation; no first task, retry or hidden transcript. Test a second Tatum attempt, second write, third content read, ninth poll, 65th service request and stale grant all fail closed.
5. Exercise final readback in a separate SDK process using the same shared durable allowance, including the two-content-read and 64-request ceilings. Readback verification must not instantiate a new ledger or silently receive a new budget.
6. Run the integrated offline suite and self-review the final diff/source freeze. No actual key/profile/model/provider access in these checks.

## Live procedure after separate approval

The coordinator alone operates the one-shot command. Obtain explicit action-time permission for the new native turn and temporary existing-key capture; recheck current Free balance/account binding and Walrus sponsorship. Use the Walrus profile in place. Create a private fresh key capture with the established hidden-input mechanism, mode0600 and exact ownership cleanup. Do not reuse or recreate the deleted old file under its spent grant.

Preflight actual identity/deployment/sponsorship and exact metadata baseline within the new shared request budget; close SDK cleanly. Reserve the one native slot, launch the genuinely fresh chat and record any result. If a resolution completes, read it back independently within the same allowance, then stop. Delete only the exact owned temporary key on success, failure or signals. Publish no raw profile, headers, signatures, credentials or unrelated memory. Retain sanitized result, payload/receipt linkage, original factual response, counters, source/task hashes and negative outcome.

## Sources, decisions and open questions

Sources: `docs/READONLY_METADATA_RESULT_2026-11-07.md`; unchanged ordinary/earlier live evidence; `evidence/candidate-evaluation-2026-11-07/plan.json`; `app/agent-managed.mjs`, `app/agent-run.mjs`, `app/agent-session.ts`, `app/agent-provider.mjs`, `app/activity-memory.ts`, `src/memory.ts`; Stage 3 offline independent-process evidence.

Decision requested from coordinator: distinct one-turn admission, provenance-preserving three-record union, resolution-only single-write scope and the finite limits above. This proposal does not approve itself or claim the new runner exists. Open: coordinator choice, offline implementation/acceptance, current account proof/consent, actual model choice, new-record plaintext readback, optional resolution and later clean judge packaging. Do not broaden to historical activity-record counting or new product features in this increment.
