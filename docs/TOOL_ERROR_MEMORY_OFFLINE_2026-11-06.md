# Verified technical memory and exact CSV artifacts — 6 November 2026

## Goal and approval

Implement the user-approved offline repair for the observed repeated page-size error and rewritten CSV. The retained model probe remains a failed acceptance on its original baseline. No model/Tatum/Walrus calls, live records, credential transfer or billing changes occur in this increment. The fallback repository remains unchanged.

## Architecture and decisions

A decorator implements the public MCP Transport interface (start/send/close/callbacks/protocol version). It observes SDK tool catalogs, correlates tool-call requests and responses, and preserves SDK dispatch and schema validation. It records only confirmed numeric minimum/maximum violations for allowed technical fields (limit/pageSize), safe integers up to absolute 1,000,000, and one unambiguous violation per call. It never retains full arguments, secret fields, prompts or raw error messages. Unknown schemas, unsafe/non-numeric values and other error classes are not automatically persisted.

A separate recall-tool-experience/1 variant holds workspace, source, tool, input-schema fingerprint, field/constraint/bound, observed numeric attempt, evidence type, verdict and correction parent. The original gas-payer variant remains readable. One successful comparable tool call verifies resolution. This is evidence of local recovery, not proof that the model learned permanently. Both variants share the unchanged two-record cap and duplicate suppression. Provider transport continues using the existing receipt/uncertain-write journal; no second writer implementation is introduced.

Catalog responses expose matching verified observations as labelled data with local/Walrus storage identity and source IDs. Matching requires workspace, source and the current tool schema hash. A changed schema or data source removes the hint; old records are not erased. Descriptions carry the same data so a client that ignores arbitrary metadata can still pass it to the model. No first model action is prescribed. The observer reads a bounded snapshot once per connection and updates it after confirmed writes. A client that never obtains a catalog does not establish schema-aware capture; supported native clients normally obtain catalogs.

When opt-in capture can write, the affected tool is advertised as non-read-only. Observation/correction IDs and storage status are attached to the actual tool response. Original schema errors remain errors and the tool handler is not run on invalid arguments. Uncertain observation writes quarantine the connection and do not resubmit. Bidirectional request IDs, including numeric zero and colliding server-request IDs, remain separate.

CSV export preserves the existing code-calculated report. It additionally publishes the exact bytes atomically into the private workspace exports directory and returns a path, file URI, SHA-256, byte count and MCP resource link. Artifacts are content-addressed, mode 0600, reused for identical bytes and never overwritten by this writer. Tampering, symlinks, unexpected directory entries or uncertain filesystem states fail closed. Limits: eight artifacts and 65,536 bytes per CSV. Original inline CSV remains for compatibility. The model policy asks for delivery of the artifact rather than reconstruction; arbitrary model prose remains outside server certification.

## Alternatives and trade-offs reviewed

The advertised schema already contained maximum=10; another reminder alone would not close the observation gap. Silent clamping would conceal the failure and change the request. Mandatory inspect/recall would restore a scripted route. Private SDK dispatch hooks would couple the implementation to internal fields. The public transport decorator preserves validation but requires strict lifecycle/error handling. File export gives the user a verifiable original, while the server still cannot guarantee that every native client renders the resource or that a model never rewrites free text.

## Offline validation

Eleven focused tests cover SDK rejection before handler, safe evidence capture, resolution and deduplication, fresh catalogs, schema/source invalidation, opt-out, safe-value filtering, connection quarantine after uncertain writes, strict parent/schema validation, shared two-record cap, exact CSV bytes, tampering, symlinks/size/count, independent MCP processes and original-file resources. Different maximum/minimum values test that the solution is not tied to the demo value. Real Walrus writer/read contracts are exercised only with intercepted SDK responses. A transport test covers zero IDs, colliding reverse-direction requests and lifecycle forwarding.

The full suite passed: 80 tests, independent-process checks, retained positive/negative evidence verification and source-manifest verification. No real model re-test is included here. Injected invalid requests are explicit offline fixtures, not new model mistakes. The earlier failed model-run evidence is unchanged.

## Remaining questions and next gate

Freeze this candidate, then separately authorize a bounded native-model comparison with and without relevant recovered experience. Measure the model's first argument choice and actual artifact delivery; a code rejection is not reasoning improvement. Native Claude behaviour, client resource rendering, shared live budgets/admission and sponsored Mainnet experience remain unverified. Do not enable providers or increase limits on the strength of offline results.

## Sources

User approval and docs/TOOL_ERROR_MEMORY_PROPOSAL_2026-11-06.md; SDK shared/transport.d.ts and server/mcp.js; app/agent-tool-observer.mjs; app/agent-experience.ts; app/agent-export.mjs; app/agent-observer.test.mjs; evidence/wallet-model-probe-2026-11-06/run.json. Inspected and exercised locally on 6 November 2026. Additional spend $0.
