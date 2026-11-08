# Automatic memory delivery in an ordinary fresh chat

Date: 8 November 2026.

## Goal and assumptions

Audit the completed user-led ordinary launch and a neutral new conversation without performing another model/provider operation. Runtime source is eb1558682a781f431eae7e26949645048eff9eac. The same private workspace and durable allowance survive the explicitly approved schema2 migration. The general developer policy remains present; the task prompt itself contains no memory instruction.

## Actual findings

The migrated ordinary launch has no session expiry, retains per-request timeouts and selects the available gpt-5.6-luna model explicitly. The owner completed a prompted comparison and original CSV export, then opened a separate new session01a1bc61-f364-7450-9a40-18b125ca54f0 and asked only for the selected transaction's payer, wallet movement, relationship uncertainty and original CSV.

The neutral session's prepare_report output contains the prior full transaction observation with blob q71H-BD57yPAE15l7j0X7r2JcRBF4K5w1WgUw-SQdAQ, comparison=same, experienceStorage=walrus and replacesFreshData=false. The model received that context automatically and completed a correct final answer and original 396-byte CSV. The physical file matched SHA-2565d4d51522ed8fbb5669da85d8f132fdb1732445f58c71ee16f5f17c8a57b6c49. No duplicate observation was written.

The final answer does not explicitly cite memory. Its facts also follow from the fresh Tatum response, so this establishes automatic retrieval/delivery, not a causal answer improvement. Both the technical-error experience and address-rule arrays are empty: this case does not test recalling a mistake or correction. The single personal-workspace fact is separate from the established ten-record candidate inventory and is not counted as an eleventh record or attested as the same delegate.

Local ledger observations changed from Tatum2/write1/read2/service47 to3/1/3/68, stopped=null. The client lease remained active and untouched. The delta is a comparison of local snapshots, not a per-endpoint network trace. The audit itself made zero model/provider calls, read no credential contents and changed no user state.

## Evidence and sources

- evidence/own-account-neutral-live-2026-11-08/run.json records the verdicts, runtime hashes and provenance.
- prompt.txt is the actual neutral task; prepare-report.json and export-report.json contain the actual public selected-transaction payloads; final-answer.txt and exports/ contain the delivered output.
- REDACTIONS.json records replacement of private filesystem paths with the same relative CSV path and hashes of the original selected excerpts. Full rollout, project context, credentials and unrelated conversation data are not distributed.
- Audited original rollout line references: prompt7, prepare output22, export output31, final36, task complete39. The39-line prefix hash is8b30848cf7412493c88c4bfb58f16032cf436136ae3f4cb6f1791c8d5cedde4c.
- Source: app/agent-session.ts, agent-experience.ts, activity-memory.ts and agent-tool-observer.mjs.
- evidence/verify-own-account-neutral-live.mjs independently checks the saved prompt, payload hash, historical record, computed report/CSV, final export delivery and conservative verdicts without network access.

## Decisions

Accept the ordinary user flow and automatic memory delivery. Preserve the inconclusive causal finding. Do not add a forced first recall action or prompt tuning, reset counters, request more live calls, merge the personal workspace into the ten-record corpus or advertise general learning. Package the frozen runtime and these separately identified public excerpts; preserve the earlier timed STOPPED harness as historical evidence.

## Open questions

Whether prior verified experience changes behavior requires a case with relevant information not independently supplied by fresh data and suitable controls. This audit does not answer that question and does not authorize another experiment. Publication and the author-recorded current walkthrough remain separate gates.
