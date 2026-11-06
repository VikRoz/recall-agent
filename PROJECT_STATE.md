# Recall Agent development state

Date: 6 November 2026. Separate private repository: VikRoz/recall-agent.
Baseline: VikRoz/recall-lab at c884ad88176e93c2856dfcc3892467379ace0293. Original source, public site and v1.0.0 release remain unchanged and available for the fallback application. Upstream push is disabled in this working copy.

Added wallet activity lookup on 6 November: independent find_wallet_activity tool, UTC period filtering, bounded query-bound pagination and explicit partial coverage. Default synthetic index and a hash-pinned saved Mainnet index both feed the existing report/CSV path. The saved index has two distinct transactions and marks source as replay. Workspace dataset binding prevents silent switching. No external lookup provider is enabled.

Implemented: empty-chat Codex launch with general policy, no injected task; independent tool preconditions; safe local-input recovery; scoped gas-payer claim verification; opt-in local technical capture and linked resolution; stable workspace across fresh MCP processes; typed SDK experience transport with explicit caller admission and shared durable writer implementation.

Offline validation covers automatic capture without Save, no capture without consent, no memory for already-correct claims, duplicate suppression, exact fresh-process read on a different transaction, unrelated-network exclusion, corruption stop, SDK receipt binding, denied admission and uncertain outcome without resubmission. All synthetic claims are explicitly fixtures.

A native model smoke on synthetic data completed three turns after a separately retained harness failure; actual model gpt-5.6-luna. The model selected report/verification, reused a report for CSV, and clarified a fresh incomplete request. It also overreached about direct counterparties and wallet-history capability. No experience was created, so memory benefit remains untested. See docs/AGENT_MODEL_PROBE_2026-11-06.md.

Not ready: blinded new-task model evaluation, native Claude free-task trial, shared durable live budget/admission for combined rule/experience stores, actual new Walrus records and judge packaging. New launcher exposes no live provider mode. Experience schemas cannot be inserted into the address-rule namespace. Inherited evidence belongs to the fallback only.

Validation: 65 offline tests passed, including seven wallet-index/replay tests, seven agent tests and the native approval zero-ID regression; inherited MCP and evidence checks passed. See docs/AGENT_VALIDATION.md.

Next gate: freeze the wallet-query candidate, then test an ordinary wallet-activity request with the model on replay data. The model has not yet used the new lookup tool in a live inference. Research live discovery coverage, pagination and cost before enabling any history provider. Model verification must record actual first choices and interventions; no fixed task route or forced mistake.

Four native model user turns were started (one interrupted harness attempt and three completed turns). Included ChatGPT usage consumed; additional spend $0. No Tatum/Walrus calls, credentials transferred, billing changes, deployment or new Mainnet writes. No submission sent.
