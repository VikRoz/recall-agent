# Partial live result and bounded completion proposal

Date: 7 November 2026. Proposal only; no new activation or external operation.

## Goal and assumptions

Preserve the actual 12bd1c2/pHQ6kI result, explain its deadline failure and select a coherent path to ten relevant memories, two completed native questions and original CSV delivery. Additional spend remains $0. A new execution cannot reuse the stopped run, its time, key or unused counters. The master is the sole real operator; the user records the final video.

## Actual result and evidence

Tatum returned all seven whole transactions. The only model-selected `prepare_report` remained in progress while the existing synchronous capture hook serially stored observations. Four new jobs completed before the 120-second native deadline; no fifth intent exists, no pending/uncertain job exists. Ledger: Tatum1/write4/read5/SDK45. One native slot is consumed; no second chat, final independent reader or CSV ran. Parent and child confirm key absence, all three core origins and the earlier pRaby9 stop remain unchanged. Additional spend $0, retries0.

The corpus has seven completed receipts: three originals plus four new facts for `2it6...`, `9id3...`, `BjV2...` and `399aud...`. The three missing facts are `3o43bsVXvFpRthgSgkJzugZiR9UGPYWJsFKACXfkMho7`, `CvJ6jx8Knu6jeGdZZb2F3XyfBRazqKJJmKchywckBMAL` and `6zSQhBMT8ro6eAs4UvWKqfcxSd9Rgjz5nR9m85bBSsEw`.

No complete new plaintext snapshot was archived by the unfinished tool. With coordinator approval, a single finite offline enumeration recovered the exact four payloads:18,526 possible millisecond timestamps per each of seven archived proofs, within the measured latest-Tatum-response→first-done window. Each accepted payload uniquely matches both the full canonical SHA-256 and operation key of a real done receipt. Exact observation times are18:45:50.357Z/.358Z. This is labelled `reconstructed-by-exact-receipt-hash`, **not signed readback**. No approximate payload or timestamp is accepted. A future activation must signed-read all seven exact payloads and receipt bindings before tools. No separate diagnostic read is needed if this startup succeeds.

## Measured timing and cause

| Event | UTC | Elapsed from native reservation |
|---|---|---:|
| Actual Free observation |18:44:43.543|−39.884s|
| Native reservation |18:45:23.427|0|
| Model starts prepare_report |18:45:48.625|25.198s|
| Last of seven Tatum proofs archived |18:45:49.206|25.779s|
| First job done,3 polls |18:46:07.731|44.304s|
| Second job done,3 polls |18:46:27.125|63.698s|
| Third job done,3 polls |18:46:47.181|83.754s|
| Fourth job done,4 polls |18:47:22.105|118.678s|
| Parent finished after deadline cleanup |18:47:23.538|120.111s|

Receipt intervals were18.525/19.394/20.056/34.924 seconds from the final proof/previous receipt. Existing poll waits alone consumed at least15+15+15+30=75 seconds. Boot/selection consumed25.198 seconds before the tool. All7 serial writes could not reasonably finish, then leave generation time, inside120 seconds at these observed rates. This is a synchronous capture and rehearsal sizing failure, not evidence of bad reasoning or unavailable Tatum data. The earlier synthetic185-request check sized request counts, not elapsed time. It never established a live timing guarantee.

## Compared alternatives

1. **Explicit preparation through the same public MCP, then two fresh model questions — preferred.** A real user requests the selected-case data preparation once through `prepare_report`, with the same account, fresh Tatum and existing automatic fact hook. Seven preexisting exact records are read first. Only the three missing whole facts may be added; four existing fact observations are reused by semantic identity, never rewritten. The tool timeout follows the remaining shared provider deadline rather than the model's120-second envelope or an accidental60-second MCP default. Only after three done receipts and the complete ten-record content check does the wrapper open two independent model sessions. Their questions retain their ordinary wording and no forced tool route. The original requested CSV/path/hash and final independent reader remain acceptance conditions.
2. **Raise the native timeout.** Rejected for this increment: enlarges an approved boundary and leaves storage latency inside generation. It cannot repair unbounded wait or guarantee completion under the existing240-second total. Increasing limits would need a new explicit review.
3. **Ask the next native turn to create just three missing notes.** Technically simpler, but the observed intervals suggest about60–105 seconds of storage plus roughly25 seconds of boot/selection and final generation. It can again exceed120 seconds. Do not spend another allowance merely hoping for faster relayer status.
4. **Concurrent/background storage or a persistent staging framework.** Could address general multi-record latency, but introduces concurrent reservations, cancellation, uncertain job recovery and new scheduling contracts. It is a larger product change than the remaining demo needs. Preserve as post-submission work; do not hide this limitation in the release claim.

## Proposed exact implementation boundary

- Preserve immutable source12bd1c2/pHQ6kI as a positive partial closed origin: four done receipts, stopped native1, unchanged original core3 and zero-write pRaby9. Baseline becomes seven exact typed rows. No old ledger is reopened. Extend the existing retained-proof seam narrowly; do not create a cache or lineage framework.
- Keep the existing seven-digest capture set for full fresh validation. With four stored facts in the signed baseline, current semantic deduplication leaves exactly three missing notes. Assert the planned missing set before the first submission, enforce a narrower effective three-write allowance for this completion, and reject duplicates/substitutions. No technical failure/resolution writes are admitted.
- New one-shot preparation is an explicit user action through the same MCP entry. It is labelled as such in logs/video; it is not claimed to be model-initiated saving. Native conversations still select their own tools. No general first route or user task is programmed into the product launcher.
- Keep all existing upper ceilings:≤2 new native sessions,≤12 tools/session,≤120s/session; one shared240-second provider envelope; Tatum≤8 attempts/16 included credits; content reads≤10; guarded requests≤192;≤8 polls/job; $0 and no retry/paid fallback. Narrow new writes to3. Time spent preparing is part of240 seconds, never a separate renewed clock. Native session deadlines are clipped to the remaining envelope; successful liveness is not guaranteed by upper limits.
- Persist exact submitted public fact bytes before the external submission, bound to existing operation key/receipt hashes, so a later partial result does not require another timestamp reconstruction. This is a small auditable submission artifact, not a source of fresh facts or a replay cache. It does not expose credential or unrelated memory data.
- Offline checks must cover retained-seven signed-content mismatch, changed old origins, only-three missing writes, no rewrite of four existing facts, preparation→two fresh native clients→independent reader→original CSV, late-invalid write0, slow-relayer/deadline stop with spent counters and owned-key cleanup. Use virtual waits; no model/provider calls for acceptance.

## Sources

- `evidence/own-account-partial-live-2026-11-07/{run,payload-reconstruction,tools}.json`, seven exact `tatum-proofs/` files, and `evidence/verify-own-account-partial-live.mjs`.
- Frozen12bd1c2 `AgentSession.beforeReport`, `WalrusExperienceStore`, `WalrusRecordStore` polling, native/parent wrapper and raw public receipt journal timestamps.
- Existing three core receipt proofs and preserved aa7d8ed/pRaby9 zero-write result.
- Coordinator's instruction to compare preparation outside generation, increased native timeout and three-note native-only completion before implementation.

## Decisions and open questions

Choose alternative1 only after coordinator approval of the narrow retained-seven/write/time contracts. No new runtime implementation, grant, capture destination, profile/key read, model call or API operation is authorized by this document alone. Exact new source/plan hashes and key-transfer permission follow offline acceptance.

The shared240-second ceiling remains a real stop condition: even three jobs can exceed it at eight polls each. There is no guaranteed live completion in an asynchronous external service. Preparation avoids the demonstrated120-second coupling; it does not justify hiding uncertainty, extending time or substituting replay. Broader product support for asynchronous multi-note capture remains unfinished. Ten receipts alone also does not prove model benefit or submission readiness.
