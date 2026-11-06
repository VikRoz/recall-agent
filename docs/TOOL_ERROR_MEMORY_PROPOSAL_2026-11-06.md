# Tool failure memory and exact export — proposal, 6 November 2026

## Goal and evidence

Fix the observed repeat of a tool-argument constraint violation across fresh chats, and deliver the actual code-generated CSV. The wallet-model probe retained two limit=100 requests against maximum=10 and a rewritten CSV. This proposal is not an implementation or live-operation authorization.

## Assumptions and root causes

The official MCP SDK validates tool arguments before invoking our session handler (server/mcp.js validateToolInput). The current experience schema covers only gas-payer factual claims; it cannot see those SDK validation failures. Adding text to one tool description or silently clamping arguments would not implement general observed-error memory. The native model client can rewrite free prose and CSV after receiving tool output; the MCP server cannot certify all of that prose.

## Chosen bounded design

1. Add an observer at the public MCP Transport boundary, where validated tool requests and SDK error responses can be correlated. Keep the SDK's schema validation enabled. Avoid private SDK fields and replacing its dispatch implementation.
2. Add a separate typed technical-experience variant for supported numeric constraint violations. Record tool name, schema fingerprint/version, allowed field/constraint, sanitized numeric observation, evidence and resolution link. No arbitrary raw arguments, prompts, keys or untrusted advice. A later successful comparable call verifies resolution. Deduplicate; preserve opt-in and the existing offline two-record ceiling. Do not turn every typo or network failure into permanent advice.
3. Expose relevant recovered experience as clearly labelled data in the relevant tool's metadata/catalog when the server starts, using the existing bounded memory reader. No mandatory first model tool or task route. Schema/version changes invalidate old applicability. Keep model choices separate from code constraints; measure whether the first invalid call disappears, not just whether the code rejects it.
4. Export the existing code-generated CSV to a bounded immutable local artifact with content hash, and return its reference. The user opens the original file instead of relying on the model to reproduce its contents. Keep source/replay metadata. Preserve the original inline output for compatibility if appropriate; do not certify rewritten model text.
5. Test capture-before-handler, new-process retrieval, changed schemas, source isolation, duplicate/uncertain writes, opt-out, no extra storage calls and exact CSV bytes. Initially offline only; no new model/Tatum/Walrus calls or increased limits.

## Alternatives and trade-offs

Adding a max=10 reminder: schema already states that constraint; it may help a prompt but does not close the observation gap. Silent limit clamping: rejected because it hides the failure and changes the request. Mandatory inspect/recall first: rejected because it restores a scripted route. Replacing the native client with a hosted chat: too much authentication, cost and product scope. The selected observer requires careful transport lifecycle/error handling and schema evolution; metadata exposure may still fail to influence the model and must be measured honestly.

## Decisions and approval boundary

Fixing the probe's failure detector and preserving evidence are authorized local diagnostics. Implementing the new experience variant/observer and export artifact changes data and tool contracts. Per AGENTS.md, present this bounded design and obtain approval before implementing it. No product changes in this proposal. No Mainnet writes or publication authorization is added.

## Sources and open questions

Local SDK: mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/shared/transport.d.ts and server/mcp.js; app/agent-experience.ts; app/agent-mcp.mjs; wallet model probe run.json. Date: 6 November 2026. Public Transport provides onmessage and asynchronous send; confirm ordering and cleanup with independent-process tests before adopting the observer. Open: precisely which non-secret constraint fields qualify, how retrieved metadata is displayed consistently across clients, and whether this improves first-action behaviour. Live shared-budget admission remains pending.
