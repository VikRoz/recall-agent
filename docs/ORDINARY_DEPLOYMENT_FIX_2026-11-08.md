# Ordinary Walrus deployment binding repair

Date: 8 November 2026.

## Goal and assumptions

Diagnose and fix the failed ordinary own-account setup without bypassing a provider guard or replaying the user trial. The user-led run5b1facac-9f2d-40a7-bc6b-8e0fa1d22089 stopped on source52436d2 before model tools. Its home, key/profile and consumed counters remain untouched.

## Findings

The ordinary launcher pinned network/package/transport/gRPC URL but omitted suiRpcUrl. The shared deployment hash includes that field as null. The successful earlier author context contained https://rpc-mainnet.suiscan.xyz. A coordinator's separate anonymous bounded GET/config at2026-11-08T14:41:50.976817Z confirmed the same five public fields. It made one public metadata request, no authenticated content read, Tatum call, write, profile/key access or model turn; cost$0.

Actual user startup: HTTP200/config, AGENT_CONFIG_SCOPE at service request3; ledger Tatum0/write0/content-read0/service3, stoppedAGENT_PROVIDER_OR_POLICY_ERROR. The actual rejected body was not logged, so field diagnosis combines the known predicate, expected context, current independent public observation and exact synthetic reproduction. No memory or model answer is claimed.

## Self-review and accepted decision

Populate the missing approved field in ordinary setup. Keep deploymentHash and all equality guards unchanged. Dropping an unused RPC field from the hash would change the security boundary; ignoring the error would mask it. A new dynamic config-discovery subsystem is unnecessary for this narrow repair. Unknown future deployment changes continue to stop.

The old fixture returned context.config, repeating the launcher's omission. That self-consistent mock missed a real startup defect. The first-setup integration now compares with an independently captured public configuration and feeds that shape to the actual strict response guard. The new regression was run before the fix and failed on the missing field. After the one-property fix,43/43 targeted own/live/diagnostic/managed tests passed with no skips. Network/package/transport/gRPC/RPC-change and missing-RPC controls still reject. All test credentials and replies are synthetic.

## Recovery boundary

A source fix cannot change an expired stopped context. The coordinator accepted preparing a separate one-shot operator helper for this exact zero-work config failure: preserve the old state, same logical workspace, profile/key in place; fresh Free observation and explicit ACTIVATE; a new bounded activation carrying the three consumed startup requests as a floor (remaining189 of192). No generic renewal, stopped-state overwrite, secret copy or automatic execution. Helper verification and actual user execution are separate open gates.

## Sources

app/agent-own-launch.mjs; app/agent-walrus-guard.mjs; app/agent-own.test.mjs; evidence/user-led-startup-2026-11-08/ contains sanitized actual ledger/first failure, independent synthetic reproduction and the coordinator's five-field public observation. Logs: /private/tmp/recall-config-default-before-fix-20261108.log, /private/tmp/recall-config-default-targeted-20261108.log. Previous actual complete report remains independently preserved.

## Open questions

Actual fresh ordinary user task and cross-chat memory remain pending. Do not rerun or reset the stopped activation. Publication remains on hold; source/ZIP/site must be rebuilt and reviewed for this fix before any new publication. One-shot recovery is not a new live result.
