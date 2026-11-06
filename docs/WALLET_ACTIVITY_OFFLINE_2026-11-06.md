# Wallet activity lookup — 6 November 2026

## Goal and premises

Support ordinary wallet-activity requests without preselected transaction digests, while preserving autonomous tool choice and the fallback release. The user approved the offline lookup increment. Existing live limits remain 2/2/2; this increment performs no model/provider operations.

## Implemented contract

find_wallet_activity is an independent read-only tool with network, wallet, optional UTC from/to bounds, a page limit of 1–10 and a continuation cursor. Bounds are start-inclusive and end-exclusive. Results contain transaction references and observed sender/gas-payer/balance-change roles, not inferred ownership or direct counterparties. They expose dataset ID, matching record count, returned count, next page and explicit incomplete wallet-history coverage. Empty results concern only this dataset.

Default data is synthetic. The optional --saved mode loads the two distinct normalized transaction snapshots from the verified prior model-run artifact, checks its pinned SHA-256 and marks every transaction as replay. Reads never request the provider. Existing report and CSV functions are reused; replay provenance is visible in both. Technical experience also has distinct replay applicability. The recorded time bounds are not presented as a complete history interval.

Dataset IDs bind cursors and workspaces. A cursor is a pagination bookmark, not authorization. Query or dataset changes invalidate it. Existing synthetic workspaces remain readable; they cannot be silently switched to saved data. The dataset is cloned internally to prevent caller mutation. There is no lookup API key, live endpoint or history pagination loop.

## Self-review and alternatives

Known-digest reporting alone did not meet the user's activity request. Calling a pair of snapshots a history would be incorrect. Adding every explorer feature before a basic free-task path works would expand cost and verification scope. The chosen bounded lookup adapter adds the missing capability while retaining existing arithmetic and storage. Its limitation is explicit: live history discovery and token-version comparison remain absent.

## Validation

Seven new tests cover observed wallet roles, half-open periods, validation, query/dataset-bound pagination, immutability, empty results, pinned replay data, report/CSV provenance, workspace isolation, recoverable local query errors and independent MCP processes launched through start.command. Lookup and export do not force a memory write. The complete suite passed: 65 tests, independent-process protocol checks, saved-evidence verification and source-manifest verification. Shell syntax and diff whitespace checks also passed.

No real model run was performed on this new tool. The prior native-model smoke is evidence only for its earlier baseline. Synthetic harness choices do not prove autonomous model reasoning or useful memory.

## Decisions and open work

Keep lookup independent of report preparation and startup. Preserve the original fallback repo. Next: a bounded natural-language model probe on the saved dataset; research a real history-discovery provider's coverage, prices and pagination before activating it. Do not silently increase limits if discovery and details exceed the live cap. Links between addresses require evidenced semantics; contract changes require additional historical data.

## Sources

User's wallet/relationship/token task examples and subsequent approval; app/tatum.ts; app/agent-activity-index.ts; app/agent-mcp.mjs; app/agent-session.ts; app/agent-activity-index.test.mjs; evidence/activity-model-2026-11-05/run.json. Local source inspection only; no assumptions about unverified external endpoints.

Additional spend $0. Model, Tatum and Walrus calls for this increment: 0. No deployment or Mainnet writes.
