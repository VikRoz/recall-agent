# Remaining live gates — bounded allowance draft

Date: 7 November 2026. Prepared offline for the coordinator. Status: NOT AUTHORIZED, NOT EXECUTABLE. Existing live allowances stay consumed.

## Goal and assumptions

Prepare stage 4's real ordinary-provider trial and stage 5's ten-memory closeout after stage 3 freezes useful cases. Code ef3c1f9 has an intercepted ordinary entry only; its synthetic proof cannot activate a real transport. Real activation requires a separately reviewed admission branch, account checks and explicit allowance. No provider/model/account API is called to write this document.

## Stage 4 proposed ceiling

| Resource | Maximum |
| --- | ---: |
| New native ChatGPT user turns | 2, across at most 2 fresh conversations; narrowed after stage 3 offline checks |
| Model | gpt-5.6-luna, only if the existing own-account catalog and included quota confirm access |
| Tool calls | 12 per user turn, 24 total |
| Time | 120 seconds per turn; whole admitted wave ends within 5 minutes of its fresh proof |
| Actual Tatum unary batches | 2 attempts, at most 10 selected digests per batch |
| Included Tatum credits | 4, at the freshly verified rate of 2 per batch |
| Walrus remember attempts | 2 shared across both typed namespaces |
| Content recall attempts | 2 shared across both typed namespaces |
| Guarded Walrus/Seal service fetches | 64 total, including signed metadata, health/config/version and job polls |
| Status polls | 8 per accepted job, at most 16 total |
| Additional spend | $0; no payment, funding, upgrade or paid fallback |

Native user turns are not counts of internal model RPCs. Startup preflight must verify the selected native model and included-account use before inference. No --fast, usage reset, model substitution or paid credit fallback is used. If a full task cannot fit this allowance, retain the partial/negative result; do not reopen the ledger or spend another turn for success.

Exact public inputs, two task texts, claim origin and criteria are frozen in evidence/candidate-evaluation-2026-11-07/plan.json. The warm-start offline trace used 2 simulated Tatum batches, 2 writes, 2 recalls and 36 SDK requests; it proves a reachable protocol path, not a guaranteed native route. Do not choose a fixed wrong model call or claim that a user-supplied incorrect hypothesis was a spontaneous model error. Two historical Mainnet transaction IDs already exist in the evidence and can be freshly read through Tatum; this would be a fresh provider read of historical transactions, not fresh complete wallet-history discovery.

## Access and zero-spend preflight

- Existing Walrus credential file: /private/tmp/recall-activity-live.PXpVajpV/profile/credentials.json. File existence and mode 0600 were checked only; its contents were not read for this preparation. The authorized live process should use it in place, bind the existing public owner/account/delegate/package, and stop if changed/revoked. No automatic new delegate, owner signing key or key export.
- Previous Tatum temporary key file is absent, as expected after cleanup. No reusable local Tatum credential is assumed. A live trial needs a concrete in-place existing key source or the human's explicit approval to capture the same account's existing key into a new private temporary file. Do not fetch it silently from Opera, a server environment or old logs.
- Before actual Tatum requests: current dashboard Free plan/account identity and included-credit balance at least four, account-bound key hash, current documented price, proof no older than five minutes. Count attempts before the native call; disable transport retries. Never refresh proof timestamps without observing the source again.
- Before real Walrus operations: current official managed-relayer sponsorship terms, pinned deployment/health and successful signed account access. Limit traffic to the exact relayer plus the existing Seal package lookup. No direct wallet payment path or self-funded storage fallback.
- Include all initial and final metadata inside the 64-request service ceiling; do not call real services outside the ledger to improve evidence. Third-party web documentation/UI inspection is distinguished from authenticated provider operations and must not fetch transaction data secretly.
- If Sui wallet confirmation is actually required, use the separately authorized Opera interaction only for the intended free connection/signature after checking origin, scope, recipient and sponsor. Unknown transactions, transfers or new security-sensitive delegation stop for the human.

## Stage 5 closeout envelope — not yet a payload plan

The current candidate-only inventory proves two records, leaving a conservative gap of eight. Historical records remain excluded until their current identity, relevance and uniqueness are substantiated. The published rules do not expressly demand a single namespace, so an evidence-backed reconciliation may change the final gap without changing facts or silently relabelling old work.

Proposed aggregate ceiling for stages 4–5 together: at most **8 new useful writes**, including any stage 4 writes, at most **2 native user turns** and **2 Tatum batches** in total. To retain the strict two-recall run boundary even with populated namespaces, allow at most **8 explicitly enumerated waves**, each with at most 2 writes /2 content recalls /64 service requests /8 polls per job. Consequently the aggregate upper bound is 16 content recalls, 512 service requests and 64 status polls (included in those requests), not an unlimited new-run loop. Each actual wave's tighter per-operation count and payloads must be frozen; an outer durable manifest must prevent aggregate overspend. Stopped/unknown waves cannot be replaced to get success.

This is deliberately an upper-bound draft, not a request to run eight waves. Stage 3 must first identify useful real record contents. Ten memories do not mean ten induced model failures. Existing decoders cover confirmed address rules and two verified-error variants; arbitrary positive fact snapshots or preference records would be a new data contract and require review. Do not add a record type or fabricate corrective history just to fill a count.

If a coherent ten-record set cannot be justified within the current supported types and evidence, report that to the coordinator before authorizing stage 5. Options include substantiated historical records, a small separately approved verified-observation contract or choosing the preserved fallback. The minimum useful verified path is preferred over count padding.

## Stop conditions and evidence

Stop on unknown outcome, quota/access/billing ambiguity, stale proof, unavailable model, identity/deployment mismatch, incomplete or changing inventory, wrong content hash/parent/schema/source, unexpected route, deadline, tool failure requiring a critical stop or any ceiling. No retry/resubmit, hidden provider/model fallback, key copy, paid operation or automatic allowance renewal.

Retain source/plan hashes, initial and final counters, attempts and completed receipts, actual first choices and correction lineage, fresh process evidence, exact original CSV where requested and all failures. Preserve all old ledgers. The applicant records the video only after the candidate passes the clean launcher and installation, or after a deliberate fallback decision. Publication is separately authorized after materials are prepared.

## Sources, decisions and open questions

Local: ROADMAP.md; CANDIDATE_SCOPE_AND_INVENTORY_2026-11-06.md; ORDINARY_PROVIDER_OFFLINE_2026-11-07.md; AGENT_LIVE_TRIAL_2026-11-06.md; MASTER_COORDINATION_2026-11-06.md; retained original approval/counters and the existence-only key/profile check.

Fresh billing/sponsorship has not been rechecked and no real-account launch is ready. This draft does not promise that a particular account is currently free/authorized. Coordinator choices needed: stage 3 cases and record evidence policy; human decision needed if an existing Tatum secret must be captured or a new bounded live allowance is granted. All preparation costs $0.

## Concrete temporary-key preparation

The new destination and hidden capture/cleanup scripts are prepared, without opening a terminal or collecting a key. Private metadata is at /private/tmp/recall-agent-next-key-destination.json (mode 0600); it identifies the exclusive mode-0700 directory and exact tatum.key path. Source: the same account's existing Mainnet API key on https://dashboard.tatum.io/api-keys, after the fresh Free/account check. Do not create a new key. Capture is hidden input with an account-prefix/format check and exclusive O_NOFOLLOW mode-0600 creation. The key is never a command argument or model input. After completion, stop or failed startup, remove only that temporary file and clear the clipboard used for this copy; preserve all nonsecret ledgers and the in-place Walrus profile. Before an action-time approval question, the coordinator reads the concrete private destination rather than asking about an unspecified file. Nothing has been captured or copied yet.
