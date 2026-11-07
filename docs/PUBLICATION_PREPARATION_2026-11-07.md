# Delivery and publication preparation

Date: 7 November 2026. Read-only remote review and local material preparation; no new provider/model call or publication.

## Goal and assumptions

Prepare one consistent candidate source, judge archive, receipt inventory, English article and static site. The coordinator accepted the completed primary flow and ten-record inventory while retaining the extended harness STOPPED. Runtime e72bdee is frozen; the fallback remains untouched. Public account IDs and transaction proofs are intended evidence; private keys and auth profiles are excluded.

## Findings and sources

- GitHub repository metadata shows `VikRoz/recall-agent` private, main at `32405ecf3c550a73c9386caa3562b41a53160c0c`. Read-only remote heads/tags advertised only that main; it is reachable locally. Releases returned an empty list. Pages GET returned404, so deployment is not attested. No settings were changed.
- [Official Tatum event page](https://tatum.io/hackathon/total-recall) links the [event and requirements](https://recall-tatum-walrus.vercel.app/). Point-check on7 November confirms10 November2026,17:00UTC deadline. Published requirements include relevant Tatum use, at least10 Walrus Mainnet memories, working demo/public source, article and2–3 minute video. Existing detailed audit remains the requirements record.
- [Official Codex CLI guide](https://developers.openai.com/codex/cli) describes installation and own ChatGPT sign-in. Local read-only version checks: Node v22.23.1, Codex0.153.0. No login or model call was run for this review.
- Local browser preview checked index/article at desktop and390px width: ten saved rows rendered; visible text was English; root index width390 at viewport390. The article width391 was within rounding tolerance. Default viewport restored. The site only fetches saved local evidence.
- A bounded entire-reachable-history scan covers local branches/tags/remote-tracking refs and HEAD, reconciled to the advertised remote main. Three potential assigned-credential matches were reviewed in test code: explicit synthetic/canary strings of24/20 characters, incompatible with actual delegate/Tatum credential formats. Two further matches are explicit public-synthetic test values. No plaintext was printed. The sole PNG was manually viewed: public transaction/report/blob/rule IDs only; no visible credential. Final post-freeze counts and redacted findings belong in the delivery packet. Pattern scanning is not proof against every possible secret format.

## Decisions

Use the existing GitHub repository, a dependency-included ZIP and GitHub Pages. Reject new hosting/blog services and runtime rewrites: they introduce account/setup risk without closing the delivery gaps. Retain original Russian native output in source evidence; the English site explains it without presenting a translation as the original response. Old failed traces are retained as evidence, not displayed as current success.

Planned, not yet published:

- source: https://github.com/VikRoz/recall-agent
- release tag: `agent-demo-v1.0.0`, asset `Recall-Agent.zip`
- site: https://vikroz.github.io/recall-agent/
- article: https://vikroz.github.io/recall-agent/blog.html

The exact eventual approval scope is: private→public visibility; ordinary nonforce push of the frozen main; create that tag/release with the exact checked ZIP; configure Pages from the chosen static publication branch root. No upstream/fallback change, force-push, history rewrite, model/provider request, billing or submission. The review packet must bind the source commit, ZIP hash and site tree before approval.

## Open questions

Clean-package acceptance and final source/site hashes must be recorded outside the source tree to avoid self-referential manifests. Public mutation permission remains pending. The author still records the current walkthrough and owns applicant declarations/final submission. Other MCP clients and general model-learning benefit remain unverified for this candidate.
