# Recall Agent — experimental development copy

A Sui agent in your own model client, with verified experience memory. Development starts from [Recall Lab](https://github.com/VikRoz/recall-lab), whose v1.0.0 remains the submission fallback. This repository is not that release and has no deployment or judge package yet.

## Current implementation

The launcher supplies general operating rules and opens an empty Codex conversation. There is no initial user task, prescribed first tool, first/second-chat sequence or mandatory failure/save/export. Independent tools provide wallet/period lookup in the selected dataset, transaction reports, address-context previews and CSV. Wallet lookup does not require the user to supply transaction digests. It is optional; no tool must run first. The gas-payer verifier checks a model-proposed claim against transaction evidence. An opt-in public-transport observer also captures supported numeric argument violations rejected by the SDK before a handler runs, and links a verified successful correction. Relevant schema/source-matched experience is restored with the tool catalog in a new process. With explicit local capture enabled, a mismatch is saved automatically and a subsequently verified correction links to it.

Memory belongs to a persistent private workspace; separate client processes reuse it. Supported local-input errors can recover. Integrity failures and unknown failures stop the session. The verifier covers the structured claim submitted to it; arbitrary model prose is not automatically verified.

**Default launch: offline transaction data and local memory.** Synthetic data is the default; `--saved` selects a partial replay of two previously recorded Mainnet transactions. A [separate injected SDK assembly](docs/AGENT_WALRUS_GATE_OFFLINE_2026-11-06.md) now exercises the installed Walrus SDK and Seal through fully intercepted synthetic replies, with shared persistent limits and two typed namespaces. A separately authorized [real Walrus + native Luna trial](docs/AGENT_LIVE_TRIAL_2026-11-06.md) has also completed; the default user launcher remains offline. A preliminary native-model smoke completed report/verification, CSV reuse and clarification, with recorded capability overreach; that smoke alone did not demonstrate memory benefit. See [probe results](docs/AGENT_MODEL_PROBE_2026-11-06.md). Inherited website files, evidence and legacy entry points describe the fallback, not validation of this agent.

## Current acceptance gap

The [wallet lookup model probe](docs/WALLET_MODEL_PROBE_2026-11-06.md) failed acceptance: the model repeated an invalid page size in a fresh chat, current gas-payer memory did not capture the schema error, and the model rewrote the exported CSV. Lookup itself found the saved records and correctly exposed partial coverage. That baseline demonstrates neither memory improvement nor exact final CSV delivery. The approved [offline repair is implemented](docs/TOOL_ERROR_MEMORY_OFFLINE_2026-11-06.md): schema-bound technical capture and verifiable original CSV files. A [subsequent native comparison](docs/MEMORY_COMPARISON_2026-11-06.md) observed a narrow positive result: the same model requested 100 without experience and 10 with restored experience, and delivered the original CSV with its hash. This is one fixed-order known-case pair using local historical memory; it does not establish general reasoning improvement or live Walrus portability. The failed baseline remains unchanged.

An earlier [direct continuation](docs/DIRECT_EXPERIENCE_CONTINUATION_2026-11-06.md) also completed the observed local cycle: an actual native error was automatically captured, exposed in a fresh conversation, followed by a valid first call and an automatically linked resolution. Independent-process readback verified both records. This remains one known case on saved data, with no live Walrus operation or general learning claim.

A subsequent [live trial](docs/AGENT_LIVE_TRIAL_2026-11-06.md) stored the actual retained failure in managed Walrus, retrieved it in a fresh native Luna conversation, and automatically saved a linked resolution after the model chose a valid first lookup. Both real writes and two content recalls completed within the approved allowance. Sui facts stayed on the saved replay; Tatum was not called. This proves the scoped real storage/client path for one known case, not general learning. The trial allowance is consumed and is not a reusable judge launch package.

## Offline checks

Node.js 22.23.4 or newer is required. Dependencies may be installed from source using `npm ci --prefix app --ignore-scripts` and `npm ci --prefix mcp --ignore-scripts` (these installation commands contact npm). A development checkout may also use an existing local runtime and dependencies.

```sh
bash start.command --check
```

This runs regression tests, independent MCP processes, SDK transport tests and evidence/source checks, without model, Tatum or Walrus calls. Synthetic mismatches in these tests verify plumbing; they are not observed model errors.

The injected provider checks use a fixed public synthetic seed and fabricated relayer/chain responses. They exercise real SDK signing and Seal session creation locally, shared 2/2/2 ceilings, receipt reuse and uncertain-write stops. Their walrus-fixture IDs are not Mainnet receipts. No live profile or paid provider fallback is loaded.

## Try the development chat

The [ordinary provider assembly](docs/ORDINARY_PROVIDER_OFFLINE_2026-11-07.md) is now prepared and checked through intercepted SDK responses. It keeps retained experience (maximum 20) separate from each run's two-write allowance and retains a project-wide process lease and receipt journals. To prepare a **synthetic** provider workspace explicitly, run `bash start.command --prepare-provider-fixture /private/tmp/my-ordinary-fixture --capture`. A standard MCP client may then use `bash start.command --mcp /private/tmp/my-ordinary-fixture --provider-fixture`. The ordinary selected-transaction catalog asks for missing transaction references and provides no wallet-history discovery. This entry has no real credentials, provider fallback or Mainnet receipts. Its optional `--codex` path uses the user's model quota and has not been run in this offline increment.

Use your own Codex CLI with ChatGPT sign-in. The following opens an empty model chat with **synthetic** Sui data and local persistence. It uses your included model usage; running it is separate from offline checks.

```sh
bash start.command --codex /private/tmp/my-recall-agent
```

Add `--capture-local` to explicitly allow automatic saving of the supported technical experience to that private workspace. Reuse the same directory in a new launch to recover the same memory. No keys, provider API calls, Mainnet writes or paid fallback are configured by this entry point.

`bash start.command --example` prints available synthetic transaction inputs. They are not silently inserted into the model conversation. Ask any supported question in your own words; there is no required prompt sequence.

## Wallet activity from saved Mainnet records

Use a different private workspace for each dataset. This opens an empty model chat with the saved dataset selected:

```sh
bash start.command --codex /private/tmp/my-recall-saved --saved
```

Add `--capture-local` to allow supported technical observations to be saved locally. This command uses your model account; it is not part of offline checks. To inspect available data without inference:

```sh
bash start.command --example --saved
```

Ask about a wallet and optionally a period in ordinary words. The model can find matching transaction references without you pasting their IDs. Lookup returns UTC start-inclusive/end-exclusive coverage, bounded pages and observed roles. A missing record means absent from this dataset, not an inactive wallet. The two saved transactions are not a complete wallet history. Reports and CSV label their source `replay`, never a fresh provider read. Contract changes and full wallet-history discovery remain unsupported.

## Prepared real ordinary evaluation

[Stage 4A](docs/ORDINARY_LIVE_ADMISSION_OFFLINE_2026-11-07.md) now has a distinct managed admission and a bounded two-conversation runner. The offline SDK/Seal/Tatum checks are intercepted; they are not account access or a new Mainnet run. The separately approved [real attempt](docs/ORDINARY_LIVE_RESULT_2026-11-07.md) completed one actual Tatum report and Walrus write, then stopped before the second generation because the required MCP client failed initialization. New-record readback/resolution are unproved; the allowance is stopped and the temporary key was deleted. A subsequent [offline-only diagnostic increment](docs/ORDINARY_DIAGNOSTIC_OFFLINE_2026-11-07.md) retains safe first-failure evidence for future admitted attempts; it does not establish or fix this historical cause. A separate [actual metadata-only diagnostic](docs/READONLY_METADATA_RESULT_2026-11-07.md) subsequently initialized SDK/stdio and matched three expected blob IDs without content reads or writes. It does not establish the historical cause or fresh-chat recovery. A separate [single-conversation continuation](docs/ORDINARY_CONTINUATION_OFFLINE_2026-11-07.md) is now implemented and checked offline: one native task, one Tatum attempt, at most one linked resolution and two content reads with an independent final reader. Its [one actual launch](docs/ORDINARY_CONTINUATION_LIVE_RESULT_2026-11-07.md) retrieved real Walrus plaintext and fresh Tatum data, then stopped when optional failure capture conflicted with its resolution-only scope. No resolution was written; the allowance is consumed. An offline capture-policy fix is approved; no new real launch is admitted. It is not enabled by the default launcher. The default launcher remains offline. This two-turn evaluation grant does not authorize interactive `--codex`; the primary bounded judge launch remains stage 6 work.

## Scoped gas-payer memory

A stored literal payer applies only to the same transaction, network, source and observed payer. It cannot override a new transaction's facts. The [frozen expense-hypothesis evaluation](docs/EVALUATION_PREPARATION_2026-11-07.md) passed offline fresh-process and negative controls; the incorrect hypothesis is explicitly supplied by the test/user. It is not a new observed model error or an accuracy benchmark. The subsequent actual attempt and its partial stop are recorded above. The new one-conversation continuation requires its own finite live grant.

## Original CSV files

Export returns the code-generated CSV plus an artifact path, `file:` URI, SHA-256 and a standard MCP resource link. Open that original local file; a separately rewritten model table is not the certified export. Identical CSV bytes reuse the same file. Files remain in the private workspace `exports` directory (up to eight files, at most 65,536 bytes each). No upload or hosting occurs. Native resource rendering varies by client; the absolute path and hash are also returned as data.

## Other MCP clients

Configure a stdio server with command `/bin/bash` and arguments `["ABSOLUTE_PROJECT_PATH/start.command", "--mcp", "/private/tmp/my-recall-agent"]`. Optionally append `--capture-local` and/or `--saved` (using a separate workspace for the saved dataset). Use a new chat and select your own model. This standard MCP entry point is tested with independent protocol clients; the new free-task flow has not yet been verified live in Claude Desktop.

## Development gates

1. Independent tools, wallet/period lookup, replay provenance, verified claim capture and stable local memory — offline implementation and checks.
2. Preliminary model smoke — recorded, including a failed harness attempt; genuinely new user-selected tasks and memory-benefit checks remain pending.
3. Offline technical-error capture and exact export artifacts — implemented; one narrow native-model comparison recorded, broader testing pending.
4. Shared durable 2/2/2 ledger, typed namespaces, guarded SDK assembly and explicit managed-account admission — implemented and checked.
5. One bounded real Walrus/native model trial — completed with saved Sui data; clean judge packaging and broader live evaluation remain pending. Old exhausted budgets cannot be reused.

[Development state](PROJECT_STATE.md) · [Plan](docs/AGENT_PLAN.md). AI assistance was used. MIT license and dependency notices are preserved.
