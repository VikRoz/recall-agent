# Ordinary real evaluation — partial success, stopped before second generation

Date: 7 November 2026, Europe/Moscow.

## Goal and authorization

Run the frozen stage 4B evaluation once, at $0, after stage 4A offline acceptance. Direct human consent is recorded in the master chat, user messages `01a1b4f9-3690-7673-abb0-27238e8f5781` (exact bounded run/key use) and `01a1b4fc-b921-78f2-97d0-fc2f0b2de4da` (clipboard capture alternative). Actual user messages were read, not inferred solely from delegation. Scope: two reserved native turns/fresh conversations, two Tatum attempts/four included credits, two sponsored Walrus writes/two content reads, 64 service requests/eight polls per job, no retry, renewal, paid fallback, publication or deployment.

The first attempt to create the execution process was rejected by automatic approval review before execution. After separately presenting the actual human messages as authorization evidence, the identical command was approved and started exactly once. No grant, account request or model call happened in the rejected process creation. The master did not start another runner. No budget was reset.

## Starting assumptions and frozen revision

Product/source revision `e1ffa21f8c80de10d0ad31173f785a7f45c47e80`; evidence pin revision `30717b7`. The real context/plan are the accepted `VRtCF3` snapshot, not the withdrawn `0QcGE3` draft. Actual Tatum UI observation: 7 November 07:53:23 UTC, Free active, 99,972 included credits remaining, matching account/key prefix. The observed timestamp was not renewed. Existing Walrus delegate was read in place. The newly approved Tatum copy was passed only to the fixed Tatum channel, never to the model or Walrus.

## Observed result

**PARTIAL, not an end-to-end pass.**

1. First native gpt-5.6-luna conversation completed. It independently chose `prepare_report`, then `verify_gas_payer` for the user's hypothesis. A real Tatum Mainnet request returned the selected transaction. The model's report used source `tatum`, not replay.
2. Fresh response evidence identifies the different gas payer `0x000037de3368098ebbb5bc6808283004f4746a34e16d32e171f9400cd58cdd69`; exact net charge is 104,261 MIST. Independent arithmetic on the archived raw response matches the normalized report. The wallet's hypothesis that it paid gas was rejected.
3. The verifier automatically saved one supported scoped observation. Completed Mainnet receipt: blob `YJ1F4vBD8iCTpPO7x1BukyKeFv0TlYfsXb7at2coK94`, job `0b19a64c-66b4-40a8-9c33-afeeebbc8615`, four status polls. The canonical payload and operation ID match the completed receipt/hash and durable intent.
4. The second native slot was reserved before app-server startup, as designed. `thread/start` failed because the required Recall Agent MCP server closed during initialization. **The second model generation did not start.** No fresh second-chat memory recall, linked resolution or final inventory is claimed.
5. The run stopped with no retry. The parent deleted the exact temporary Tatum key; absence was checked at exit and afterwards. Existing Walrus credentials and nonsecret receipts/counters remain. No publication or deployment occurred; additional spend is $0.

The incorrect hypothesis belongs to the user/evaluation. The model correctly rejected it; this is not a spontaneous model mistake or proof of general learning.

## Counters and stop

| Item | Observed |
| --- | --- |
| Native reservations | 2 consumed: completed / stopped |
| Actual native generations started and completed | 1 |
| Tatum attempts / included credits | 1 / 2 |
| Walrus completed writes | 1 |
| Content recalls | 1, before the new write |
| Guarded Walrus/Seal service requests | 29, includes admitted preflight/startup |
| SDK ledger stop | `AGENT_PROVIDER_OR_POLICY_ERROR` |
| Native second-client reason | `RPC_ERROR_-32603` |
| Exit | code 1, 07:56:48.189 UTC |
| Proof expiry | 07:58:23 UTC; expiry did not cause this stop |
| Temporary key | absent |
| Additional spend | $0 |

The second reservation is not refunded because generation did not start. This allowance is stopped/consumed. No remaining operation count is permission to reopen it.

Candidate receipt count is now the previously proved two plus this distinct completed record: **three attributable completed receipts**, subject to the same relevance/identity policy. This is not a fresh final account inventory or plaintext readback of the new record; the ten-memory stage remains open and unapproved for live writes.

## Offline diagnosis and uncertainty

The retained second-client stderr reports: `Failed to create session: required MCP servers failed to initialize: recall_lab: handshaking with MCP server failed: connection closed: initialize response`. Other state-database discrepancy warnings do not establish the cause.

The service counter advanced from 28 to 29 during the second client startup, then the SDK guard stored its generic policy/provider stop. The harness retained only the RPC error code. No underlying HTTP response, route-specific outcome or original validation code was archived, so the exact underlying cause is **unknown from retained diagnostics**. No further provider/status request was used to diagnose it. Do not infer a Walrus outage, invalid key, schema failure, rate limit or model fault without evidence.

## Proposed next offline gate — not implemented here

Primary option: preserve a small private diagnostic alongside the existing ledger before a stop: manifest binding, operation phase, allowlisted route/method, safe error code/category, and numeric HTTP status when actually observed. No headers, raw provider messages, tokens, response bodies or keys. Keep generic public tool errors and all stopping/budget rules. Use a separate private diagnostic artifact rather than extending the ledger schema and invalidating earlier contracts. Add interrupted/warm-start regressions with fully intercepted transports; this must not start a real model or provider retry.

Strongest objection: instrumentation will explain a later failure but cannot recover the discarded cause of this run or establish its root fix. It is a diagnosis improvement, not a claimed reliability fix. Alternative: leave the candidate stopped and choose the preserved fallback after checking its submission requirements. Rejected: restarting until success or weakening the health/config/identity guard; either would consume an unapproved allowance or hide uncertainty. Coordinator approval and a new exact allowance are required before any later real attempt.

## Artifacts and verification

Public-data-only local evidence:
- `evidence/ordinary-live-2026-11-07/run.json`: outcomes, counters, completed receipt, reconstructed canonical payload binding, first model/tool trace, exact failure limits and frozen source hashes.
- `evidence/ordinary-live-2026-11-07/tatum-response.json`: byte-identical raw transaction response; no request headers/key.
- `evidence/ordinary-live-2026-11-07/answer.md`: original first model final answer, unedited.
- `evidence/verify-ordinary-live.mjs`: receipt/hash/lineage, raw gas arithmetic, source revision and negative completion claims. Passed offline; no new external operations.

Private originals remain under `/private/tmp/recall-agent-ordinary-ready-VRtCF3/workspace`: `native-0/{events.json,summary.json,stderr.txt}`, `native-1/{events.json,summary.json,stderr.txt}`, `tatum-response-1.json`, `launch*.json`, `launch.*.log`, `native-budget.json`, actual run ledger under `runs/`, completed receipt under `journal-experience/activity-jobs/`, and cleanup ownership metadata. Private grant/account/profile material is not copied into the repository.

## Sources and open questions

Sources: actual frozen runner outputs above; original UI observation; direct human approvals; stage 4A source and offline checks. No additional web/provider request was made for this diagnosis.

Open: exact underlying startup failure, tested fix, successful fresh second-client retrieval/resolution, useful missing memories, and primary judge installation. The next action is review of these offline facts and the proposed diagnostic increment, not an automatic real retry.
