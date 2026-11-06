# Agent offline validation — 6 November 2026

## Scope and assumptions

Experimental copy of Recall Lab. The original release remains the fallback. This record covers code/protocol checks; these offline checks perform no real model task or Mainnet operation. A separate subsequent model probe is documented in AGENT_MODEL_PROBE_2026-11-06.md.

## Results

Latest offline suite: 80 tests pass, including eleven observer/artifact tests. The approved offline repair is implemented; see TOOL_ERROR_MEMORY_OFFLINE_2026-11-06.md. The prior 69-test suite included fail-closed model selection, failed-tool detection and CSV mismatch assessment. This does not mean the model probe passed. Wallet/period lookup and saved-data replay previously passed the complete 65-test suite. See WALLET_ACTIVITY_OFFLINE_2026-11-06.md for the new contract and seven additional tests. The 58-test result below records the preceding model-probe baseline.

`bash start.command --check` passed: 58 tests (50 inherited regression tests, 7 agent tests and 1 probe-approval test), both inherited independent-process MCP checks, saved evidence recomputation and the updated development-source manifest.

New checks cover: absence of an injected task in Codex arguments; export without saving; recoverable missing-report input; no capture without consent; automatic capture and linked correction for a structured gas-payer claim; duplicate suppression; no record for an already-correct claim; unrelated-network exclusion; integrity failure stopping the session; independent MCP processes reading the same experience on another transaction; typed SDK admission, confirmed receipt and uncertain write without resubmission.

The SDK check intercepts all SDK responses and uses no credentials. Test claims are synthetic. The generic writer preserves the existing address-rule validation facade. `bash -n start.command` and `git diff --check` passed.

## Findings and decisions

Use independent tools and persistent workspace identity, not scenario phases. Only clearly local argument errors recover; unknown/integrity failures stop. Record source is explicit so fixture observations do not transfer into Tatum context. Automatic capture is opt-in. Address-rule data and experience schemas are separate.

## Limits and open work

A protocol test selecting a wrong address is not evidence that a real model made that mistake. A separate preliminary model smoke was completed; genuinely new user-selected tasks and memory benefit remain unverified. Free prose is not fully verified. The new entry point has no live mode; shared durable provider budgets and live admission remain required before enabling it. Native Claude behaviour and clean judge packaging remain unverified.

## Sources

`app/agent.test.mjs`, `check.command`, `app/agent-session.ts`, `app/agent-experience.ts`, inherited `app/activity-memory.ts`, and `docs/AGENT_PLAN.md`.

Additional spend: $0. Model/Tatum/Walrus calls in these offline checks: 0. No deployment or application submission.

The subsequent wallet model probe FAILED acceptance; see WALLET_MODEL_PROBE_2026-11-06.md. Its negative evidence is now verified offline by evidence/verify-wallet-model-probe.mjs. Observer/experience-schema and export-artifact changes are now implemented and checked offline following approval; no native model re-test has changed the retained failed acceptance.
