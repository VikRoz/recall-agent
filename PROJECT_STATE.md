# Recall Agent development state

Date: 6 November 2026. Separate private repository: VikRoz/recall-agent.
Baseline: VikRoz/recall-lab at c884ad88176e93c2856dfcc3892467379ace0293. Original source, public site and v1.0.0 release remain unchanged and available for the fallback application. Upstream push is disabled in this working copy.

Implemented: empty-chat Codex launch with general policy, no injected task; independent tool preconditions; safe local-input recovery; scoped gas-payer claim verification; opt-in local technical capture and linked resolution; stable workspace across fresh MCP processes; typed SDK experience transport with explicit caller admission and shared durable writer implementation.

Offline validation covers automatic capture without Save, no capture without consent, no memory for already-correct claims, duplicate suppression, exact fresh-process read on a different transaction, unrelated-network exclusion, corruption stop, SDK receipt binding, denied admission and uncertain outcome without resubmission. All synthetic claims are explicitly fixtures.

Not ready: real model behaviour, native Claude free-task trial, shared durable live budget/admission for combined rule/experience stores, actual new Walrus records and judge packaging. New launcher exposes no live provider mode. Experience schemas cannot be inserted into the address-rule namespace. Inherited evidence belongs to the fallback only.

Validation: 57 offline tests passed, including seven new agent tests; inherited MCP and evidence checks passed. See docs/AGENT_VALIDATION.md.

Next gate: inspect and freeze this offline slice, then run unseen tasks with the user's model on fixtures before enabling live providers. Model verification must record actual first choices and interventions; no fixed task route or forced mistake.

No provider/model calls, credentials, billing changes, deployment or new Mainnet writes during this implementation. Additional spend: $0. No submission sent.
