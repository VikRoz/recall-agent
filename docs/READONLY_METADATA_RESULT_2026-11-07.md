# Actual read-only SDK and stdio diagnostic

Date: 7 November 2026.

## Goal and initial assumptions

Check current initialization and signed metadata access after the stopped ordinary evaluation, without another model turn, Tatum request, plaintext recall or write. The historical application/native ledgers stay stopped and unchanged. The coordinator operated the separately authorized one-shot command; this implementation chat only checked its saved nonsecret outputs offline.

## Observed result

Source revision: `7457b304c59a2f2c4fca98e81305d220f6adedea`. Context SHA-256: `0ed22fc8025ec5d1127f4f3354f6353adea70cbb409add816b0a0a8f56068e5e`.

One actual launch completed with `CURRENT_METADATA_DIAGNOSTIC_STARTUP_COMPLETED`: five bounded relayer requests, all three expected blob IDs present, durable counter finished with no stop. A separate stdio client initialized and returned the cached result with a matching SHA-256. The account profile was used in place. New model calls, Tatum requests, content recalls, writes, Seal calls and secret copies: zero. Additional spend: **$0**. The eight-request diagnostic allowance is consumed, not reusable.

The three IDs match a provenance-preserving union of the prior successful run's two completed receipts and the stopped ordinary run's one completed receipt. Each payload hash, namespace, job, operation ID and done intent matches its original ledger. No merged replacement ledger is fabricated. Five retained application/configuration/native/grant files were hashed again offline and matched their preparation snapshot; the old temporary Tatum key remained absent.

## Meaning and limits

Current SDK initialization, signed metadata and this distinct diagnostic stdio endpoint work. Metadata status strings are deliberately **not interpreted**. This establishes neither plaintext readability of the newest record nor completed cross-chat recall/resolution in the ordinary agent. Done storage evidence comes from the existing receipts, not a metadata status.

The old startup failure's underlying cause remains unknown. Current success does not retrospectively prove an outage, an HTTP status or a health predicate failure. No application/native counter has been refunded, no stopped run resumed, and no new interactive judge launcher enabled.

## Sources and reproducibility

- `evidence/readonly-metadata-live-2026-11-07/run.json`: sanitized actual result, counter, stdio hash, public identity and historical source hashes.
- `evidence/verify-readonly-metadata-live.mjs`: offline binding to the original three receipts and historical Git bytes.
- `evidence/ordinary-live-2026-11-07/run.json` and `evidence/agent-live-trial-2026-11-06/run.json`: unchanged original provenance and negative outcomes.
- `docs/READONLY_METADATA_PREPARATION_2026-11-07.md`: historical scope and limits; `docs/ORDINARY_LIVE_RESULT_2026-11-07.md`: stopped application result.
- Coordinator's independently checked snapshot: workspace-level `docs/TOTAL_RECALL_METADATA_RESULT_2026-11-07.json`. Private credential paths and raw HTTP bodies are excluded from the public artifact.

Run `node --disable-warning=ExperimentalWarning evidence/verify-readonly-metadata-live.mjs` locally. This reads saved evidence and Git bytes only. The preceding complete integrated offline acceptance passed **149/149** tests, zero failures/skips; its diagnostic status-shape result is historical and separate from this actual command.

## Decisions and open questions

Preserve the stopped trial and consumed diagnostic as evidence. Propose a separately admitted, single fresh conversation using the frozen second task and the existing three-record baseline. Do not repeat the first hypothesis or spend another diagnostic allowance. New-record plaintext readback, optional linked resolution and clean judge launch remain open. No publication or deployment occurred.
