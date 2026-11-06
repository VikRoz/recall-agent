# Ordinary provider assembly — offline implementation

Date: 7 November 2026. Stage 2 offline increment; the stage 1 scope/inventory is unchanged.

## Goal and assumptions

Implement the coordinator-approved ordinary-provider proposal from 6 November using the current Tatum, MemWal, Seal and MCP dependencies. The coordinator's approval is recorded in the master chat under the user's explicit delegation. Approval covers offline contracts and synthetic tests only, not real accounts, login, model turns, writes or publication. The old seeded live trial and fallback remain separate historical evidence.

## What changed

- Retained experience capacity is now twenty, matching the existing complete-reader bound. Per-run ceilings stay two Tatum batches, two shared writes, two shared content recalls, 64 guarded SDK requests and eight polls per job.
- A stable private workspace retains identity, the two namespaces and receipt journals. An explicitly created new approved run has its own ledger. A new chat reuses that ledger; exhaustion never creates another run automatically. Uncertain prior journals, lost ledgers and receipt mismatches block admission.
- One project-wide runtime lease excludes concurrent processes before catalog reads, Tatum calls or writes. The active-run pointer and capture/Free proof are bound to hashes and checked during operations. Late client construction after close cannot start an RPC, and an interrupted runtime retains a durable lease/stop.
- The ordinary assembly reuses the installed generated Sui client, real TatumData normalization, MemWal signing, Seal, the typed stores and independent agent tools. The only ordinary executable currently injects synthetic Tatum and relayer responses. There is no real credential reader or transport fallback in it.
- Wallet-history lookup is absent from the ordinary selected-transaction catalog; unfamiliar wallets need transaction references. No sample wallet/digest or first tool is injected. Normal reports, original CSV and memory all identify synthetic source=fixture during these tests. No simulated fact is labelled as fresh Tatum data.
- The default offline launcher is preserved. New explicit preparation and provider-fixture options select the intercepted assembly; capture is opt-in at preparation. The Codex argument builder opens an empty chat with general policy and no chosen model. No native model was started to check the arguments.

The existing transitive protobuf runtime-rpc 2.11.1 is now also declared directly because the synthetic unary transport uses its real UnaryCall contract. No package was downloaded; offline npm dependency inspection found the pinned packages already installed.

## Actual validation

Fourteen new ordinary-provider tests passed in the targeted suite. They cover generated request serialization and selected transaction IDs, source labels and original CSV, opt-out, pure invalid-input recovery, cross-process exclusion, retained two-pair recovery in fresh MCP processes, mixed namespace writes, unchanged caps, explicit new-run admission, prior-ledger preservation, uncertainty, approval/hash/key mismatch, expiry before a later batch, corpus over-cap refusal, no real entry, counted failed attempts, channel cleanup, interrupted construction and launcher flags.

A separately saved protocol walkthrough used the normal start.command entry and two independent MCP processes. Four explicitly injected synthetic historical records were initially present; the protocol submitted one wrong structured gas-payer test claim, wrote a verified fixture failure, opened a new process, recovered all five records and wrote the linked fixture resolution. Final counts were **2 simulated Tatum batches / 2 simulated writes / 2 simulated content recalls / 36 guarded synthetic SDK requests**, six retained synthetic records, stopped=null. Both synthetic clients closed. The final resolution receipt was checked against the intercepted backend and receipt journal; no third content recall was added.

This is an offline protocol test whose claims are selected by test code. It is not an observed new model error, new Mainnet receipt, live Tatum lookup or proof of model improvement. The complete check.command run then passed 117/117 tests with no failures or skips, the ordinary and inherited independent-process walkthroughs, all evidence verifiers and source checks; see AGENT_VALIDATION.md.

## Reproduction

The ordinary source/protocol checks run without a model or account:

    bash start.command --check

To prepare a new private synthetic workspace explicitly:

    bash start.command --prepare-provider-fixture /private/tmp/my-ordinary-fixture --capture

Then an MCP client may launch /bin/bash with arguments [ABSOLUTE_PROJECT_PATH/start.command, --mcp, /private/tmp/my-ordinary-fixture, --provider-fixture]. A separate optional --codex launch uses the user's own model account and is not part of the offline checks. Its new native trial has not been authorized or executed here.

The --prepare command refuses a nonempty workspace. A restart or a new chat does not refresh timestamps or counters. The admitted test proof remains limited to five minutes, so delayed manual fixture sessions stop rather than inventing fresh approval. Real onboarding, fresh Free/sponsor checks and a separately approved live mode remain later gates.

## Self-review, decisions and remaining limits

The retained-corpus cap was the actual persistence bug; opening a new namespace after every pair would only hide it. The historical seeded trial cannot serve as ordinary onboarding, so it was preserved rather than silently widened. Shared ledgers, receipt proofs and workspace leases keep retained storage separate from new external permissions.

Two content recalls are a strict shared allowance. For a populated rules namespace plus a populated experience namespace, initial content reads can consume it; later writes/restarts may then stop at the cap. Complete-read checks are not bypassed and cached content is not relabelled as fresh. Any broader live traversal must be budgeted from its actual offline trace, or deliberately narrowed in the approved test plan; a model may not raise the allowance.

No generic real-account entry is enabled yet. Source preparation is not authorization to send a real key into these fixtures. The one known-case live allowance remains consumed. Eight additional candidate-only memories are still unproved; this increment adds zero Mainnet records. The old temporary Tatum key file is absent as expected after cleanup; existence-only inspection found the Walrus profile file present with mode 0600, without reading its contents. A future live plan cannot assume a Tatum key still exists locally.

## Sources and open questions

- ORDINARY_PROVIDER_OFFLINE_PROPOSAL_2026-11-06.md and coordinator approval in the master chat.
- CANDIDATE_SCOPE_AND_INVENTORY_2026-11-06.md and the unchanged original live-trial evidence.
- app/{agent-ordinary.mjs,agent-ordinary-fixture.mjs,agent-ordinary.test.mjs,check-agent-ordinary.mjs,agent-run.mjs,agent-provider.mjs,tatum.ts}.
- evidence/ordinary-provider-offline-2026-11-07/run.json and evidence/verify-ordinary-provider.mjs.
- Installed @mysten/sui 2.37.0, @mysten-incubation/memwal 0.1.9, @mysten/seal 1.5.1 and @protobuf-ts/runtime-rpc 2.11.1 sources, inspected locally.

Next: stage 3's frozen evaluation plan, then separately scoped real activation and operation allowances. Useful extra-memory content, fresh provider access and final judge packaging remain open. No publication, deployment, key copy, new provider/model call or extra spending occurred.
