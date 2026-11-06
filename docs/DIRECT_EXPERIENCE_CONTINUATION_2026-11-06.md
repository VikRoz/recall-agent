# Direct continuation of an observed model error

Date: 6 November 2026.

## Goal

Complete the causal sequence already started by the actual native control: model-generated error, automatic persistence, retrieval in a fresh process, and an observed subsequent model choice. Do not substitute historical SDK-request replay for the captured native observation.

## Starting assumptions and evidence

The control in evidence/memory-comparison-2026-11-06/run.json independently requested limit=100 against maximum=10. The SDK rejected it; the observer created one local technical-experience record before the native probe stopped. The response observation ID matches the persisted ID. No successful-resolution record exists in this control workspace.

The control's three persisted state files were copied byte-for-byte to a private continuation workspace. The single experience row equals the archived control's finalLocalExperience. No SDK failure was reenacted, no resolution was inserted, and no memory content was edited. A separate MCP process listed tools, retrieved the exact captured record in the relevant catalog entry, and left all three file hashes unchanged. A disposable copy passed the existing restored-workspace guard. These checks used zero model, Tatum or Walrus calls.

## Chosen method and adversarial review

Continue from that real observation, using the same ordinary wallet question in a fresh native conversation and the same product policy, schema and recorded dataset. The question contains no tool names or hint about the allowed limit. The model chooses its actions; the evaluator does not enforce a first tool or correct arguments.

A deliberately induced error would guarantee a demonstration but undermine independent choice. Replaying historical requests would repeat the already-completed weaker comparison. Starting unrelated tasks until a new error occurs would introduce selection bias and unbounded usage. Direct continuation is the smallest test of the missing link using a genuine captured event.

The strong counterargument is that the first error class and task are already known. Completing this sequence therefore demonstrates use of that automatically captured observation, not prevention of unknown error classes or general learning. One successful fresh choice cannot establish causality statistically. A failure, no relevant lookup, or task-completion failure must remain visible.

## Frozen proposal and limits

- At most one new native user turn, explicitly selected gpt-5.6-luna, after checking current model availability and included ChatGPT quota.
- Existing harness ceilings: 12 tool calls, 120 seconds per turn, 8 minutes overall; no retries, model fallback, prompt tuning, quota resets or extra-credit use.
- Local memory remains capped at two records in total: one existing observed error and at most one automatically verified resolution. No synthetic resolution may be inserted.
- Zero Tatum calls, zero Walrus calls, zero Mainnet writes, no deployment, no key transfer or billing changes; additional spend $0. Included ChatGPT usage would be consumed.
- Stop on tool failure, access/quota, timeout, protocol uncertainty or uncertain persistence. No attempt to repair and rerun within this approval.

Success requires the first relevant lookup to satisfy the unchanged SDK constraints, no repeat of the observed violation, and a completed task with saved-data coverage accurately disclosed. If a valid successful call creates a linked resolution, retain and verify its lineage separately. It is not required to manufacture a correction to claim non-repetition. If no relevant lookup occurs, the result is inconclusive. Any valid result remains a single known-case continuation, not a generalized memory benchmark.

## Sources

Local source baseline 1eb79d9; app/agent-model-probe.mjs; app/agent-probe-workspace.mjs; app/agent-tool-observer.mjs; app/agent-launch.mjs; evidence/memory-comparison-2026-11-06/run.json; evidence/experience-continuation-2026-11-06/plan.json and preparation.json. No external research or provider requests were needed.

## Decisions and open questions

The offline preparation did not authorize generation. The user subsequently explicitly approved exactly one new native turn with the stated model, quota and provider limits. Product code, the old working release and the prior comparison evidence remain unchanged. Real Walrus persistence and broader unseen-task evaluation remain later gates.

## Actual outcome after approval

The native gpt-5.6-luna conversation completed one user turn with four tool calls. Its first find_wallet_activity call requested limit=10, succeeded, and automatically persisted a successful-tool-call resolution linked to the exact earlier captured failure ID. The model then prepared the report and verified both gas payers. No prompt was changed, no tool call was retried and no additional user turn was started. Included ChatGPT preflight usage was 18%, with no extra credits and balance 0; additional spend $0. Tatum/Walrus calls and Mainnet writes: zero.

A new independent MCP process read back both final records with exact IDs and the supersedes relationship. The earlier failure row remained unchanged. Frozen hashes of all 46 product/harness files matched before and after generation. The report's transaction evidence matched the saved dataset; both gas verifications passed. Manual final-answer review found the replay/incomplete-history qualifiers present, correct operation counts and total gas of 208455 MIST. The answer does not claim a fresh chain query or infer a high-level swap/transfer from an unparsed PTB.

Assessment: OBSERVED_CAPTURE_TO_FRESH_CHAT_RESOLUTION. The observed sequence is now complete for this case: a real native invalid call was automatically captured, the resulting record survived a fresh process/conversation, the next first call was valid, and its verified resolution was automatically linked and independently read back. This does not prove a statistical causal effect, general learning, unknown-error prevention or live Walrus portability. Memory was copied byte-for-byte to a fresh private workspace; the old model transcript was not reused.

Sanitized native trace, quota summary, exact final records, frozen plan and independent catalog readback are in evidence/experience-continuation-2026-11-06/. Raw events remain private outside the repository; their SHA-256 is retained. The offline verifier recomputes the persisted lineage and report checks without model or provider requests. This one-turn allowance is now consumed. No further generation is included.
