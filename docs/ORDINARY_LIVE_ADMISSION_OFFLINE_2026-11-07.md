# Ordinary managed connection — offline boundary and prepared live evaluation

Date: 7 November 2026, Europe/Moscow.

## Goal

Finish stage 4A: prepare an executable, separately admitted real Tatum/Walrus evaluation for the existing free-task agent without reading real credentials, calling accounts/models/providers or publishing. This is not stage 4B execution or the stage 6 judge release.

## Starting assumptions

Stages 1–3 are accepted. The historical real replay trial is exhausted and remains unchanged. Current candidate inventory is two proved Mainnet memories. The ordinary intercepted assembly and persistent shared budgets already passed offline checks. The coordinator approved this distinct boundary in MASTER_STAGE3_REVIEW_2026-11-07.md; the human's current request authorizes offline checks and live preparation only, additional spending $0.

## Implementation and decisions

- `app/agent-managed.mjs`: private prepared context, exact public identity/deployment/source/plan binding, explicit fresh grant, one-time arming, migration of completed public receipt proofs, prior-ledger integrity, durable native reservations and narrowly owned temporary-key cleanup.
- Existing ordinary/provider/gate adapters now distinguish `live-ordinary-selected`, `offline-managed-admission-test` and the earlier fixture/replay contracts. A synthetic proof or context cannot enter the real path. Missing/stale/changed proof, identity, key, deployment or prior state stops. The exact managed context hash is rechecked before every SDK/Tatum admission, including changes during an active process. New runs never reset a consumed or uncertain old outcome.
- Existing installed MemWal/Seal and native generated Tatum client are reused. Real Tatum channel creation follows durable reservation, fixed Mainnet method/endpoint, no retries and existing transport bounds. This evaluation permits only the frozen selected transaction. Raw public transaction responses are privately retained before normalization for later oracle review; no headers/key are archived.
- Signed namespace inventory, health/version/config, Seal access, writes/polls and final inventory share the 64-request ledger. Neither account metadata nor final checks obtain an uncounted bypass. Only the existing gas-payer experience schema/source is writable under this grant; address-rule writes require a different allowance.
- The evaluation runner starts two separate app-server OS processes; each gets exactly one frozen user task and a genuinely fresh MCP process. It transfers no transcript. A native slot is durably reserved **before app-server startup**, since MCP may initialize during boot. Startup/access failure or unknown termination consumes that slot; it is not refunded. Paid/API-key fallback and global model configuration changes are absent.
- The normal empty-chat argument configuration has no initial task or prescribed first tool. However, `--codex` is explicitly refused under this two-turn evaluation grant. It would otherwise expose more model turns than authorized. Stage 6 must deliver and test its own bounded, understandable primary user/judge policy. Empty-chat arguments alone are not a tested live interactive product.
- The parent claims only the newly captured `tatum.key` in the exact prepared private directory. Cleanup checks directory/file ownership, mode, device/inode/birth identity, hardlinks and symlinks. Success, setup failure, expired proof and handled SIGINT/SIGTERM clean that file while preserving Walrus credentials, journals and counters. SIGKILL, power loss and deletion/replacement of the cleanup metadata cannot be caught; retained ownership metadata supports subsequent reviewed cleanup. A changed foreign path/file is refused rather than deleted.

## Adversarial review

Rejected: replacing a fixture transport with the network (would allow synthetic approval to reach accounts); extending the exhausted seed-bound replay trial (would mix scopes and historical proof); unrestricted TUI under a two-turn grant (cannot enforce native allowance); forcing a model error or a required save route (would contradict the free-task product). Chosen: the separately admitted bounded runner and unchanged default offline launcher. The coordinator accepted this scope clarification on 7 November.

Remaining trade-offs: a five-minute fresh-proof window may expire during model/Seal/poll latency; warm-start or extra verification may consume recalls before the second task; a correct first answer may create no memory. All are recorded outcomes/stops, not reasons to renew timestamps, repeat inference or enlarge budgets. The two-task hypothesis belongs to the user/evaluation; it is not an asserted spontaneous model error or proof of general learning.

## Offline evidence and checks

The saved `evidence/ordinary-managed-offline-2026-11-07/run.json` records two independent actual MCP processes with fabricated wire replies: two initial synthetic records, one verified synthetic mismatch and linked resolution, four final synthetic records. Counters: **2 simulated Tatum attempts / 2 writes / 2 content recalls / 50 guarded requests**, stopped=null. Preflight and final inventory are included. Original synthetic prior ledger is byte-unchanged. Sources remain `fixture`; storage is `walrus-fixture`. These IDs are not Mainnet receipts.

Thirteen managed-boundary tests cover rejection before credential/factory use where determinable, wrong profile/key, frozen source, inherited receipt integrity, deployment preflight, independent processes, durable reservations across processes, bounded fake app-server orchestration (including quota stop), cleanup and restricted transaction scope. The orchestration test uses a local fake `codex` executable; it never runs the account CLI or performs inference. An additional Tatum regression checks raw-response observation, independent gas arithmetic and no retry if archival fails. The full integrated `bash start.command --check` completed: 131/131 tests, zero failures/skips, all independent MCP walkthroughs, saved-evidence verifiers and source verification. Log: /private/tmp/recall-managed-full-context-final.log. Documentation-only updates afterwards receive source and diff checks.

Verified product/source revision: `e1ffa21f8c80de10d0ad31173f785a7f45c47e80` (local only). The saved protocol evidence is pinned to its Git bytes; subsequent documentation/pin commits do not claim another run.

## Frozen live plan — prepared, not authorized or executed

Public plan: `evidence/ordinary-managed-offline-2026-11-07/live-plan.json`.

- Canonical plan hash: `60c0d7bb6f269e607688d998bfa8cbf2273b37c27d9c8a75501e3858aa28a02c`.
- Plan-file byte SHA-256: `4f74cd6f7cb451dfb95b20f9436513f4b305807ddd246f9dc35c4057d1541756`.
- Prepared private context hash: `040e3d26d3fffdcca6aacad9645a8e9142d2c51ff44a7d252a02b51b0be595f9`.
- Private preparation metadata: `/private/tmp/recall-agent-ordinary-ready-VRtCF3/prepared.json`; stable pointer `/private/tmp/recall-agent-ordinary-ready-current.json`. Contains paths/hashes only, no credentials.
- Prepared workspace: `/private/tmp/recall-agent-ordinary-ready-VRtCF3/workspace`. Real profile/key have not been opened. Only old public manifest/ledger/receipt metadata was compared to the archived successful trial; it matches.

Exact executable command, **do not run until the separate live grant is approved and filled**:

```sh
/Users/sirquickflip/.hermes/node/bin/node --disable-warning=ExperimentalWarning "/Users/sirquickflip/Documents/ChatGPT/Хакатоны/work/recall-agent/app/agent-managed-entry.mjs" --evaluate /private/tmp/recall-agent-ordinary-ready-VRtCF3/workspace
```

The earlier prepared `0QcGE3` snapshot and its plan/context hashes were withdrawn before authorization after the per-operation context-binding fix; its source freeze now rejects it. No key or grant existed there. Only the current `VRtCF3` snapshot and hashes above are candidates for subsequent approval. The coordinator's earlier acceptance covered the pre-hardening revision; the final changed admission is presented for a repeat check.

No `managed-grant.json` exists; only an unusable `approval-template.json` with empty observation fields is prepared. No key has been captured. The exact existing Tatum Mainnet key destination is recorded in the private connection/preparation metadata. Action-time human approval must cover that transfer/use/cleanup and the bounded run. Fresh observed Tatum Free/account/key proof and official managed sponsorship must then be supplied without fabricating a timestamp. Existing Walrus profile is used in place, not copied.

Limits: gpt-5.6-luna, maximum 2 native turns in 2 fresh conversations, 12 tools/turn, 120 seconds/turn; 2 Tatum attempts, at most 10 digests/batch but this plan restricts to its single selected transaction, at most 4 included credits; 2 shared Walrus writes / 2 shared content recalls / 64 service requests / 8 polls per job; fresh proof at most 300 seconds; additional spend **$0**. No retries, prompt tuning, upgrade, paid fallback, deployment or publication. Any access/quota/timeout/unknown outcome stops. No live operation was used to write or verify this document.

## Sources

- ROADMAP.md, PROJECT_STATE.md, MASTER_STAGE3_REVIEW_2026-11-07.md and ORDINARY_LIVE_ADMISSION_PROPOSAL_2026-11-07.md.
- Existing provider/gate/SDK source, new managed implementation and tests, frozen stage 3 tasks/oracle and historical real-trial receipt evidence.
- [Official app-server protocol](https://learn.chatgpt.com/docs/app-server), consulted 7 November to cross-check thread/turn lifecycle. The existing tested local ChatGPT sign-in route is retained; no token-sharing migration or new auth flow is introduced. A catalog entry alone does not establish model entitlement; the bounded actual turn must prove access.

## Open questions and next step

The coordinator independently reviews this offline boundary and asks the human for exact action-time credential/live authorization. Then stage 4B may execute once and retain every outcome. Actual current account access, sponsorship, model entitlement and live result are **not** confirmed by these offline checks. Ten useful qualifying memories and the tested primary judge installation remain stages 5 and 6. No new multiwave storage framework or fabricated errors are introduced.
