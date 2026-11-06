# Shared admission and budget for agent memory

Date: 6 November 2026. Status: the user approved this offline implementation; implemented and checked in AGENT_WALRUS_GATE_OFFLINE_2026-11-06.md. No live use is authorized by this increment.

## Goal

Prepare the current free-task agent for Walrus persistence of verified technical observations while preserving the existing 2/2/2 ceilings across fresh conversations and separate processes. This increment is offline implementation and intercepted-transport verification only. It must not enable a live launcher, run a model, read credentials, call providers or modify the fallback release.

## Starting assumptions

Baseline: private development repository at 017f899. The observed local error/capture/fresh-chat/resolution cycle is recorded. The old release remains available at c884ad8. Twelve experimental native user turns have already been consumed; none is authorized by this development increment.

The existing ActivityBudget persists 2 Tatum batches, 2 writes, 2 content reads, 64 guarded HTTP attempts and 8 polls per accepted job. The old live plan binds exactly two transaction digests and one address-rule namespace. The new agent has independent tools and a persistent logical workspace; these are not a two-chat route.

## Inspection findings and offline diagnosis

1. The old walrusFetchGuard validates every remember body with the address-rule decoder. An injected valid numeric technical-experience record was rejected with INVALID_KEYS before transport. External calls: zero. Reusing that guard unchanged cannot enable experience writes.
2. WalrusExperienceStore's admission callback currently protects write only. An injected read completed with zero admission callbacks, two inventory calls and one content recall. This is an unwired transport seam, not an exposed live bypass: the current launcher uses local storage only. Its live factory must provide a guard for every SDK request, including catalog-time reads.
3. Rule and experience decoders cannot consume each other's records. WalrusRecordStore currently uses binding.project as both the logical record scope and physical namespace. Those concepts need explicit separation for two typed namespaces in one stable user/project workspace.
4. A shared unfiltered receipt journal would require each typed reader to find the other namespace's receipts and fail with missing-record errors. Receipt lookup must be namespace-scoped, while the run budget and outer writer lock are shared.
5. Catalog loading, report views and write-time parent checks all read memory. Two independently metered adapters or an unrestricted reread per tool would violate the intended total-read ceiling. Existing revision-qualified per-port content caching can be reused; stale or incomplete data must not be substituted to avoid a limit.
6. Health write_ready and a historical managed-account flag do not establish current account-specific zero-price sponsorship. Offline checks can verify rejection paths but cannot prove current live sponsorship.

The diagnostic used current code with injected in-memory SDK responses and an intercepted fetch; it did not load a real profile or issue any network request. Details are retained in evidence/agent-walrus-gate-preparation-2026-11-06/diagnosis.json.

## Chosen bounded implementation

- Introduce one immutable agent-run manifest and one durable ledger shared by all typed memory stores and processes. Bind owner/account, logical workspace, dataset provenance, exact physical namespaces, approval evidence identity, expiry and maxUSD=0. Continue the same run with the same counters; never initialize a missing ledger while resuming. Keep old run formats and exhausted budgets unchanged.
- Use separate exact namespaces for rules and experience under the same owner/account. Namespace is organizational scope, not account authorization. Add an optional physical namespace to the existing generic SDK store, with its present binding.project default preserved for all old callers. Record validators continue to check the logical workspace independently.
- Keep one existing SDK writer implementation. Add a run-level write gate encompassing duplicate/parent checks, admission, reservation and submission; use namespace-scoped receipt journals underneath it. Reject exhausted or unapproved work before creating a submission intent. Reserve each external attempt exactly once, retain spent reservations after a crash, and stop on uncertain submission without resending. No independent budgets per schema or namespace.
- Guard every permitted SDK HTTP route and identity header, including initialization, inventory, content recall, submission and job polling. Typed write allowlists accept only the registered decoder for the exact namespace. Unknown routes, redirects, account mismatches, raw delegate headers and unreserved writes fail before transport. Preserve request, poll, payload and timeout ceilings.
- Share the total 2 writes / 2 content reads across address context, gas-claim experience and numeric technical experience. Reuse complete revision-qualified content within a process; no hidden extra recalls or unsafe partial-history fallback. Cache invalidation after a write is required. If a task needs more than the allowance, return an explicit limit stop; do not enlarge the cap or silently disable capture.
- Wire an injected-provider agent factory for offline end-to-end tests, using the existing saved or synthetic transaction adapter with truthful provenance. Keep the user launcher offline; the first future live slice can use saved transaction evidence with real Walrus memory, so it need not spend Tatum credits. A future Tatum path still shares the same overall ceiling of 2 batches; no discovery provider is added here.
- Preserve opt-in automatic technical capture, independent tools, current verification, exact exports and fresh-conversation recovery. Do not add a mandatory first task or tool sequence.

## Alternatives and adversarial review

Changing only the decoder in the legacy guard leaves fixed-plan assumptions, scope confusion and independent metering unresolved. Putting all schemas into one namespace requires changing every old complete-corpus decoder and risks hiding corrections while filtering; rejected for this increment. Giving each store its own 2/2 budget multiplies authorized operations and is rejected. A second SDK writer duplicates uncertain-write and receipt logic; reuse the existing writer instead. Doing nothing is safe but leaves the demonstrated mechanism local.

The chosen change introduces a new admission contract and modest shared-store plumbing. Its critical risks are double-reservation, namespace/receipt mismatch, concurrent parent-check races, incomplete snapshot reuse and accidental activation of live ports. Offline failure tests below are acceptance gates. If they cannot pass without increasing limits or changing the independent-task contract, stop and present the conflict rather than adding a hidden workaround.

## Required offline checks

1. Exercise the real installed MemWal SDK behind a deny-by-default intercepted transport; use only synthetic credentials and responses. Verify both typed namespace payloads and no unexpected route escape.
2. Independent processes reopen the same run, use both store types, and hit one shared write/read/request/poll limit. A new chat cannot create a new namespace, ledger or approval. Missing, changed, stopped or exhausted run state is rejected.
3. Concurrent writers cannot bypass the cap, race a correction parent or charge the same known receipt twice. A crash after reservation retains consumption; an accepted/unknown write cannot be resubmitted. Receipt proofs remain scoped to the correct namespace/account/workspace.
4. Reject wrong account/delegate, changed manifest, expired admission, unsupported sponsorship evidence, invalid record category, mismatched source/schema and arbitrary endpoints before transport. No key lookup occurs in offline tests.
5. Run automatic error capture and a verified resolution through the injected provider assembly; start a new MCP process and verify exact IDs, content hashes, schema applicability and lineage. Synthetic failures prove wiring only, never model improvement or Mainnet storage.
6. Check empty inventory, correction completeness, revision changes, cache reuse/invalidation and content-read exhaustion. No synthetic path may claim fresh blockchain data or real Walrus receipts.
7. Run the full existing 82-test/evidence suite plus the new targeted cases; inspect the diff, source manifest and fallback status.

## Decisions, limits and approval boundary

This file retains the reviewed proposal. The user subsequently explicitly approved the offline implementation with unchanged 2/2/2 limits. Implementation and validation are recorded separately. New provider/model calls, real credentials, live sponsorship verification, Mainnet writes, deployment and higher limits remain excluded.

## Sources

Inspected local code: app/activity-live.ts (ActivityBudget, walrusFetchGuard, openLiveActivity); app/activity-memory.ts (WalrusRecordStore, FileWriteJournal); app/agent-experience.ts; app/agent-session.ts; app/agent-mcp.mjs; app/agent-tool-observer.mjs; app/walrus.mjs; src/memory.ts; app/activity-live.test.ts; app/agent-observer.test.mjs. Existing requirements: AGENTS.md, PROJECT_STATE.md, ROADMAP.md and docs/AGENT_PLAN.md. No external documentation or current pricing claims were used; this is a local implementation review.

## Open questions

Current account-specific Walrus sponsorship must be checked only in a separately authorized live preflight. Any SDK route not covered by the installed SDK's offline trace is an explicit stop until inspected, not an automatic allowlist expansion. The two-write ceiling permits at most an error/resolution pair or another chosen pair of records in one run; richer mixed tasks will stop at the same ceiling. Real wallet-history discovery, native Claude evaluation, generalization and judge packaging remain later stages.
