# Verifier verdicts and optional capture admission

Date: 7 November 2026.

## Goal and initial assumptions

Fix the captured cause of the actual stopped continuation without another real model/provider call or write. That run successfully restored Walrus plaintext and fresh Tatum evidence, then optional failure capture reached its resolution-only guard and turned a valid failed hypothesis into a critical MCP tool error. Preserve its trace, consumed native reservation and zero-write ledger. This is an offline-only coordinator-approved API/capture-policy correction, not a new live allowance.

## Decision after adversarial review

Make capture scope explicit in `AgentSession` and decide admission with a pure function **before** `experience.write`, journal reuse or a new write reservation. For `linked-resolution-only`, an incorrect hypothesis returns normal `verdict:fail`, factual `observed`, `memory:null`, `captureScope:linked-resolution-only` and `captureSkipped:not-admitted-by-scope`. A correct linked resolution may still call the unchanged writer, which enforces the exact parent and current factual proof.

The strongest objection is that this could conceal storage failures as harmless skipped writes. The implementation does not catch writer/storage/provider exceptions. Only an unattempted write outside the explicit scope is skipped. Memory reads and all allowed writes still use the same integrity, uncertainty, time and budget stops. Default verified-experience capture still saves supported mismatches and linked corrections; explicit opt-out still performs no write. Stored payload schemas, canonical hashes, writer guard, operation caps and native stop policy are unchanged.

Rejected alternatives:

- Force the correct payer or alter the frozen task/policy/tool route: biases the model observation.
- Admit new failure writes: expands the finite grant and consumes the only permitted resolution slot.
- Return an old cached failure receipt: helps only an identical duplicate and misrepresents the scope for a different wrong hypothesis.
- Catch `CONTINUATION_*`, storage errors or uncertain writes after calling the writer: hides actual safety failures.

## Resulting behavior

| Case | Outcome |
| --- | --- |
| Same or different wrong claim, resolution-only scope | Normal failed verifier result with actual observed payer; capture explicitly skipped; no write intent, submission or stop. |
| Correct claim with the admitted unresolved parent | Normal pass; at most one linked resolution through the existing guarded writer. |
| No verifier or no resolution selected | Explicit partial/no-resolution outcome remains valid. No forced tool call. |
| Capture disabled | Verdict and facts remain available, memory stays null and result scope is disabled. |
| Default full capture | Existing supported mismatch/correction capture remains functional. |
| Allowed write HTTP failure or accepted-but-unknown outcome | Critical error/stop with the consumed reservation and uncertain journal intact. No success or skipped-write substitute. |
| Direct forbidden writer call, including an old cached failure | Existing guard still rejects before receipt reuse/submission. |

The tool description and result disclose the capture scope in general terms. They contain no specific payer, lesson or memory ID. The model's frozen second task, developer policy and route remain unchanged. Read-only annotations remain conservative because the verifier can conditionally save an admitted resolution.

## Offline verification and evidence

The expanded independent MCP/SDK walkthrough submits two fabricated wrong hypotheses (one matching the old hypothesis, one different), obtains ordinary failed verdicts without MCP errors, then submits a correct fabricated claim. It writes one linked synthetic resolution. A separate SDK process reads four exact payloads with the same ledger. Actual model choice is not simulated as a successful live outcome; protocol clients supply the test claims.

The shared synthetic ledger ends at **Tatum1 / write1 / content reads2 / service requests40**, below64, with unchanged original state bundles and no stop. The two rejected hypotheses add only bounded metadata checks; they do not acquire another Tatum response or submit a memory. Original happy-path36-request evidence remains a separate historical snapshot.

New checks cover normal same/different wrong hypotheses, optional linked correction through MCP, scope disclosure without specific hints, direct cached-failure writer rejection, critical HTTP503 and accepted-response-loss outcomes, and default/opt-out compatibility. Existing no-verifier fake-app-server completion, bootstrap slot consumption, read/write/request/poll ceilings and independent reader privileges remain covered.

Saved artifacts: `evidence/ordinary-continuation-offline-2026-11-07/capture-scope-run.json` and `evidence/verify-ordinary-continuation.mjs --capture-scope`. Historical actual stopped evidence and its source pin stay under `evidence/ordinary-continuation-live-2026-11-07`; it is not rewritten to resemble the fix.

## Sources

- `docs/ORDINARY_CONTINUATION_LIVE_RESULT_2026-11-07.md`, actual source3e03445 and sanitized tools/raw-response/counter evidence: observed cause and consumed allowance.
- Coordinator's explicit offline capture-scope correction approval; no subsequent real/native/key permission.
- `app/agent-session.ts`: pure capture admission and additive verifier result metadata.
- `app/agent-provider.mjs`: continuation scope/parent binding from the hash-bound context.
- `app/agent-mcp.mjs`: honest generic tool description.
- `app/agent-continuation.test.mjs`, `app/agent.test.mjs`, `app/check-agent-continuation.mjs`: independent protocol path and critical negative controls.
- Existing `agent-run`/continuation writer guard and shared limits are retained unchanged by this correction.

## Decisions and open questions

The coordinator chose pure pre-admission policy separation. The finished offline acceptance and local source pin are recorded after execution below. No record type, migration, UI, model or dependency was added. No actual profile/key/SDK account/model/provider access, new real grant, retry, publication or deployment occurs in these checks; additional spend$0.

The successful offline branch is not a new live pass or evidence of generalized model learning. Any later real evaluation requires a separate decision and must preserve the **latest** mGqXhs stopped ledger/native reservation as well as the earlier origins; a three-record content baseline is not permission to forget a zero-write failed run. Do not generate an immediate third live question or key destination automatically. The next roadmap choice, ten useful memories and judge packaging remain coordinator gates after review.

## Completed acceptance

One full `bash start.command --check` run after this fix passed **166/166 tests**, zero failures/skips, all independent protocol walkthroughs, saved historical/new evidence verifiers and source213. Log: `/private/tmp/recall-capture-scope-full-20261107.log`. The expanded synthetic snapshot passed its40-request verifier; the actual stopped trace independently passed historical-source and plaintext/Tatum proof checks. No new live preparation, capture destination, grant, model or provider call was made.
