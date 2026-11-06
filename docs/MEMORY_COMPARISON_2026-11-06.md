# Restored experience comparison — 6 November 2026

## Goal and scope

The user approved two fresh conversations on the same ordinary task, with no experience versus restored experience, followed by CSV delivery verification. At most three user turns: one control, one memory condition and one CSV follow-up if the memory condition completes. Native gpt-5.6-luna, included ChatGPT usage only after fresh quota/catalog admission; no API keys, paid fallback, quota reset, Tatum/Walrus operations or Mainnet writes. No retries or prompt changes for success.

## Assumptions and preparation

Product baseline 2933146; exact candidate/harness hashes and fixed plans are in evidence/memory-comparison-2026-11-06/freeze.json. The same product policy, tool schemas, saved dataset and capture setting apply to both arms. The control begins with empty local experience. The memory arm begins with two records recreated by replaying the actual failed and successful native calls from the retained wallet-model probe through the current SDK/observer. A separate MCP process verified the exact restored IDs in the catalog. These are historical-request replay and local writes, not fresh model mistakes or Walrus receipts; provenance is in preparation.json. Initial workspace files are hash-pinned before the treatment starts.

Both first user messages are byte-identical and contain no tool names or transaction IDs. The task is the previously observed failing case, not a blinded unseen-task benchmark. Fresh model conversations do not share transcript text. The restored records expose only safe technical constraints and their verified resolution, not a copied answer. The third turn asks for CSV without prescribing a tool sequence.

## Predeclared assessment

Observe the first lookup arguments, SDK failures, overall task completion and coverage/correctness qualifiers. Success for a narrow memory effect requires an invalid first choice in the control and a valid first choice in the memory condition with unchanged validation. If both choose valid inputs, no improvement is demonstrated. If the memory condition repeats the failure or never uses relevant tools, do not claim benefit.

A schema-validation failure stops that arm without retry. It does not prohibit the separately planned other arm. Stop the entire experiment on access, quota, timeout, unknown transport or uncertain-write outcomes. The CSV follow-up runs only after the memory arm completes. Its acceptance requires a reference to the original artifact plus its returned hash, and byte/hash agreement with the code-generated CSV. A rewritten table is not original artifact delivery.

## Decisions and limits

Use the existing native probe with an explicitly verified restored workspace, rather than adding a first user task or forcing an incorrect call. Freeze code, plans and assessment criteria before generation; keep all results. This is one fixed-order pair with stochastic model behaviour, not statistical proof or general improvement. The native client's attention is not directly observable; catalog restoration is verified separately. Live Walrus integration and unified budgets remain separate gates.

## Sources and open questions

Local SDK and project code, user approval, evidence/wallet-model-probe-2026-11-06/run.json, app/agent-comparison-prepare.mjs, app/agent-probe-workspace.mjs. Native protocol reference previously checked: https://developers.openai.com/codex/app-server. Before the run, first-choice difference and actual artifact delivery were open and no outcome was assumed. The observations below resolve this pair only; generalization and future Mainnet provider behaviour remain open.

## Actual outcome

The exact same wallet task and frozen product/harness files were used in both conditions. The control's first lookup requested limit=100, failed the SDK's maximum=10 check and stopped as planned. The new observer automatically captured this new native error locally; its response ID matches the persisted record. The memory condition's first lookup requested limit=10, completed the report and verified both gas payers. No retry or prompt adjustment was used. The three-turn ceiling was respected: one stopped control turn and two completed memory-condition turns.

The CSV follow-up returned a link to the original artifact and its exact SHA-256. File bytes matched the tool's code-generated CSV, including CRLF and replay provenance. The archived original is 683 bytes, SHA-256 59968fc01f053914ab80b1dd432ac2e3ab1aa716acd93acb80c61dd5bd991cd4.

Mechanical assessment: NARROW_FIRST_CHOICE_DIFFERENCE; original CSV delivery passed the declared reference/hash/bytes criterion. The restored state remained identical to the prepared two-record state. A post-probe independent catalog read matched the pre-probe record IDs and schema fingerprint. Frozen source hashes were checked unchanged before and after generation.

This is a positive observation in one fixed-order pair on a known failure, not statistical or general evidence of better Sui reasoning, automatic training or broad hallucination prevention. Restored experience is local and derived from replayed historical native requests; no real Walrus storage or cross-client portability was tested. There were no Tatum/Walrus calls, credit purchases/resets, paid fallback or global model-setting changes. Included ChatGPT usage was consumed; preflight usage was 17% for the control and 18% for the memory condition, with zero extra credits. Additional spend $0.

Sanitized traces, preparation provenance, frozen plans, catalog readback and the original CSV are under evidence/memory-comparison-2026-11-06/. Private raw logs stay outside the repository. The mechanical verifier follows the predeclared criteria and preserves null/negative outcomes; it is not a new model test.
