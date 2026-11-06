# Shared Walrus gate — offline implementation

Date: 6 November 2026.

## Goal and assumptions

Implement the approved shared-budget and typed-namespace proposal on the experimental agent, preserving the original release. The current native-model result proves only one local known-case continuation. This increment runs no inference and does not establish Mainnet storage or current sponsorship. Existing ceilings remain 2 Tatum batches, 2 total writes, 2 total content recalls, 64 guarded HTTP attempts and 8 polls per accepted job.

## Implementation and decisions

- app/agent-run.mjs provides an explicit empty-directory initializer, immutable run/identity/dataset/namespace binding, a durable ledger and a run-wide writer lease. Resuming never recreates a missing ledger. Write reservation is durable before the SDK writer creates its submission intent. Crashes retain consumed capacity. Unknown, expired, changed, stopped or unfinished runs cannot silently restart.
- app/agent-walrus-guard.mjs guards metadata, reads, submissions, polling and the exact Seal package-object lookup. It checks account/public key, typed namespace payloads, safe request bodies and route/time limits. The installed Sui SDK uses framed gRPC-Web Text; the guard decodes the exact bounded frame and permits only the configured package object. Status polling uses signed authentication without a Seal decrypt session, as the installed SDK does. Remember and recall require the SDK's Seal session.
- app/activity-memory.ts retains the existing writer and receipt journal. Optional physical namespace and submission/receipt hooks preserve default behaviour for all inherited callers. The logical project remains independent of its two physical namespaces. Journals are scoped per namespace; the run ledger and outer writer lease are shared.
- app/agent-provider.mjs assembles independent agent tools with injected stores. Address-root/correction and experience-parent checks run under the shared lease. Known completed receipts return without another request or reservation. Both types share the same two-write/two-read allowance. Incomplete/changed memory and critical tool failures stop durably.
- app/agent-provider-fixture.mjs is explicitly offline-only, uses a public synthetic seed and fabricated service/package responses, and never loads a real credential profile. It exercises the installed MemWal 0.1.9, Seal 1.5.1 and Sui 2.37.0 code including signing, session creation and protobuf parsing. It does not replace SDK internals or patch signedRequest.
- The existing user launcher remains local/offline. No live mode or real sponsorship attestation is accepted by the new manifest validator. Synthetic receipt metadata is labelled walrus-fixture and offline-sdk-fixture; transaction provenance remains replay or fixture.

Closing a client while the SDK is awaiting a response is a specific lifecycle hazard: restoring an unrestricted global fetch too early could let a later SDK continuation bypass the guard. Public SDK calls are tracked; closing stops the run, destroys the client and keeps the rejecting guard installed until those calls settle. A regression test verifies this without any external request. No private SDK dispatch patches are used.

## Verification and observations

Sixteen targeted tests cover real installed SDK/Seal execution with intercepted responses, both typed namespaces, scoped receipt proofs, mixed shared capacity, exact receipt reuse, independent process persistence, competing writer exclusion, crash after reservation, accepted-response loss, missing correction parent, incomplete/changed readback, revision-qualified cache reuse, stale/changed/symlinked state, account/delegate mismatch, forbidden routes, unreserved writes, actual eight-poll exhaustion and close-during-request isolation. The full suite passed: 98 tests (82 earlier regressions plus 16 new cases), inherited independent MCP checks, saved evidence recomputation and the source manifest.

An independent recorded offline sequence used two distinct MCP processes. The first made synthetic invalid/valid lookup calls; the observer stored a failure and a linked verified resolution through the real SDK. The second recovered both exact records, prepared a replay report and exported original CSV. Counters: 2 writes, 2 content reads, 32 guarded synthetic fetches, 0 Tatum batches. Actual model/Tatum/Walrus/provider calls: zero. Real credentials read: none. Additional spend: $0. Evidence is evidence/agent-walrus-gate-offline-2026-11-06/run.json; its verifier recomputes lineage, counters, provenance and CSV hashes offline.

Historical model evidence still names its frozen source revision. Its verifier now checks that historical Git revision when available rather than incorrectly requiring future product changes to have the old hashes. An archive without that revision explicitly reports that historical source bytes are unavailable; it does not claim a fresh native test. The old traces, frozen plans and negative outcomes were not rewritten.

## Limits and failure modes

All stored service replies, package-object replies and blob IDs in these checks are synthetic. No actual server authorization, encryption round trip, indexing latency, zero-price sponsorship or Mainnet receipt was tested. The new initializer accepts offline-synthetic admission only. A separately reviewed live admission and bounded live trial remain necessary.

The writer lease coordinates this run's cooperating processes. It is not a server-side compare-and-swap guarantee against unrelated external writers. A future live trial needs dedicated stable namespaces and an explicitly controlled writer. Local file checks prevent accidental resets/tampering paths; they are not a defense against the machine owner deliberately replacing all trusted state.

Two total writes permit at most an error/resolution pair or another chosen pair, not unlimited address rules plus technical memories. Extra reads or work stop explicitly at the existing cap. Large account-wide metadata inventories may consume the bounded request/page allowance; no completeness or unrestricted history is promised. Caches are process-local and revision-qualified; an independent process must actually retrieve its content.

## Sources

Approved proposal: docs/AGENT_WALRUS_GATE_PROPOSAL_2026-11-06.md and the user's explicit offline approval. Local source: app/agent-run.mjs, app/agent-walrus-guard.mjs, app/agent-provider.mjs, app/agent-provider-fixture.mjs, app/agent-provider.test.mjs, app/activity-memory.ts, app/agent-experience.ts, app/agent-session.ts, src/memory.ts. Installed SDK source: app/node_modules/@mysten-incubation/memwal/dist/memwal.js, @mysten/seal/dist/session-key.mjs and @mysten/sui/dist/grpc. No new web pricing or sponsorship claim is made.

## Open questions and next gate

Current account-specific sponsorship and the exact real-profile admission evidence remain unverified. Prepare that live boundary without enabling it implicitly. Next: specify a bounded real Walrus-only trial using saved Sui evidence, with explicit consent, fresh account checks, one shared persistent ledger and no new Tatum/model usage unless separately authorized. Broader model generalization and native Claude validation are separate work. The original release remains the fallback.
