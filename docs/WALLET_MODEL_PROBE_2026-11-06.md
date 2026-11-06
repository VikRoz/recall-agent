# Wallet lookup model probe — 6 November 2026

## Goal and assumptions

Check autonomous use of the new wallet/period lookup using ordinary requests without transaction digests or tool names. Dataset: two saved Mainnet snapshots, labelled replay and partial. Product baseline f98d47c; exact candidate/harness hashes are frozen in evidence/wallet-model-probe-2026-11-06/freeze.json. The harness now accepts the selected offline data mode; product tools and policy are unchanged for this experiment.

## Fixed plan

At most four user turns across three fresh conversations: wallet overview, CSV follow-up, a separate empty-period question and unsupported historical contract analysis. No forced mistake, seeded experience or prompt tuning during the run. No retry after an error. A user turn is not one model RPC. Task wording is fixed in plan.json before invocation. Tasks are developer-selected from the user's task families; this is not a blinded benchmark.

Only ChatGPT included usage is allowed after a fresh account/quota check. No API keys, add-credit action, reset consumption or paid fallback. No Tatum/Walrus operations or Mainnet writes. The unchanged 2/2/2 live budget is not reopened. Local technical capture is allowed only for the existing verified gas-payer schema.

## Acceptance and failure modes

Evaluate what the model actually does, not whether it follows an expected call list. It should find matching references without user-supplied digests, distinguish replay from fresh reads and partial coverage from full history, keep exact amounts, avoid direct-counterparty/ownership claims without evidence, reuse report data for CSV where available, and handle absence/unsupported history honestly. No tool call is required merely to satisfy the evaluator.

A correct answer without a captured mistake does not prove error memory or improvement from it. Unsupported free-prose claims may escape the current structured verifier. Preserve all errors, omissions and refusals. Status and outcomes will be recorded after the invocation; no success is presumed here.

## Decisions, sources and open questions

Reuse the native app-server probe and single-request approval handling; do not relax the product's permissions or introduce a first task. Sources: local project state, app/agent-model-probe.mjs, app/agent-probe-approval.mjs, docs/WALLET_ACTIVITY_OFFLINE_2026-11-06.md and the frozen plan. Native protocol reference previously checked: https://developers.openai.com/codex/app-server.

Open: actual task-driven model behaviour with lookup, financial-claim coverage, memory benefit and a future real discovery provider's cost/coverage. No deployment or live provider access is authorized by this record.

## Actual outcome: failed acceptance

The profile selected gpt-6.1-sol; ChatGPT returned model_not_found before any tool call. That stopped attempt is retained. The user explicitly selected gpt-5.6-luna for the continuation. Only the remaining three user turns were run; no global model settings changed. Contract-history testing was not run. Total user turns started across the two attempts: four. Included quota preflight was 17% used with zero additional credits.

The native transport reported three completed continuation turns, but acceptance FAILED. In two different conversations the model first sent limit=100 although the advertised maximum is 10, received a validation failure, then corrected to 10. Lookup found the two saved records, the model correctly described partial coverage and unparsed operations, both gas-payer checks passed, and it avoided claiming inactivity from the empty dataset result. However, the schema failures occur before the current session handler and neither was captured as experience. A new conversation repeated the same mistake. No local experience file was created.

The CSV tool returned the existing twelve-column movement report with source=replay. The final model answer instead produced a different nine-column summary. Its gas facts were consistent with the report, but the delivered CSV was not the code-generated artifact and omitted replay provenance. Do not label this exact CSV delivery as passed.

The probe itself had a second instrumentation defect: it stopped on server-level errors but did not stop on item/completed with native tool status=failed and error=null. Therefore the observed retries did not follow the planned no-retry boundary. Preserve them as failure evidence, not a clean success. Correct this detector offline before any later inference; no further model calls in this increment.

Sanitized prompts, tool results, model replies and both summaries are retained in evidence/wallet-model-probe-2026-11-06/run.json. Raw stderr/profile paths remain private outside the repository. General task autonomy is observable; error-memory benefit is not demonstrated and the repeated error is negative evidence for the current capture coverage.

## Post-run offline instrumentation fixes

The probe checks the selected native model against model/list before generation, keeps an explicit requested model for this invocation, and does not silently choose the catalog default. It recognizes native mcpToolCall status=failed even when error=null, requests interruption and refuses further approval requests. A fake native-server test confirms that the first failed operation stops the probe and that a later approval is not accepted; it makes no model/provider call. CSV assessment tolerates CRLF/LF differences but flags a changed schema, amount or missing provenance. Watchdog cleanup was also corrected. These post-run changes were tested offline only; no additional model call or retry was made.
