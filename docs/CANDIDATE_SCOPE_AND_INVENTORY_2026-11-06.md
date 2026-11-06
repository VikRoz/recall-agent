# Candidate scope and Mainnet memory reconciliation

Date: 6 November 2026. Stage 1 of ROADMAP. Offline analysis and receipt verification only.

## Goal and assumptions

Freeze a narrow useful Sui agent scope and reconcile the existing memory evidence before ordinary live integration. Candidate source starts at a9c075e; the previous fallback is unchanged. The account, namespaces and completed receipts in the latest frozen live trial are evidence, while registration, fresh account visibility and available quotas are not inferred from old receipts.

## Supported candidate scope

The primary user asks, in ordinary words, what happened in selected Sui Mainnet transactions involving a wallet, how its balance changed and who paid gas. The independent tools retrieve bounded transaction evidence, calculate exact base-unit amounts, check a proposed gas-payer claim, propose user-confirmed address context and export the original CSV. A user can ask for clarification, a report, verification or export in any justified order. Neither an error nor a memory write is required to complete a task.

The candidate will use existing Tatum transaction reads and the official managed Walrus SDK/account connection. Automatic experience capture remains opt-in and limited to proved technical errors or structured claims, with a verified linked resolution. A fresh conversation reuses the same logical project. Arbitrary prose is not automatically certified.

Wallet/period lookup currently searches a bounded local synthetic/saved index only. In the real-data entry point it must remain explicitly labelled as such or be absent. For an unfamiliar wallet with no known transaction references, the agent asks for transaction links; it must not claim that an empty subset proves inactivity. Full wallet-history discovery, arbitrary address-graph analysis, token-contract upgrade analysis, general Move interpretation, transfers and trading are excluded. No hosted chat, new model provider or payment feature is needed for this vertical slice.

## Inventory result

The machine-readable inventory is evidence/candidate-readiness-2026-11-06/inventory.json. It pins the bytes of the retained source evidence, checks record hashes, correction lineage and duplicate record/blob IDs, and separates three groups:

| Group | Distinct records | Treatment |
| --- | ---: | --- |
| Current free-task agent | 2 | Completed Mainnet receipts in the candidate experience namespace: actual prior schema rejection and native verified resolution |
| Inherited activity pilot/model run | 4 | Valid historical address rules under the same recorded owner, but two different earlier project namespaces; excluded from the current candidate tally |
| Archived checkpoint-projection demo | 10 | Historical records with obsolete product/schema, no submitted account/delegate/namespace binding in that archive; excluded |

The candidate's known identity is account 0x91095bbbd2f71cec695bcc53e1e4bb0b2b6426667e2c4ad63c0f84943d48fe85 and public delegate c4070b96246bd6ff35b0edec449df8d7a4ab57a3a0b36ab4331b106a38088ce9, with logical workspace agent-3d4a96a8-f0af-4c77-b02f-d5801836490b. No secret profile was read or copied for this reconciliation. The current pair was read through real Walrus in the completed trial; this stage made no new content or inventory request.

Under the conservative current-candidate evidence policy, the tally is **2/10, gap 8**. This is not a claim that the account holds only two memories, that the rules require one physical namespace, or that all historical records are automatically ineligible. The old projection archive is explicitly excluded, not newly re-attested. Additional writes remain unauthorized; do not generate eight invented failures to fill the gap.

## Self-review and contract issue found

The tempting shortcut is to sum all sixteen archived records or relabel replay as fresh Tatum data. That would hide incompatible scopes. Reuse of historical integration code is appropriate; unqualified reuse of its success claim is not.

A real remaining blocker is in the code, not just the count: validateExperienceRows and LocalExperienceStore cap the entire persistent experience corpus at two records. The shared writer also caps each run at two writes. Those are different limits, currently conflated. After one error/resolution pair, a persistent project cannot accumulate another pair even in a separately authorized future run. The existing live initializer additionally requires an empty namespace and an exact preselected failure ID; it is a trial harness, not general onboarding.

Recommended next design: separate bounded retained corpus capacity from unchanged per-run operations, preserve the old trial contract and add an explicit ordinary real-provider assembly. The genuinely different alternative is the preserved fallback release. New namespaces for every run or removing guards are rejected because they break cross-chat continuity or the cost boundary. The exact offline contract proposal is in docs/ORDINARY_PROVIDER_OFFLINE_PROPOSAL_2026-11-06.md; no new admission policy is implemented by this stage.

## Validation and decisions

Run evidence/verify-candidate-readiness.mjs with the local Node runtime: it validates the current pair against the frozen real-trial JSON and the four inherited address rules against their original snapshots, checks all sixteen blob/record identifiers are distinct, and refuses to count the excluded groups. The archived old ten are exclusion metadata only, not a fresh Mainnet verification.

Stage 1 completion means the scope, candidate-only count, exclusions and capacity issue are explicit. It does not mean ten memories, live discovery or general judge onboarding are complete. No source integration, source evidence, old budget, account or fallback release is changed by this analysis.

## Sources and open questions

- Local README.md, ROADMAP.md, PROJECT_STATE.md and the 6 November requirements audit.
- evidence/agent-live-trial-2026-11-06/run.json and its existing verifier.
- evidence/activity-mainnet-2026-11-05/{first-result,second-result,pilot-result}.json.
- evidence/activity-model-2026-11-05/run.json.
- Archived outputs/Recall-Activity-Judge-2026-11-05/Recall-Lab-Judge/evidence/mainnet-memories.json, retained only as hashed excluded metadata.
- app/{agent-live.mjs,agent-experience.ts,agent-provider.mjs,tatum.ts,agent-activity-index.ts} and src/memory.ts.

Open: final count policy if historical project records are later substantiated, useful record contents needed to reach ten, ordinary-run approval/schema design, fresh Tatum Free allowance and sponsorship, and clean installation. None is silently assumed completed.
