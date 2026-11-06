# Real Walrus and native model trial — prepared plan

Date: 6 November 2026. Status: prepared; no authenticated operation, record submission or new inference has started.

## Goal

Run the experimental agent with real managed Walrus storage and one fresh gpt-5.6-luna conversation. Keep Sui evidence on the saved replay, Tatum at zero, and additional spending at $0. Demonstrate persistence and use of a real prior observed error, not manufacture a fresh mistake.

## Starting assumptions and current observations

Development baseline 32405ec passed 98 offline tests. The default launcher and new manifest validator still accept offline mode only. The old real activity run already consumed its two Tatum calls, two writes and two content reads; its configuration, receipts and counters must not be changed or reused as a renewed allowance.

Opera showed the user signed into the same Walrus owner, with the existing delegate listed. A private local profile from that earlier activity run exists with mode 0600. Its public account/owner/package/delegate binding was inspected; no private key was printed, copied or sent. No new browser key or delegate was created. Browser sign-in is not itself evidence that an SDK credential is authorized.

Exactly three unauthenticated public GET requests completed: /health, /config and /version on https://relayer.memory.walrus.xyz. All returned 200. Health reported production, write_ready=true and writes=ok. API 1.0.0 and the package ID match the existing profile. These are availability/deployment checks, not account authorization or record receipts. Raw public replies are retained in evidence/agent-live-preparation-2026-11-06/public-preflight.json.

The current official managed-relayer documentation explicitly says the service covers WAL storage and SUI gas, and the caller pays neither for relayed writes. The published Mainnet endpoint is the same pinned relayer. The live admission should combine this documented sponsorship contract, fresh pinned deployment metadata and successful account/delegate authorization. There is no per-account price flag in the observed public replies; do not invent one or treat write_ready alone as a price guarantee. No owner transaction-signing key, payment endpoint, self-funded storage path, upgrade or paid fallback is permitted.

## Concrete payload and sequence

The exact failure record is taken from the retained native control, with the observation ID and content preserved. Its provenance is the real automatically captured limit=100 / maximum=10 rejection. The previously completed native continuation demonstrates its lineage. Only this failure is migrated initially; a successful resolution is not pre-inserted. The immutable payload and unchanged ordinary wallet question are in evidence/agent-live-preparation-2026-11-06/payload.json.

1. Implement and check the real-profile admission branch offline. Reuse the existing SDK writer, common ledger, typed namespaces, route guard and lifecycle handling. Read the existing profile in place after approval; never copy a delegate/private key into a new file or the repository.
2. Create a new, explicitly approved run ledger for this trial, with the same logical workspace as the observed error and dedicated exact physical namespaces. Confirm both target namespaces are empty. Check account/delegate authorization with signed read-only SDK calls, the pinned owner/package and fresh managed-service evidence. An unknown or denied outcome stops before any write.
3. Submit the exact retained failure once, wait within the existing poll ceiling and retain the confirmed receipt. This is a real migration of a historical observation, not a new native mistake.
4. Start a fresh native conversation and a distinct MCP process with no old transcript. Its tool catalog must obtain the captured failure from real Walrus. Ask the unchanged ordinary Sui wallet question, without tool names, a limit reminder or a prescribed first action.
5. Let the model choose. A successful comparable tool call may automatically create one linked resolution through the same real writer. Prepare the report from saved Sui evidence with truthful replay and incomplete-history labels. Save every outcome without prompt adjustment or success-seeking retries.

The fresh model's read is the independent-client check of the first real memory. A possible post-resolution read inside the report consumes the second content-read allowance. Do not add a third independent content read after the report. Inspect returned receipt/record IDs and the shared journal for the second record within the same ceiling; if exact returned content cannot be verified, report that limitation instead of adding a read.

## Bounds and stops

- One new native user turn, explicitly gpt-5.6-luna, included ChatGPT quota only after current account/catalog/rate-limit checks. At most 12 tools and 120 seconds. No API key, extra-credit use, quota reset, paid fallback, global model change or second generation attempt.
- Zero Tatum calls and zero Tatum key access. Real Walrus: at most two total writes and two content recalls, 64 guarded SDK fetches and eight status polls per accepted job. The three already-performed public checks are disclosed separately; refreshes after activation belong to the run's bounded ledger.
- Additional spend $0. No deployment, publication, account upgrade, new key or permission expansion. Existing exhausted runs remain unchanged.
- Stop on access/quota, SDK/deployment mismatch, expired admission, nonempty target scope, unsupported payment path, unknown receipt, timeout, incomplete memory or a consumed ceiling. Preserve consumed attempts and uncertain journals; no resubmission or recovery that resets counters.

## Adversarial review and implementation choice

Testing only a scripted SDK import/read would verify storage but omit the user's requested model interaction. A new model trial from an empty account might complete without any error; repeatedly trying until it fails would introduce selection bias and extra usage. The selected sequence uses a genuine retained error as initial experience and measures the fresh model's actual behaviour, with an automatically verified resolution if it occurs. It must not be described as discovering a new unknown error.

The actual /config includes a JSON-RPC fallback URL even though its selected transport is gRPC. The offline guard currently rejects any such field. Pin the freshly observed configuration and keep the actual request allowlist restricted to the existing gRPC package-object lookup; accepting unused deployment metadata must not authorize JSON-RPC fallback, arbitrary endpoints or transaction execution. If the SDK attempts another route, stop. Do not patch or hide the server response to make the test pass.

A real account has to be distinguished from the synthetic fixture. Use an explicit live mode and real storage labels only in the approved adapter; keep the offline initializer, test seed and synthetic relayer unreachable there. Bind the native one-turn allowance durably before generation so an interruption cannot silently permit a second turn. Model failures and null results remain evidence, not a reason to retry.

## Sources

- Official managed endpoint and caller funding contract: https://docs.wal.app/walrus-memory/getting-started/choose-your-path (checked 6 November 2026).
- Relayer authentication, write flow, storage quota and rate limits: https://docs.wal.app/walrus-memory/relayer/overview.
- Sponsoring WAL and SUI roles: https://docs.wal.app/walrus-memory/fundamentals/architecture/funding-storage.
- Fresh public responses from /health, /config and /version; read-only Opera account/delegate observation; public identity fields of the existing private profile.
- Local current code and retained evidence: app/agent-run.mjs, app/agent-provider.mjs, app/agent-walrus-guard.mjs, app/agent-model-probe.mjs, app/walrus.mjs and evidence/experience-continuation-2026-11-06/run.json.

## Decisions and open questions

The user requested a live online test. The exact proposed scope is now concrete, but changes to live admission plus the new native-turn and write allowance require the explicit bounded approval described by AGENTS.md. Obtain it before implementing the admission contract and before authenticated execution. Current account authorization, quota, indexing latency, returned receipts, the model's first choice and automatic resolution remain unverified. Approval of this plan does not authorize higher limits, payments, retries or a deployment.
