# Own-account request budgets and model binding

Date: 8 November 2026.

## Goal

Let a user pause and open fresh chats without a four-minute activation expiry, preserving finite request allowances and additional spend $0. Prevent an unrelated shared Codex default from choosing an unsupported model.

## Assumptions

The user explicitly requested removal of the time limit and repair of model selection. The coordinator approved a separate own-account schema2 policy and exact migration, retaining Tatum8 / Walrus7 writes /10 content reads /192 service requests /8 polls per job. Account Free conditions and official sponsored storage must still hold. Other applications or account owners may change billing outside this program; no local policy can attest those future changes.

## Findings and self-review

The original launcher inherited the global model. Codex0.153 rejected gpt-6.1-sol for this account/client; this does not establish universal model unavailability or prove a minimum CLI version. The coordinator's bounded metadata-only probe on8 November found gpt-6-astra, gpt-5.6-sol, gpt-5.6-terra and gpt-5.6-luna; no generation or provider MCP was started. The user's prior selection gpt-5.6-luna is available.

Removing just expiresAt would leave hidden five-minute approval/preflight checks and absolute Tatum/relayer deadlines. Conversely changing every deadline would invalidate closed experiments and allow unbounded requests. The selected policy therefore requires explicit schema2, own-account mode, null expiry and maxUSD0. Only this contract removes session/observation age limits. Each request retains its timeout; durable counters, job polls and uncertain-write stops remain.

Tatum's specific authentication documentation says exhausted Free credits produce403 and require an upgrade. Billing documentation describes overage charging for paid plans. The broader marketing FAQ mentions automatic upgrade without resolving every plan distinction. The implementation admits only the explicitly confirmed same Free account/key, price2, finite included-credit allocation and read-only endpoints; it cannot buy or upgrade. It stops on provider uncertainty/errors. It does not claim to prevent an account owner changing their plan elsewhere.

A fake far-future expiry was rejected because it hides a policy change. A five-minute renewal prompt was rejected because it recreates the user's problem. Resetting activation in a new folder was rejected because it loses the real budget and memory lineage. Updating the shared model setting was rejected because other clients can overwrite it again. Automatically retrying inference on alternate models was rejected because it consumes quota and conceals failure.

## Decisions

- New ordinary own-account activations use schema2 and no session expiry. Legacy schema1/managed/rehearsal contracts remain timed and closed.
- Metadata preflight is bounded to four RPCs and15 seconds, with all provider MCPs inert, no thread/start or turn/start, no secret environment, no action approvals and no raw provider/model output logging.
- Require a ChatGPT account with included quota, no paid credits/API fallback. Bind one literal available model before provider/profile/key operations; revalidate and pass explicit -m on every launch. Catalog access is necessary but cannot guarantee later generation succeeds.
- Preserve10/15/45-second operation timeouts, all budgets and failure stops. No automatic reset, resubmission or upgrade.
- Migrate the exact existing dataful run only with user confirmation, full state snapshot, no active lease, all writes DONE and identical credentials by metadata. Archive the old snapshot; carry every counter, job, poll, journal, proof and CSV. Do not read/copy keys or profile credentials.
- No new release ZIP or publication while the user-led path remains unverified.

## Checks

Targeted own-account, long-pause/restart, legacy-policy isolation, strict-budget, uncertainty, model metadata and launcher tests passed25/25 offline. They use synthetic accounts/providers and a fake local metadata process. No new inference or provider request was made by these tests. Integrated check.command then passed218/218 tests, all independent MCP checks, historical evidence verifiers and the299-file source manifest. The first integrated attempt exposed a test scheduling race: immediate child termination could precede the child logging a denial; the corrected test observes the actual parent denial write and verifies no inference. No runtime retry or delay was added. The exact external migration passed4/4 offline test groups, including crash points, refusal on uncertainty/active leases and credential-read/network interception. No actual user-state migration has run yet.

## Sources

- Local code: app/agent-own-launch.mjs, agent-own-contract.mjs, agent-own-policy.mjs, agent-run.mjs, agent-model-preflight.mjs.
- User workspace allowlisted metadata: run7874b2f5-d127-42de-9122-b3e9f6b0797c, counters1/1/1/26, one DONE intent/job. Credential contents were not read.
- Coordinator evidence: workspace/docs/TOTAL_RECALL_MODEL_METADATA_2026-11-08.json.
- [Codex models](https://developers.openai.com/codex/models).
- [Tatum authentication errors](https://docs.tatum.io/docs/authentication-errors).
- [Tatum billing basics](https://docs.tatum.io/docs/tatum-billing-basics-how-it-works).
- [Tatum plans and limits](https://docs.tatum.io/docs/plans-limits).
- [Tatum marketing FAQ](https://tatum.io/start-for-free).

## Open questions

The user still needs to complete the migrated ordinary interactive launch and final answer/CSV path. Catalog metadata cannot establish every model-generation permission or future account billing state. Unrestricted wallet history and arbitrary prose verification remain outside this prototype.
