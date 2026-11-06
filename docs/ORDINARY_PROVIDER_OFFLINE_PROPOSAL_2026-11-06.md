# Ordinary provider launch — offline contract proposal

Date: 6 November 2026. Stage 2 preparation after stage 1 scope reconciliation. Status: offline implementation approved by the coordinator under the user's explicit delegation; implemented result is in ORDINARY_PROVIDER_OFFLINE_2026-11-07.md. No new live operations authorized.

## Goal and starting assumptions

Reuse the working Tatum transaction adapter, managed Walrus SDK, independent tools and shared durable ceilings in a normal empty-chat launcher. Existing source b1072c8 implements a one-turn seeded replay experiment, not general onboarding. Its immutable trial and exhausted budget must remain unchanged. Existing trial namespace contains two real experience records.

## Chosen solution

1. Preserve the current offline default and the historical live-trial validator unchanged. Add an explicit ordinary-provider contract, initially usable only with injected offline transports. It has no required error, seed ID, empty namespace, first tool, transaction count of exactly two or task prompt. Network stays Mainnet, with at most two Tatum batches and ten transaction IDs per batch, supplied by the user/model at call time rather than fixed to sample constants.
2. Keep two writes, two content recalls, 64 guarded Walrus fetches and eight polls per job **per approved run**. No generic quota reset. Run journals and approvals remain private and durable. A stable logical workspace has two typed physical namespaces; each separately approved run has a new ledger while retained receipts and project identity remain bound to the same workspace. Existing stopped/uncertain ledgers cannot be reopened or overwritten.
3. Separate retained experience corpus capacity (maximum 20, matching existing complete-reader bound) from the two-write run allowance. Preserve hash validation, exact schema/source/version scopes, linked-parent checks and duplicate suppression. Address-rule and experience decoders remain separate. Do not create rotating namespaces to evade the cap. Increasing corpus capacity does not authorize a single extra write in any existing run.
4. Add a small bounded Tatum adapter that reuses connectTatum/TatumData, validates normalized user inputs before the external call, validates the account/key-bound Free snapshot before each batch and reserves that batch before native gRPC. Limit real routes to the existing fixed Tatum Mainnet transaction method, prohibit retries, close resources on stop. The fixed Sui Seal package route remains a separate guarded SDK transport.
5. Real report facts carry source=tatum and fresh-provider provenance; optional wallet lookup remains a clearly labelled local subset and cannot masquerade as online discovery. Observer experience uses the source of the specific tool/data path, never the memory storage label. Inputs from an unsupported wallet are clarified, not silently replaced with the demo wallet.
6. Ordinary account setup reuses official Walrus login and in-place credentials, with explicit consent for capture and a supplied bounded approval. No new key workflow or hidden use of author credentials. The offline increment does not read a real profile or start login. The public entry may expose preparation/status and intercepted checks first; real activation remains unavailable until a reviewed live plan is approved.

## Self-review, alternatives and failure modes

- Simply exposing openLiveAgent would retain its fixed initial failure and native permit; rejected because that would ship the experiment harness as the product.
- Keeping the two-record corpus and creating a new namespace per pair is smaller, but breaks project continuity and turns memory into isolated demos; rejected.
- Raising all operation budgets to twenty would remove the write bottleneck but broaden cost and retry exposure; rejected. Only retained read/validation capacity changes, with unchanged run allowances.
- Rebuilding an unrestricted indexer or web chat would solve a different problem and increase delivery risk; rejected. Selected-transaction reads already exist and match the primary scope.
- Concurrency across runs could bypass a writer budget. An exclusive active-run/workspace lease must span provider operations; inactive/consumed runs remain durable history. Opening a second run is never automatic on limit exhaustion.
- Automatic capture can itself fail or fill the remaining allowance. Unknown outcomes must retain the pending journal and stop; no recursive memory writes or resubmission.
- Existing source checks and historical evidence verifiers must continue to validate their frozen historical source; new tests must not rewrite successful/failed earlier trial evidence.

## Offline Definition of Done

- Normal assembly exercised with installed MemWal/Seal and the real Tatum normalization adapter through intercepted public synthetic data; no real account file, provider or model.
- Independent MCP processes reuse the same logical namespace and durable counters, without a first task or required nextTool.
- Tests cover more than one retained experience pair, unchanged two-write allowance, mixed rules/experience shared capacity, wrong identity/source, stale Free snapshot, key mismatch, request budget exhaustion, invalid inputs before transport, unsupported endpoint, uncertain writes, duplicate calls and cleanup.
- Explicit data provenance in report, CSV and tool catalog; cached/local lookup never promoted to live history.
- No real entry is enabled by an expired, missing, synthetic or historical trial approval. No author key, global model settings, login or public source is changed.

## Sources, decisions and open questions

Local: app/{agent-run.mjs,agent-provider.mjs,agent-live.mjs,agent-experience.ts,agent-mcp.mjs,agent-session.ts,tatum.ts,activity-live.ts,activity-memory.ts}; src/memory.ts; stage 1 inventory and the 6 November requirements audit.

Decision requested: approve this offline-only ordinary-provider contract, in particular separating retained capacity from per-run writes and allowing bounded transaction IDs at call time. Alternative: freeze current experimental scope and use the existing fallback. Extra spend remains $0; this proposal is not a billing/access change or a new live allowance.

Open: exact account-specific live approval contents and new allowances, useful extra memories toward ten, and final judge packaging. These are prepared separately after offline evidence is available.
