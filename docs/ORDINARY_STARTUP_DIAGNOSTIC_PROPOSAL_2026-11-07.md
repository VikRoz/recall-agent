# Offline follow-up proposal after the stopped second client

Date: 7 November 2026.

## Goal and assumptions

Learn the first real cause of a required-MCP startup stop without spending another full model trial on an unknown failure. The single real allowance is stopped/consumed, its temporary Tatum key is deleted, and the new memory has one completed receipt. No provider replay, new credential use or real diagnostic allowance is approved. Evidence and frozen runtime of that attempt remain unchanged.

## Evidence and missing information

The first native turn and Tatum/Walrus write succeeded. The second thread failed before generation; SDK counter increased once during startup and the durable guard stored only `AGENT_PROVIDER_OR_POLICY_ERROR`. Available diagnostics establish required-MCP initialization failure, not its underlying HTTP/validation/network cause. The stop occurred before proof expiry. Changing keys, health requirements, request ordering or model prompts now would be a guess.

## Option A — minimal private first-failure evidence, offline implementation

Add one bounded private diagnostic artifact beside the existing run ledger, without changing the ledger schema or public tool response. Before stopping, retain only:

- existing manifest/source binding and current request count;
- a fixed startup/action phase enum;
- route/method only from the existing explicit allowlist; no query string or arbitrary path;
- a numeric HTTP status only if one was actually received;
- a fixed category and an allowlisted local Fault code, never arbitrary provider/exception text.

No headers, signatures, tokens, body, key, full URL, prompts or plaintext memory. Preserve the first failure rather than replacing it with a cleanup/close error. Failure to write diagnostics must not resume processing, reset budgets or conceal the primary stop. Avoid a logger framework, new remote service or retry layer.

Offline regression: two independent intercepted processes, new remember between them, then a controlled startup error in the second; prove the original route/category/code survives MCP error wrapping. Include pre-transport admission rejection, HTTP non-OK, health/deployment validation and late-close cases using existing installed SDK/Seal fixtures. No actual model, account, Tatum or Walrus request.

Benefit: a later admitted failure can be classified without inferring details from RPC -32603. Limitation: it neither recovers discarded diagnostics nor fixes the cause of this completed run. Source/plan hashes would change, so a later real attempt would require a new frozen revision and exact approval. Current grant must never be reused.

## Option B — separately admitted public, read-only initialization diagnostic

After a separate exact allowance, probe only the already allowed public relayer initialization metadata/compatibility routes, without a model, Tatum, memory reads/writes or user credentials. It can determine whether the currently published health/version/deployment contract agrees with the frozen client guard and show a stable first-failure category. It must have its own tiny finite request budget and no retries; it must not borrow or reset the stopped 4B ledger. **No such allowance is granted here.**

Important technical limit: installed `MemWal.create(config)` expects a delegate private key in its constructor. `compatibility()` itself fetches public metadata. Therefore a truly keyless public diagnostic is not a full signed-account/Seal initialization test. If exercising that SDK public method uses the existing explicit public synthetic seed, label it precisely as anonymous public-metadata compatibility, never as the judge/author account. Never use a synthetic key to sign for the real account. Alternatively use direct public metadata fetching under the same route validation; this tests the contract, not complete SDK account initialization.

A full read-only signed-account initialization would need the existing delegate in place and its own explicit credential/access allowance; calling it keyless would be false. Public success cannot establish real account authorization, sponsored-write availability, recall completeness or second-chat recovery.

## Adversarial comparison and proposed decision

A reduces future diagnostic loss at zero external calls and protects privacy through a fixed allowlist. Its strongest counterargument is that better error reporting can be mistaken for a product fix. Keep diagnosis and readiness separate.

B observes current public behavior without another model trial, but a transient success cannot explain a historical failure and its anonymous scope excludes signed-account causes. Its external requests still need a separate bounded approval. Running a full native trial immediately is the least informative expensive-in-quota alternative and is rejected as the first reaction.

Recommend A first, offline only, after coordinator approval. Then review its synthetic failure evidence. Consider B only if public initialization remains a plausible unanswered branch and a concrete minimal request plan adds useful information. Keep the preserved fallback as the alternative if the critical path cannot be recovered before the submission checkpoint. Do not weaken a guard solely to turn the existing STOP into success.

## Sources

- `docs/ORDINARY_LIVE_RESULT_2026-11-07.md`, actual private native summaries/stderr and durable ledger.
- `app/agent-run.mjs`, `app/agent-walrus-guard.mjs`, `app/agent-provider.mjs`, `app/agent-model-probe.mjs` at frozen source e1ffa21.
- Installed `@mysten-incubation/memwal` `dist/memwal.js`: create/constructor requires key; compatibility fetches public version and may use health fallback. Inspected locally, not invoked.
- Coordinator's instruction to compare diagnosis options and preserve the stopped allowance.

## Open questions

Which safe local category caused request29/startup to stop? Is it reproducible with intercepted second-process conditions? Would a public-only diagnostic distinguish any remaining branch, or would it add no account-level evidence? No answer or architecture change is approved merely by writing this proposal.
