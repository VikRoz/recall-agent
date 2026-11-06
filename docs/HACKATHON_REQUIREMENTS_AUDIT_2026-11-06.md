# Total Recall — requirements and project gap audit

Date: 6 November 2026.
Scope: read-only review of current public rules, rendered submission form and local project evidence. No application was submitted. No inference, Tatum/Walrus request, write, account change, payment or deployment was performed.

## Goal

Check the planned Sui agent against the hackathon before further development, identify missing deliverables and distinguish entry requirements from optional prizes and our own evaluation standards.

## Starting assumptions

- Candidate: the experimental free-task agent in `VikRoz/recall-agent`, local source a9c075e; the original `VikRoz/recall-lab` v1.0.0 stays unchanged as the fallback.
- The current default launcher is offline. Its saved Mainnet dataset contains two selected historical transactions, not live wallet-history discovery.
- Latest real trial: one native Luna turn, two Walrus Mainnet records, two content recalls, zero Tatum calls. The initial error came from an earlier actual model observation.
- Historical evidence and published fallback materials do not automatically establish readiness of the new candidate.
- Existing operation allowances are consumed. This audit grants no new live allowance.

## Published entry requirements

The current event page [S2], submission-form rules [S2] and standalone rules [S1] agree on these essentials:

| Requirement | Implication |
| --- | --- |
| Deadline: 10 November 2026, 17:00 UTC | 20:00 Moscow; approximately four calendar days from this audit date |
| Mainnet Walrus Memory with at least 10 memories | Completed storage, rather than queued jobs or local fixtures |
| Relevant onchain data through Tatum RPC | Our Sui product should retain a working Tatum path |
| Public repository and working demo | A local development checkout alone is insufficient |
| Published article | Explain product, both integrations and change through memory |
| Demo video of 2–3 minutes | Show the delivered revision |
| Original/authorized work materially advanced during the event | Existing code is allowed with relevant new progress |

Scoring: integration 30%, technical quality 30%, creativity 20%, presentation 20% [S1].
Track fit: Smart Agents for Real Life; cross-session task continuity is explicitly within its description [S1].

Neither a particular LLM provider nor statistical model superiority, hosted chat, browser login, custom UI, Docker or simultaneous support for several model clients appears as an explicit entry requirement. This is an absence in the published checklist, not a guarantee about judge preferences. AI Builder is optional [S2].

## Submission form inspected

Opened the actual submission dialog and its Event Rules without entering any data. Required fields: email, Discord, LinkedIn, discovery source, first-Web3 answer, Tatum ID, Sui address, Walrus Account ID, public delegate key (MEMWAL_AGENT_ID), project description, video, GitHub, Walrus feedback and AI Builder feedback. The latter explicitly allows saying it was not used. Optional: Telegram, referring community, extra documentation, specific Memory friction and social links. The article can be linked through Additional documentation and the README.

Eligibility includes adult status, restricted-jurisdiction exclusions and one submission per person [S1]. The applicant's eligibility was not inferred from language, timezone or address. Do not submit both candidate and fallback as separate personal entries. No private delegate/API key belongs in this form.

## Candidate assessment from local evidence

| Area | Evidence checked | Remaining gap |
| --- | --- | --- |
| Real portable experience | `evidence/agent-live-trial-2026-11-06/run.json`: two completed records, fresh native process, linked resolution | General launch is not yet packaged; approved trial is exhausted |
| Real Sui/Tatum | Inherited activity evidence records successful real provider transactions | New agent's latest trial uses replay; its launcher has no external discovery provider |
| Ten qualifying memories | Two records are proved in the new agent workspace; older activity artifacts contain four historical address-rule receipts | No unified ten-record inventory for this submitted agent/delegate was established |
| Reproduction | 103 offline tests and scoped native live evidence recorded | Clean judge installation and independent real-account onboarding still pending |
| Public candidate | PROJECT_STATE describes a private development repository | Publication and final release not verified in this audit |
| Article/video/site | Existing versions describe earlier iterations | Update only after choosing the submitted revision and completing its evidence |

The literal rules do not specify whether unrelated namespaces or historical delegates can be summed. Since the form identifies a particular Memory agent, the conservative submission approach is a documented inventory of ten useful records associated with the submitted agent. This is our evidence policy, not a newly invented published rule. Do not assert “eight more required” or combine older counts until identity, relevance and uniqueness have been reconciled offline and, if authorized later, against actual storage.

The inherited `docs/SUBMISSION.md` still describes the fallback activity project, says four records/six remaining and points to older public materials. It is not the final candidate checklist. It was deliberately left unchanged in this read-only audit to preserve the distinction between historical and candidate evidence.

## Adversarial review of the next development plan

Initial proposal: demonstrate several controlled failures and memory recovery, then package the agent.

Strongest objections:
1. A convincing memory experiment with cached transactions can leave Tatum largely absent from the delivered agent. Integration and technical quality together account for most published scoring.
2. Reaching ten arbitrary writes satisfies a superficial count while showing little product value. Real useful failures, corrections and confirmed address context should explain why each record exists.
3. Forced first calls, scripted nextTool choices or deliberately weakened validation could make the video persuasive while contradicting the free-task product.
4. More live experiments can consume allowances and installation time without producing a reproducible package before the deadline.
5. Old articles, repo links and receipts could accidentally be presented as validation of the new revision.

Alternative: submit the already working fallback and stop experimental changes. This is the smallest delivery risk but gives up the new free-task experience-memory result. It remains available.

Recommended candidate path, pending approval where contracts or external operations change:
- Keep the free-task tools and real verifier. Use bounded, explicitly labelled fault conditions only in evaluation; never prescribe the model's wrong choice or count an invented model failure as observed.
- Preserve a genuinely usable Tatum adapter for supported Sui questions. Start from existing provider code rather than build broad contract intelligence or unrestricted history search.
- Prepare one frozen evidence matrix: task, data provenance, actual attempted call, verified failure, stored record, fresh-chat first choice and resolution. Report negative outcomes too. A no-memory control strengthens attribution but is our evaluation choice, not a formal entry requirement.
- Reconcile the ten-memory inventory before deciding how many additional useful records are necessary. Do not reset consumed budgets or create writes solely to pad the count.
- Package, clean-install and capture one coherent delivered revision. Align repo, README, article, video and form with that revision. Keep unsupported capabilities out of claims.
- Use the fallback if the candidate cannot pass clean reproduction with its actual integrations in time.

No architecture, source, operation caps or ROADMAP was changed by this recommendation. Implementation and any new provider/model use remain separate actions.

## Rule discrepancies and unresolved details

- The standalone page still calls the third bonus “Mystery Bounty”; the current event and rendered legal modal identify Agent Payments (x402/MPP settled on Sui). These are optional; payments should not be added to our zero-spend scope.
- Both rules versions contain a generic introductory sentence about a feedback/form platform, conflicting with the three explicit tracks and checklist. This appears to be reused template wording (inference). We should follow the explicit agent track, not build an unrelated forms product; eligibility is ultimately the organizer's decision.
- No maximum team size, explicit policy on AI-assisted coding, mandatory language or detailed treatment of injected fault demonstrations was found. Do not import the earlier Tatum event's 1–3 member limit into this event.
- The format of mandatory demo hosting is not specified: a local MCP/CLI package is not explicitly forbidden, but clean reproduction and the video remain necessary.
- Deadline extension and Discord-only announcements were not checked; no extension is assumed.
- Entrant residency/eligibility and final declarations remain applicant-owned.

## Organizer sanity check

The event is linked from Tatum's own domain [S3] and listed on Walrus Sessions [S4], with a real submission dialog and partner support Discord links. A previous joint event has an official Tatum page [S5]. This supports organizer identity and prior activity; it does not independently prove prize payments. No winner-payment transaction or recipient attestation was verified in this bounded review. Results are scheduled for 17 November [S1]; a fixed prize-transfer date was not established. No payment was requested to inspect rules or submit the empty form.

## Decisions recorded

- Requirements audit only; no new live operations or publication.
- Preserve both working repositories and their budgets.
- Candidate readiness must be judged on its own revision and evidence.
- Recommend retaining Tatum, reconciling ten useful Mainnet records, then clean installation and aligned submission materials.
- Do not add AI Builder, payments, hosted authentication or multi-client expansion solely for presumed mandatory rules.

## Sources

All web sources checked on 6 November 2026.
- [S1 — Standalone Event Rules](https://thewalrussessions.wal.app/tatum-total-recall/index.html).
- [S2 — Current event, actual submission dialog and Event Rules modal](https://recall-tatum-walrus.vercel.app/). Rendered form inspected read-only; no values entered or submitted.
- [S3 — Tatum official event link](https://tatum.io/hackathon/total-recall).
- [S4 — Walrus Sessions event listing](https://thewalrussessions.wal.app/).
- [S5 — Earlier joint Tatum/Walrus event, historical only](https://tatum.io/tatum-x-walrus-hackathon).
- Local: README.md, PROJECT_STATE.md, ROADMAP.md, docs/SUBMISSION.md, docs/AGENT_LIVE_TRIAL_2026-11-06.md, evidence/agent-live-trial-2026-11-06/run.json, inherited activity-mainnet-2026-11-05 and activity-model-2026-11-05 artifacts.

