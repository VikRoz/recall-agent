# Architecture

Updated 6 November 2026.

## User flow

Selected wallet and transactions → model calls MCP tools → Tatum returns Sui facts → code builds the report → user confirms an address rule → Walrus stores it → a fresh conversation retrieves the current rules → code applies the active correction and exports CSV.

## Modules

| Component | Responsibility |
| --- | --- |
| `app/activity.ts` | Transaction normalization, scoped rules, correction/effective-date checks, exact reports and safe CSV |
| `app/activity-session.ts` | Prepare, refresh, propose, confirm-save and export; no model arithmetic |
| `app/tatum.ts` | Native Sui transaction batches over Tatum gRPC; explicit channel lifecycle, bounded responses and no retries |
| `app/activity-memory.ts` | Complete bounded inventory, revision checks, content-hash readback and receipt-only write journal |
| `app/activity-live.ts` | Account-bound plan, durable operation caps, restricted transports and failure stops |
| `app/walrus.mjs` | Private isolated profile validation and official MemWal SDK connection |
| `app/activity-mcp.mjs` | Five MCP tools; explicit live, local fixture and injected-provider fixture modes |
| `app/activity-codex.mjs`, `app/claude-config.mjs` | Client launch/configuration; no model API proxy or embedded account |
| `app/activity-resume.ts` | One approved continuation boundary, fresh billing evidence, same key and unchanged counters |

The official Walrus login helper signs into the judge's account. The project tools use the MemWal SDK to store typed address rules. Automatic broad memory saving is off during the run.

## Five tools

- `prepare_report(network, wallet, transactions)` retrieves selected facts and current context.
- `refresh_report(reportId)` rereads current context without another transaction fetch.
- `propose_address_rule(...)` returns the complete preview and current correction parent.
- `save_address_rule(proposalId)` persists that exact preview after user confirmation and client tool approval.
- `export_report(reportId)` returns a code-generated CSV based on current context.

## Scope and correctness

The report engine supports at most ten supplied digests per report. The live judge plan binds exactly two distinct Mainnet digests. Rules are scoped by owner, project, network, subject wallet and explained address. Effective dates preserve historical interpretations. Missing parents, forks, stale previews or incomplete memory stop application of the rule.

A semantic top-k result cannot establish that all corrections have been found. The service-indexed inventory is paged, bounded to twenty records and checked before/after recall. A private receipt journal contains IDs and hashes, not plaintext memory. A fresh client obtains the record contents from Walrus and checks expected hashes.

Token values are signed integer base units grouped by canonical coin type. Gas is shown alongside original net movement. Unknown decimals are not guessed. Complex PTBs remain unparsed when the available evidence does not establish transfer paths. Address ownership is never inferred from public activity.

## Limits and failure handling

Each live run permits two Tatum calls/four included credits, two sponsored writes, two content recalls, 64 guarded SDK fetch attempts and eight status polls per job. Attempts are reserved before transport and persist across processes. There is no paid fallback or resubmit-for-success path.

Free-account evidence must be at most five minutes old before each Tatum request. Rechecking the same account does not change counters. Uncertain writes, locks or stopped runs are retained for inspection. The explicit continuation only accepts a settled first write before a second transaction read and requires the original account-bound key hash.

The website is static evidence and onboarding. It has no provider backend or model credentials. A hosted mass-user app, shared team contexts, full wallet-history discovery and fiat accounting are outside this release.
