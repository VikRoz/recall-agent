# Recall Agent development state

Date: 6 November 2026. Separate private repository: VikRoz/recall-agent.
Baseline: VikRoz/recall-lab at c884ad88176e93c2856dfcc3892467379ace0293. Original source, public site and v1.0.0 release remain unchanged and available for the fallback application. Upstream push is disabled in this working copy.

Added wallet activity lookup on 6 November: independent find_wallet_activity tool, UTC period filtering, bounded query-bound pagination and explicit partial coverage. Default synthetic index and a hash-pinned saved Mainnet index both feed the existing report/CSV path. The saved index has two distinct transactions and marks source as replay. Workspace dataset binding prevents silent switching. No external lookup provider is enabled.

Implemented: empty-chat Codex launch with general policy, no injected task; independent tool preconditions; safe local-input recovery; scoped gas-payer claim verification; opt-in local technical capture and linked resolution; stable workspace across fresh MCP processes; typed SDK experience transport with explicit caller admission and shared durable writer implementation.

Offline validation covers automatic capture without Save, no capture without consent, no memory for already-correct claims, duplicate suppression, exact fresh-process read on a different transaction, unrelated-network exclusion, corruption stop, SDK receipt binding, denied admission and uncertain outcome without resubmission. All synthetic claims are explicitly fixtures.

A native model smoke on synthetic data completed three turns after a separately retained harness failure; actual model gpt-5.6-luna. The model selected report/verification, reused a report for CSV, and clarified a fresh incomplete request. It also overreached about direct counterparties and wallet-history capability. No experience was created, so memory benefit remains untested. See docs/AGENT_MODEL_PROBE_2026-11-06.md.

Latest wallet-query model probe FAILED acceptance. A profile-model access failure was retained, then the user explicitly chose gpt-5.6-luna for three remaining turns. The model found the two saved records and handled partial/empty coverage, but repeated limit=100 against maximum=10 across separate chats. Those SDK validation errors were not captured by current gas-payer memory. It also rewrote the generated CSV and omitted replay provenance. Native turn completion does not mean acceptance passed. See docs/WALLET_MODEL_PROBE_2026-11-06.md.

The probe now validates model availability before generation and stops on native failed-tool status even with error=null. These harness fixes are tested offline and are not a live re-test of the product.

The user approved the bounded offline repair. Implemented: public-transport observation before tool handlers; a separate numeric-constraint experience variant; verified success links; source/schema-scoped catalog context in fresh processes; original CSV artifacts with hash and MCP resource link. Storage opt-out, two-record cap, uncertain-write stop and SDK validation remain. See docs/TOOL_ERROR_MEMORY_OFFLINE_2026-11-06.md. A subsequent bounded native comparison on this revision observed a first-lookup difference: empty experience requested 100 and stopped; restored experience requested 10 and completed. The model delivered the original CSV path and correct hash. See docs/MEMORY_COMPARISON_2026-11-06.md. This is one known-case pair, not a general improvement claim.

Not ready: broader first-choice/generalization testing beyond the one known-case comparison, blinded new-task model evaluation, native Claude free-task trial, shared durable live budget/admission for combined rule/experience stores, actual new Walrus records and judge packaging. New launcher exposes no live provider mode. Experience schemas cannot be inserted into the address-rule namespace. Inherited evidence belongs to the fallback only.

Validation: 82 offline tests passed, including model-selection, native failed-tool stopping and CSV mismatch detection. Seven wallet-index/replay tests and seven agent tests remain green; inherited MCP and evidence checks passed. See docs/AGENT_VALIDATION.md.

Next gate: prepare shared durable provider budgets/admission for the current agent before a separately approved real Walrus write/read test. Do not reopen exhausted runs or infer live sponsorship from this local comparison. Native Claude and held-out task coverage remain pending. No provider activation, Mainnet write or deployment is included in the comparison.

Eleven native model user turns were started across the recorded experiments: one interrupted harness attempt, one unsupported-model rejection, one expected control schema-error stop and eight completed turns. These are not counts of internal model requests. Included ChatGPT usage consumed; additional spend $0. No Tatum/Walrus calls, credentials transferred, billing changes, deployment or new Mainnet writes. No submission sent.
