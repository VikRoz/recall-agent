# Recall Agent — experimental development copy

A Sui agent in your own model client, with verified experience memory. Development starts from [Recall Lab](https://github.com/VikRoz/recall-lab), whose v1.0.0 remains the submission fallback. This repository is not that release and has no deployment or judge package yet.

## Current implementation

The launcher supplies general operating rules and opens an empty Codex conversation. There is no initial user task, prescribed first tool, first/second-chat sequence or mandatory failure/save/export. Independent tools provide transaction reports, address-context previews and CSV. The new gas-payer verifier checks a model-proposed claim against transaction evidence. With explicit local capture enabled, a mismatch is saved automatically and a subsequently verified correction links to it.

Memory belongs to a persistent private workspace; separate client processes reuse it. Supported local-input errors can recover. Integrity failures and unknown failures stop the session. The verifier covers the structured claim submitted to it; arbitrary model prose is not automatically verified.

**Today: synthetic transactions and local memory only in the launcher.** A typed Walrus transport reuses the existing SDK writer and durable uncertain-write journal and is tested with intercepted SDK responses. Its live admission is not wired into this experimental launcher. No new live model behaviour or improvement is claimed. Inherited website files, evidence and legacy entry points describe the fallback, not validation of this agent.

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

## Other MCP clients

Configure a stdio server with command `/bin/bash` and arguments `["ABSOLUTE_PROJECT_PATH/start.command", "--mcp", "/private/tmp/my-recall-agent"]`. Optionally append `--capture-local`. Use a new chat and select your own model. This standard MCP entry point is tested with independent protocol clients; the new free-task flow has not yet been verified live in Claude Desktop.

## Development gates

1. Independent tool actions, verified claim capture, stable local memory — offline implementation and checks.
2. Frozen code and genuinely new tasks with a real model — pending.
3. Account-bound admission and durable shared 2/2/2 limits for live experience — pending; old exhausted budgets cannot be reused.
4. Bounded real Sui/Walrus test and clean judge packaging — pending.

[Development state](PROJECT_STATE.md) · [Plan](docs/AGENT_PLAN.md). AI assistance was used. MIT license and dependency notices are preserved.
