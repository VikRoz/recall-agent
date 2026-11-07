# Agent offline validation — updated 7 November 2026

The subsequent actual metadata-only diagnostic is checked by `evidence/verify-readonly-metadata-live.mjs`: historical source bytes, result/counter/stdio hash binding, all three original done receipts and retained stopped/native state. This new saved-evidence check makes no provider or profile calls and is separate from the 149-test offline suite. See READONLY_METADATA_RESULT_2026-11-07.md.


## Scope and assumptions

Experimental copy of Recall Lab. The original release remains the fallback. This record covers code/protocol checks; these offline checks perform no real model task or Mainnet operation. A separate subsequent model probe is documented in AGENT_MODEL_PROBE_2026-11-06.md.

## Results

Latest offline suite: **162 tests pass**, zero failures/skips. Thirteen single-continuation tests supplement149; one full integrated run passed all independent protocol walkthroughs, saved-evidence verifiers and source206. See ORDINARY_CONTINUATION_OFFLINE_2026-11-07.md. All newly checked SDK/Seal/Tatum/native replies are intercepted/fake, actual profile/key/model/provider0. Previous offline suite:149 tests pass, zero failures/skips: one open-string metadata-status regression supplements148. Targeted10/10 and one integrated149-test run passed after the approved metadata-only correction, with all protocol/evidence/source checks. The preceding148 included nine metadata-only diagnostic cases supplementing139. See READONLY_METADATA_PREPARATION_2026-11-07.md. One integrated run after this change passed all protocol/evidence/source checks with actual profiles/model/provider0. The preceding139 included eight private-diagnostic cases supplementing131. See ORDINARY_DIAGNOSTIC_OFFLINE_2026-11-07.md. This integrated run was performed once after the diagnostic change and included all protocol/evidence/source verifiers. The preceding 131 included thirteen managed-boundary cases and one raw-evidence regression supplementing 117. See ORDINARY_LIVE_ADMISSION_OFFLINE_2026-11-07.md. The full start.command --check passed on 7 November, including independent intercepted managed clients, fake app-server orchestration, all evidence verifiers and the source manifest. These checks use no actual credentials, account CLI, inference or provider requests. Previous suite: 117 tests pass, zero failures/skips (14 ordinary-provider, 5 live-admission, 16 guarded-provider cases and 82 earlier tests), including eleven observer/artifact tests. The complete check.command run passed on 7 November; the normal-launcher two-process ordinary protocol check and all saved-evidence/source verifiers passed as well. See ORDINARY_PROVIDER_OFFLINE_2026-11-07.md. The approved offline repair is implemented; see TOOL_ERROR_MEMORY_OFFLINE_2026-11-06.md. The prior 69-test suite included fail-closed model selection, failed-tool detection and CSV mismatch assessment. This does not mean the model probe passed. Wallet/period lookup and saved-data replay previously passed the complete 65-test suite. See WALLET_ACTIVITY_OFFLINE_2026-11-06.md for the new contract and seven additional tests. The 58-test result below records the preceding model-probe baseline.

`bash start.command --check` passed: 58 tests (50 inherited regression tests, 7 agent tests and 1 probe-approval test), both inherited independent-process MCP checks, saved evidence recomputation and the updated development-source manifest.

New checks cover: absence of an injected task in Codex arguments; export without saving; recoverable missing-report input; no capture without consent; automatic capture and linked correction for a structured gas-payer claim; duplicate suppression; no record for an already-correct claim; unrelated-network exclusion; integrity failure stopping the session; independent MCP processes reading the same experience on another transaction; typed SDK admission, confirmed receipt and uncertain write without resubmission.

The SDK check intercepts all SDK responses and uses no credentials. Test claims are synthetic. The generic writer preserves the existing address-rule validation facade. `bash -n start.command` and `git diff --check` passed.

## Findings and decisions

Use independent tools and persistent workspace identity, not scenario phases. Only clearly local argument errors recover; unknown/integrity failures stop. Record source is explicit so fixture observations do not transfer into Tatum context. Automatic capture is opt-in. Address-rule data and experience schemas are separate.

## Limits and open work

A protocol test selecting a wrong address is not evidence that a real model made that mistake. A separate preliminary model smoke was completed; genuinely new user-selected tasks and memory benefit remain unverified. Free prose is not fully verified. The default entry remains offline. A distinct managed real-evaluation mode is now prepared and checked offline, but its real grant/key/account/model access has not been exercised. It is not yet the stage 6 judge launcher. Native Claude behaviour and clean judge packaging remain unverified.

## Sources

`app/agent.test.mjs`, `check.command`, `app/agent-session.ts`, `app/agent-experience.ts`, inherited `app/activity-memory.ts`, and `docs/AGENT_PLAN.md`.

Additional spend: $0. Model/Tatum/Walrus calls in these offline checks: 0. No deployment or application submission.

The subsequent wallet model probe FAILED acceptance; see WALLET_MODEL_PROBE_2026-11-06.md. Its negative evidence is now verified offline by evidence/verify-wallet-model-probe.mjs. Observer/experience-schema and export-artifact changes are now implemented and checked offline following approval; the original failed acceptance remains retained. A later one-pair comparison is separately recorded in MEMORY_COMPARISON_2026-11-06.md, with narrow first-choice and original-file delivery evidence and explicit limits.

The explicitly approved one-turn direct continuation completed the actual captured-error/fresh-conversation/linked-resolution sequence for the known case. Exact records were read back in a new MCP process, frozen product/harness hashes remained unchanged, and the saved report evidence matched. See DIRECT_EXPERIENCE_CONTINUATION_2026-11-06.md and evidence/verify-experience-continuation.mjs. No new provider calls, generalized improvement claim or live Walrus verification is implied.

The approved shared-gate increment passed the full suite and its saved SDK evidence verifier. Installed SDK/Seal, independent processes, mixed typed storage, crash retention, exact receipt reuse, stale/unknown refusal and close-during-call isolation were exercised with synthetic responses only. See AGENT_WALRUS_GATE_OFFLINE_2026-11-06.md. Historical model source hashes are checked against the recorded Git revision when available, not against later product revisions. No new inference or live account access occurred.

The separately approved real trial completed one native gpt-5.6-luna turn, 2 confirmed sponsored Walrus writes, 2 content recalls and 41 guarded SDK requests, without Tatum or paid fallback. The first real lookup was limit=10 and a linked resolution was captured automatically. The SDK read path enforced both plaintext receipt hashes; no third read was made and raw recall bodies were not separately archived. See AGENT_LIVE_TRIAL_2026-11-06.md. This is a single known-case trial with saved Sui facts, not a general-learning benchmark.

Ordinary provider implementation is offline-only. The intercepted walkthrough retained six synthetic records and used 2 simulated Tatum batches, 2 simulated writes, 2 content recalls and 36 guarded SDK requests. Model calls, external provider requests, real credential reads and extra spending were zero. Existing source/real-trial snapshots remain unchanged.

Stage 3 also passed the full 117-test suite, independent MCP walkthroughs and saved evidence/source checks. Four applicability negatives plus capture opt-out passed. Gas experience view selection is now literal to digest/network/source/observed payer rather than sponsored-class alone. The prior source snapshots remain historical; this is no new model or Mainnet claim. See EVALUATION_PREPARATION_2026-11-07.md and evidence/verify-candidate-evaluation.mjs.
