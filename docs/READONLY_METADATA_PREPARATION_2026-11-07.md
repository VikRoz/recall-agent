# Single-use metadata-only SDK/stdio diagnostic — offline preparation

Date: 7 November 2026.

## Goal and starting assumptions

Prepare the coordinator-approved narrow diagnostic after the stopped second client. It checks SDK initialization and signed metadata through stdio without another model/Tatum/write trial. The old application allowance remains spent; this is a separate diagnostic, not application recovery, judge readiness or evidence of the historical cause. Current public health was already checked once by the master and is not repeated during preparation.

Authorization at this stage is **offline implementation and checks only**. No real profile/key, network or account access is granted by this document. The subsequent exact read-only decision belongs to the coordinator under the user's instruction to investigate and continue. A new secret transfer, permission expansion or cost would require the human.

## Chosen boundary and alternatives

Use one small fixed-purpose SDK/stdio diagnostic, reusing the installed SDK/MCP libraries and private first-failure helper. Anonymous public checks alone cannot test signed account metadata; repeating a full native trial would consume quota and writes before initialization is understood. A generic launcher, new agent platform or retry framework is unnecessary and rejected.

`app/agent-metadata-diagnostic.mjs` provides exclusive preparation/grant/counter admission, guarded SDK initialization and a diagnostic server returning only its cached result. `app/agent-metadata-prepare.mjs` derives public identity/config and three expected blob IDs from completed evidence. The separate fixture entry has no real credential loader or network fallback. This server is **not the live product server**; its stdio success is labelled as diagnostic only.

## Exact allowed work and limits

One finite execution, maximum **8 total relayer attempts**. Each route may run at most once; the normal path takes five requests:

1. `GET /health`, validating the same write-health contract used by the frozen product.
2. Installed SDK compatibility via `GET /version`.
3. `GET /config`, pinned to the known Mainnet deployment metadata.
4. Signed `POST /api/stats` with only the selected experience namespace.
5. Signed `GET /v1/owners/<expected-owner>/memories?limit=100`, exactly one page.

Only `https://relayer.memory.walrus.xyz` is allowed. Recall, remember, job polling, Seal/Sui RPC, Tatum, other origins, credentials in URL, redirects, duplicate routes, cursors and extra query fields are denied before a further transport request. Header names are a closed list; raw delegate keys, Seal sessions, Authorization, cookies and API-key headers are rejected before transport. No model, Tatum/key, content recall, write, payment or new delegate. Additional spend $0. Per-request timeout 15 seconds, overall SDK diagnostic 120 seconds, response buffer at most 64 KiB, no retry or pagination loop. Compatibility fallback cannot create a duplicate health request or bypass the guard.

The SDK transiently receives metadata but persistence/output contains only validated blob IDs from the selected namespace, revision, expected metadata-ID presence, fixed diagnostic-status/zero-operation fields and binding/counter hashes. No raw body, other-namespace identifiers, user prose, content, headers or arbitrary exception text is saved. Metadata row status is validated only as a nonempty string bounded by the existing64KiB response ceiling, following installed MemorySummary.status:string and the established inventory shape. No closed stored/active enum is assumed. Its value is not persisted or interpreted: output says allExpectedMetadataIdsPresent and metadataStatusInterpretation:not-evaluated. Presence proves neither active storage nor content readability; completed storage is supported separately by done receipts. The diagnostic does not verify plaintext memory or infer relevance from blob count alone.

## Admission and lifecycle

A private empty directory gets a public-only context, zero counter and unusable approval template. Real and synthetic context/grant kinds are separate; missing/wrong/stale/source-changed grants fail before real profile/factory access. The context binds source hashes, identity, deployment, selected namespace, expected IDs and limits. The actual fixed profile is read in place only after a later valid grant; its public owner/account/delegate/package must match before SDK construction, and the derived SDK public key must match before network access.

Parent launch and worker use each create an O_EXCL marker. Requests reserve the independent durable counter before transport. Unknown, failed or abandoned executions cannot be reset/reopened by another invocation; an existing launch/use blocks it. Old 4B grant, ledger and namespace content are untouched. A grant's observed issue time has a five-minute limit and is never refreshed automatically.

The SDK is destroyed after success/stop, including handled signals; no key copy is created and no profile/key file is deleted. Only the cached diagnostic result is served after SDK closure. A separate parent result records actual stdio initialization/tool completion; SDK completion alone is not a stdio pass. Failures reuse the private allowlisted first-failure helper. The runtime cannot retry to turn its diagnostic status into success.

## Offline checks and evidence

Ten targeted cases passed using synthetic profiles and fully intercepted SDK replies: five-request success and selected-only persistence; missing/stale/wrong grants/source rejection before readers/factories; wrong identity and test-to-real rejection; denied routes/namespaces/headers/query; durable cap and abandoned-use rejection across processes; actual stdio handshake with cached result; pagination/invalid metadata/oversized body/redirect stop; cancellation/SDK destruction; and required stdio startup failure after a controlled health503 with one-use preservation. An additional regression accepts an unknown future status without interpreting/persisting it, while empty/nonstring statuses and malformed IDs still stop. Public diagnostic error output accepts only fixed local Fault codes, not arbitrary SDK `.code` strings.

Saved `evidence/readonly-metadata-offline-2026-11-07/run.json` records an actual independent stdio worker for each synthetic case: success uses 5 guarded requests with three selected synthetic IDs, controlled failure uses 1 request and stops before handshake. Both SDKs are destroyed. Application ledger bytes remain unchanged. Actual models/profiles/providers: zero. `spec.json` is the public-only scope/identity/limits/source freeze, not a live grant. Full `bash start.command --check` completed once after this change: **148/148 tests, zero failures/skips**, all independent protocol/evidence/source checks (192 source files). Log: /private/tmp/recall-metadata-full-20261107.log. The preceding139-test result is historical. The later status-shape correction passed ten targeted cases and one full149/149 integrated run with zero failures/skips and all protocol/evidence/source checks (194files), log /private/tmp/recall-metadata-status-full-20261107.log. The148 result remains historical.

Historical product/source revision `4db7fc052e297d4a28886c8de691b6ddd2d00a1b` and its saved run/spec remain unchanged. Status-shape product/source revision is7457b304c59a2f2c4fca98e81305d220f6adedea (local only). The subsequent status-shape correction is recorded separately in status-shape-run.json and spec-status-shape.json; it removes an unsupported diagnostic-only restriction, not a cause of the old real health/startup failure. No actual diagnostic is implied by either snapshot.

## Exact prepared command — not executed

The earlier ZUtNbw preparation was withdrawn before any grant/profile/network access because its source hashes predate the approved status-shape correction. Only the replacement below may be considered for a later read-only decision. The master, not this agent, will operate the one-shot command after approval.

Prepared directory: `/private/tmp/recall-readonly-metadata-ready-ei3zpC`.

Context SHA-256 (canonical and exact file bytes): `0ed22fc8025ec5d1127f4f3354f6353adea70cbb409add816b0a0a8f56068e5e`.

Private metadata: `/private/tmp/recall-readonly-metadata-ready-ei3zpC/prepared.json`; stable pointer `/private/tmp/recall-readonly-metadata-ready-current.json`. It contains exact command, limits, old-state hashes and no credentials. Expected metadata is the three distinct completed receipts already attributable to the candidate; no fresh account inventory is claimed yet. No grant/launch/use exists, and the real profile has not been opened for this preparation.

```sh
/Users/sirquickflip/.hermes/node/bin/node --disable-warning=ExperimentalWarning "/Users/sirquickflip/Documents/ChatGPT/Хакатоны/work/recall-agent/app/agent-metadata-diagnostic.mjs" --run /private/tmp/recall-readonly-metadata-ready-ei3zpC
```

Only after the separate exact read-only access decision may `metadata-grant.json` be created privately/O_EXCL with `{schema:1,kind:"explicit-readonly-sdk-diagnostic",contextHash:<above>,checkedAt:<actual new approval issue time>}`. It grants this one diagnostic and nothing from the old spent application allowance. The command then starts one fixed worker; the operator must not separately probe any route beforehand. No real grant/command is created or executed by this status-shape correction.

## Sources and decisions

- Coordinator's offline preparation approval and the user's instruction to investigate/continue without resetting allowances.
- `docs/ORDINARY_LIVE_RESULT_2026-11-07.md`, `docs/ORDINARY_DIAGNOSTIC_OFFLINE_2026-11-07.md` and completed public receipt evidence.
- Installed MemWal `listMemories`/`resolveOwner` use signed metadata without Seal sessions; public compatibility and actual constructor/public-key behavior inspected locally.
- New metadata-specific implementation/tests/fixture, saved stdio walkthrough and `evidence/verify-readonly-metadata.mjs`.

Decision: finite separate metadata-only admission, no application changes or real access in preparation. Safe alternative is to preserve the stopped evidence/fallback if the next decision cannot stay narrow.

## Open questions and next gate

Coordinator review of offline DoD and exact command, followed by a concrete read-only access decision. A future success proves current SDK/stdio/metadata readiness only; a failure can identify a safe current category. Neither outcome alone establishes the lost historical cause, new-record plaintext readback, cross-chat model recovery or judge readiness. Stage 5 live writes and another native trial remain unapproved.
