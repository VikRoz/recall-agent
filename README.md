# Recall Agent — experimental development copy

A Sui agent in your own model client, with verified experience memory. Development starts from [Recall Lab](https://github.com/VikRoz/recall-lab), whose v1.0.0 remains the submission fallback. This repository is not that release and has no deployment or judge package yet.

## Current implementation

The launcher supplies general operating rules and opens an empty Codex conversation. There is no initial user task, prescribed first tool, first/second-chat sequence or mandatory failure/save/export. Independent tools provide wallet/period lookup in the selected dataset, transaction reports, address-context previews and CSV. Wallet lookup does not require the user to supply transaction digests. It is optional; no tool must run first. The gas-payer verifier checks a model-proposed claim against transaction evidence. An opt-in public-transport observer also captures supported numeric argument violations rejected by the SDK before a handler runs, and links a verified successful correction. Relevant schema/source-matched experience is restored with the tool catalog in a new process. With explicit local capture enabled, a mismatch is saved automatically and a subsequently verified correction links to it.

Memory belongs to a persistent private workspace; separate client processes reuse it. Supported local-input errors can recover. Integrity failures and unknown failures stop the session. The verifier covers the structured claim submitted to it; arbitrary model prose is not automatically verified.

**Today: offline transaction data and local memory only in the launcher.** Synthetic data is the default; `--saved` selects a partial replay of two previously recorded Mainnet transactions. A typed Walrus transport reuses the existing SDK writer and durable uncertain-write journal and is tested with intercepted SDK responses. Its live admission is not wired into this experimental launcher. A preliminary native-model smoke completed report/verification, CSV reuse and clarification, with recorded capability overreach; no improvement from memory is claimed. See [probe results](docs/AGENT_MODEL_PROBE_2026-11-06.md). Inherited website files, evidence and legacy entry points describe the fallback, not validation of this agent.

## Current acceptance gap

The [wallet lookup model probe](docs/WALLET_MODEL_PROBE_2026-11-06.md) failed acceptance: the model repeated an invalid page size in a fresh chat, current gas-payer memory did not capture the schema error, and the model rewrote the exported CSV. Lookup itself found the saved records and correctly exposed partial coverage. No memory improvement or exact final CSV delivery is claimed. The approved [offline repair is implemented](docs/TOOL_ERROR_MEMORY_OFFLINE_2026-11-06.md): schema-bound technical capture and verifiable original CSV files. The revised candidate has not yet been re-tested with a real model; the failed baseline remains unchanged.

## Offline checks

Node.js 22.23.4 or newer is required. Dependencies may be installed from source using `npm ci --prefix app --ignore-scripts` and `npm ci --prefix mcp --ignore-scripts` (these installation commands contact npm). A development checkout may also use an existing local runtime and dependencies.

```sh
bash start.command --check
```

This runs regression tests, independent MCP processes, SDK transport tests and evidence/source checks, without model, Tatum or Walrus calls. Synthetic mismatches in these tests verify plumbing; they are not observed model errors.

## Try the development chat

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

## Original CSV files

Export returns the code-generated CSV plus an artifact path, `file:` URI, SHA-256 and a standard MCP resource link. Open that original local file; a separately rewritten model table is not the certified export. Identical CSV bytes reuse the same file. Files remain in the private workspace `exports` directory (up to eight files, at most 65,536 bytes each). No upload or hosting occurs. Native resource rendering varies by client; the absolute path and hash are also returned as data.

## Other MCP clients

Configure a stdio server with command `/bin/bash` and arguments `["ABSOLUTE_PROJECT_PATH/start.command", "--mcp", "/private/tmp/my-recall-agent"]`. Optionally append `--capture-local` and/or `--saved` (using a separate workspace for the saved dataset). Use a new chat and select your own model. This standard MCP entry point is tested with independent protocol clients; the new free-task flow has not yet been verified live in Claude Desktop.

## Development gates

1. Independent tools, wallet/period lookup, replay provenance, verified claim capture and stable local memory — offline implementation and checks.
2. Preliminary model smoke — recorded, including a failed harness attempt; genuinely new user-selected tasks and memory-benefit checks remain pending.
3. Offline technical-error capture and exact export artifacts — implemented; model re-test pending.
4. Account-bound admission and durable shared 2/2/2 limits for live experience — pending; old exhausted budgets cannot be reused.
5. Bounded real Sui/Walrus test and clean judge packaging — pending.

[Development state](PROJECT_STATE.md) · [Plan](docs/AGENT_PLAN.md). AI assistance was used. MIT license and dependency notices are preserved.
