# One fresh native conversation — offline implementation

Date: 7 November 2026.

## Goal and assumptions

Implement the coordinator-approved continuation proposal without another real login, model turn, provider call, memory write or deployment. The historical ordinary run remains stopped; its second native reservation is consumed. Its completed gas-payer observation is retained with the prior two records. The default launcher remains offline.

## Decisions and implementation

The distinct `ordinary-single-continuation` plan admits exactly the frozen Stage 3 second task and one fresh native process. It uses a three-record baseline from two original proof bundles. Their original manifests, ledgers, native budget, receipts and known stop are retained independently. Real admission requires exact equality to the enumerated candidate evidence; this is not permission to resume an arbitrary stopped run.

Admission checks all original state hashes and journal entries, rejects unknown stops, unfinished intents/jobs, unknown receipts and held runtime/native/ledger/journal leases. The new private workspace receives completed receipt proofs only. It neither rewrites the old ledgers nor constructs a successful aggregate ledger. Current source/task/baseline/context hashes are bound to the finite action-time grant.

The lower ceilings are enforced by the shared durable gate, not just written in a plan: **one Tatum attempt / one resolution write / two content reads / 64 guarded service requests / eight polls**. Native admission allows **one new user turn**, maximum12 tools and120 seconds. Existing pilot limits remain unchanged. Free validation conservatively still requires at least four included credits; actual Tatum consumption cannot exceed two. All SDK/Seal traffic shares the service-request ceiling. $0; no paid fallback, retry or renewed allowance.

Before the native MCP endpoint exposes tools, it reads and validates all three baseline payloads against their receipts. The same process reuses its SDK content cache for the model's report and verifier calls. The model receives the original task with general policy; there is no injected payer, failure ID, lesson text, first tool or forced verifier call.

The single permitted write is a `resolved` gas-payer record linked to the exact retained failure, after equality with the current fetched transaction evidence. This restriction applies before cached receipt reuse and again before submission. A new failure or address-rule write is denied. A model that produces a report without a resolution yields `COMPLETED_NO_RESOLUTION`, an explicit partial outcome.

After completed native work and a settled resolution, a separate SDK process may read four exact records and verify hashes/linkage. It uses the **same** run ledger and read/request counts, has no Tatum key reader, data channel, writer or native permission, and has a single-use marker. If an optional model refresh has already spent the second content read, independent readback stops under the unchanged cap. Pending writes, a stopped native turn, a critical ledger stop or an active process lease cannot be bypassed through the reader.

Temporary-key ownership/cleanup reuses the established identity-bound mechanism with a newly prepared empty private destination. No old capture ticket or spent grant is reused. Preparation creates no actual grant or key file and reads no profile content.

## Offline verification

The installed MemWal SDK, signing, Seal session flow, generated Sui/Tatum client and normalization are exercised with intercepted synthetic responses. One independent MCP process read the three-record baseline, fetched one fabricated transaction, saved one linked synthetic resolution, and closed. Another OS process independently read back four exact payloads. The shared ledger ended at **1 Tatum / 1 write / 2 content reads / 36 guarded service requests**, no stop. Original manifests/ledgers/native budget remained byte-identical. No actual model choice or Mainnet receipt is claimed.

Thirteen targeted tests passed after the implementation's negative cases and self-review. They cover union provenance/corruption, old pending journals/leases, fresh-process retrieval, wrong-claim rejection, lower Tatum/write/read/request/poll ceilings, reader privileges, stale grants, exact second-task native orchestration, no-write completion and consumed slots after failed bootstrap. A fake local app-server exercises the real native harness without an account or inference. Tests first caught a cached-old-failure receipt path and duplicate preflight in the test harness; the write-scope check now precedes receipt reuse and the harness runs preflight once.

One full `bash start.command --check` acceptance after the code changes passed **162/162 tests**, zero failures/skips, all independent protocol checks, historical/new evidence verifiers and source206. Log: `/private/tmp/recall-continuation-full-20261107.log`. The prior149 result remains historical. The final prepared command is recorded after the source freeze. No actual profile/key, model or provider operation occurs in the offline suite.

## Sources and alternatives

- Approved design: `docs/ORDINARY_CONTINUATION_PROPOSAL_2026-11-07.md` and coordinator's bounded offline decision.
- `app/agent-continuation-contract.mjs`, `app/agent-managed.mjs`, `app/agent-run.mjs`, `app/agent-managed-entry.mjs`: exact origins, finite admission, enforcement and reader lifecycle.
- `app/agent-continuation-fixture.mjs`, `app/agent-continuation.test.mjs`, `app/check-agent-continuation.mjs`: synthetic dependencies, negative checks and independent processes.
- `evidence/ordinary-continuation-offline-2026-11-07/run.json`, `evidence/verify-ordinary-continuation.mjs`: saved synthetic evidence and source binding.
- `docs/READONLY_METADATA_RESULT_2026-11-07.md`: separate actual current metadata readiness; `docs/ORDINARY_LIVE_RESULT_2026-11-07.md`: retained stopped outcome.

Rejected alternatives remain reset/resume, repeating the first hypothesis, copying plaintext into a prompt, and creating an unrelated empty namespace. Reusing the existing gate with a distinct pinned continuation kind keeps the old trial and default launcher contracts unchanged. No new framework, record type, UI, model or dependency was added.

## Open gate

Coordinator review of the completed offline acceptance, source freeze and exact command. A new native turn and temporary existing-key capture require the separate concrete human consent before any live execution. Current metadata diagnostic and older trial allowances remain consumed. Actual plaintext retrieval/model choice/resolution/readback for this continuation and later judge packaging are still open. Publication, deployment and additional spend: zero.


## Real-state preparation check and historical revision format

After the first162-test acceptance, offline preparation against the actual retained public bundles exposed an incorrect assumption: the old source pin is the valid abbreviated Git revision `b1072c8`, while the new origin validator initially expected40 characters. The candidate identities all matched. The check now accepts7–40 hexadecimal characters, consistent with the existing historical source verifier, while exact candidate bundle equality remains mandatory. Historical artifacts were not rewritten. A new regression validates those actual retained public bundles offline. This code correction requires a new integrated acceptance; the earlier162 result is historical.

Preparation against both original private nonsecret ledgers, journals and stopped native budget subsequently succeeded without opening a profile, key, SDK or model. Context size16,548 bytes remains within the existing32KiB private-file bound. The new workspace has zero native reservations, no grant and no key file. It contains only public receipt proofs and preparation metadata.

## Frozen launch preparation — not authorized or executed

Private workspace: `/private/tmp/recall-agent-continuation-ready-mGqXhs/workspace`.

Plan SHA-256: `6675c4bb909448e441ac6f86a9924af02579ebe5799924339296f1c489de1087`.
Context SHA-256: `97ccdfc410182257a31809de51211fc024e85b3045931743ea636863216e66e1`.
New, currently absent key destination: `/private/tmp/recall-agent-continuation-ready-mGqXhs/capture/tatum.key`.

The exact argument array is saved in the workspace's `prepared.json`; the coordinator is the sole future operator:

```sh
/Users/sirquickflip/.hermes/node/bin/node --disable-warning=ExperimentalWarning "/Users/sirquickflip/Documents/ChatGPT/Хакатоны/work/recall-agent/app/agent-managed-entry.mjs" --evaluate /private/tmp/recall-agent-continuation-ready-mGqXhs/workspace
```

**Do not execute yet.** Only after the separate concrete native/key-capture permission and coordinator's source/command review may the existing key be captured privately at this new owned destination and the finite grant be issued. The private `approval-template.json` has a null timestamp/account/balance/key hash; no real grant is created automatically. Recheck Free, included quota and sponsorship at action time, not from the old screenshot. This is the new one-turn allowance, not reuse of either the stopped trial or metadata diagnostic.

Final acceptance after the historical-revision fix: **163/163 tests passed**, zero failures/skips, all independent protocol, historical/new evidence and source206 checks. Log: `/private/tmp/recall-continuation-final-full-20261107.log`. The additional regression validates the actual public original bundles; the prior13 targeted/162 integrated results remain historical. The new actual-state preparation succeeded entirely offline, with grant/key absent and no native reservation.
