# Private first-failure diagnostics — approved offline option A

Date: 7 November 2026.

## Goal and starting assumptions

Prevent startup failure evidence from being lost behind generic SDK/MCP wrapping. The real 4B attempt remains stopped with an unknown underlying cause, one completed generation and one new receipt. This increment follows the coordinator's approval of option A in ORDINARY_STARTUP_DIAGNOSTIC_PROPOSAL_2026-11-07.md. It authorizes offline implementation/checks only: no real profiles/keys, native inference, account/provider requests or deployment. The historical runtime and its spent grant are not reopened.

## Chosen implementation

`app/agent-diagnostic.mjs` writes at most one private `agent-first-failure.json` in the admitted run directory. Its closed schema contains manifest/context hashes, diagnostic timestamp, fixed phase/route/method/category enums, an allowlisted local Fault code, actual numeric HTTP status when observed, and request count. Manifest/context bind the diagnostic to its existing source plan; no new source-index/logging service is introduced.

The helper never copies URLs, query values, headers, request/response bodies, memory, SDK/provider messages, keys or arbitrary exception codes. Routes become safe enums only after the existing route/body checks pass; rejected routes remain `unknown`. A plain SDK Error that resembles a local code is still not a local Fault. Missing/non-HTTP status remains null rather than guessed from an exception.

Admission, provider request/response validation, outer SDK startup and close rejection call the helper before the existing stop/rethrow path. Existing ledger schema, admission/route/identity checks, limits, public tool errors and idle/busy-close semantics are unchanged. File creation uses mode 0600, exclusive creation and no symlink following. Existing/partially written artifacts are not overwritten. An in-process attempted marker prevents a later cleanup failure from replacing a failed first write. Diagnostic I/O failure is caught only by the helper; the original failure still stops/rejects through the original path.

A process crash/disk failure can leave an absent or incomplete diagnostic. This is never a reason to resume or infer success: ledger/journal stops remain authoritative. This is bounded evidence capture, not a promise to log every failure before a gate exists.

## Adversarial review and alternatives

A broad raw logger was rejected because provider strings can contain secrets and arbitrary content. Changing the ledger schema was rejected because a separate diagnostic does not need to invalidate historical budget contracts. Retrying initialization to obtain an error message was rejected because the live allowance is consumed. Extending public error text was rejected: detailed diagnostics belong in the private run directory.

The main limitation remains: better reporting cannot recover the discarded cause of the real 4B failure or fix it. Option B (public read-only metadata or a separately admitted signed initialization) is a different experiment; no such request is executed by these checks. The original proposal documents the distinction between anonymous public compatibility and signed account/Seal initialization.

## Observed offline results

Eight targeted cases passed:

1. Pre-transport admission failure preserves its exact safe local code with zero transport calls/counter increment.
2. HTTP non-OK, health contract and deployment contract failures retain different local codes and only actually observed HTTP status.
3. Secret canaries in headers, query, body, arbitrary error messages/unknown codes and lookalike codes are absent from artifacts.
4. Duplicate and failed diagnostic writes preserve the first bytes/original rejection and stop; a later cleanup error does not replace the first attempt.
5. Late-close rejection adds no network request and preserves existing idle-close behavior.
6. Startup transport rejection survives outer SDK cleanup without raw exception text.
7. Two separate MCP/SDK processes: first completes an intercepted remember; second fails on a controlled health 503 and records the first cause.
8. Busy close keeps its original lifecycle stop/artifact after the pending SDK call later rejects.

The saved independent-process walkthrough is `evidence/ordinary-diagnostic-offline-2026-11-07/run.json`. Before the second startup, its shared ledger has one completed synthetic write and 25 service requests. The controlled failure adds exactly one request; diagnostic: startup / health / GET / HTTP 503 / `AGENT_PROVIDER_HTTP`, count 26. The write intent remains done and identical; old ledger schema/keys and limits remain unchanged. No real service, model or credential was used. These fabricated responses do not establish the historical real error's HTTP status or cause.

The full integrated `bash start.command --check` passed once after this change: **139/139 tests, zero failures/skips**, all independent MCP walkthroughs, saved evidence verifiers and source checks (183 files). Log: /private/tmp/recall-diagnostic-full-20261107.log. The earlier 131-test acceptance remains historical.

Product/source revision: `fdd7fcf0949070b498c2c43ec5b28c82d8be69e2`, local only. The saved offline diagnostic evidence is pinned to that historical Git revision; the original real attempt remains pinned separately to e1ffa21.

## Historical inference, not a captured route event

Local inspection of the frozen SDK shows synchronous `MemWal.create` and local `getPublicKeyHex`; in frozen `openInjectedAgent`, the first subsequent fetch is `/health`, with compatibility/config afterwards. Combined with the real counter changing 28→29 at second startup, this narrows the failure location to that health request/guard/transport. It does **not** recover the missing response status, body, validation cause or network error. The real outcome artifact remains unchanged and does not retroactively assert a captured route.

## Sources and decisions

- Approved option A, coordinator acceptance and direct user's instruction to investigate and continue without resetting live allowances.
- `app/agent-diagnostic.mjs`, `app/agent-run.mjs`, `app/agent-walrus-guard.mjs`, `app/agent-provider.mjs`, `app/agent-diagnostic.test.mjs`, `app/check-agent-diagnostic.mjs`.
- Saved stopped real evidence and frozen SDK/source e1ffa21; installed MemWal constructor/public-key/compatibility implementation inspected locally.
- New intercepted walkthrough and `evidence/verify-ordinary-diagnostic.mjs`.

Decision: implement minimal private instrumentation only. Do not describe it as an underlying-cause fix or use it to reopen the old grant. No new memory schema, model, UI, wave framework or public release.

## Open questions and next gate

The master performed exactly one separately bounded anonymous `/health` request at 08:10:34.292476 UTC: HTTP 200, status `ok`, writes `ok`, write_ready true, 950 response bytes. Only allowlisted fields/hash were retained in the external workspace document `docs/TOTAL_RECALL_PUBLIC_HEALTH_2026-11-07.json`. This agent did not duplicate it. A persistent mismatch of those health fields is not observed now; historical transport/HTTP/JSON/health-validation branches remain indistinguishable. This is not signed account or Seal proof.

One useful next diagnostic proposal, **not approved or implemented here**: a single fresh-process, read-only SDK/MCP initialization with the existing delegate in place, public identity/deployment pinning and one signed metadata inventory of the existing experience namespace. At most eight total relayer requests, no retry/redirect, fixed public health/version/config and signed stats/inventory routes only. No model, Tatum/key, memory-content recall, write, Seal external request, namespace change, payment or live application task. Deny remember/recall and every other route before transport. A separate finite diagnostic authorization and durable counter must be prepared offline; the spent application grant is never reused. Protect first-failure evidence with this implemented helper.

Why this differs from another public-health check: it tests the actual Node SDK, stdio initialization and signed account binding after the newly retained record, without a second full model/write trial. Failure identifies a currently reproducible initialization category; success only shows current initialization readiness, not the past cause, model recovery or new-record plaintext readback. The cost is a separate exact credential/access approval and small diagnostic adapter; if that cannot stay narrow, keep the stopped evidence/fallback rather than build another launch platform. Master decides the next gate; do not run a full native trial as the first reaction.
