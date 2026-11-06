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

Prepared and verified offline only. Product code, the old working release and the prior comparison evidence remain unchanged. The previous three-turn comparison budget is exhausted; a new native turn requires separate approval before generation. Open: whether a fresh model conversation uses the actual single captured failure, whether a verified resolution is created, and whether the task completes. Real Walrus persistence and broader unseen-task evaluation remain later gates.
