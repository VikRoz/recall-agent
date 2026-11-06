# Recall Lab

**Sui activity with context that survives a new conversation.**

Ask your model about selected Sui transactions. Confirm an address explanation, save it to Walrus, retrieve it in a fresh chat and correct it without erasing the original record.

- [Project site](https://vikroz.github.io/recall-lab/)
- [Build story and actual terminal result](https://vikroz.github.io/recall-lab/blog.html)
- [Download the judge package](https://github.com/VikRoz/recall-lab/releases/tag/v1.0.0)
- [Inspect the verified model run](evidence/activity-model-2026-11-05/run.json)

Tatum supplies transaction facts. Code validates and computes exact base-unit changes and CSV. Walrus stores user-confirmed context and its correction history. The model interprets the request and explains the result through five MCP tools.

## Choose your client and model

| Client | Coverage | Model selection |
| --- | --- | --- |
| Codex CLI with ChatGPT | Full activity dialogue verified with real Tatum and Walrus | Type `/model` and select a model your account offers |
| Claude Desktop, Chat mode | MCP protocol and configuration verified offline; live activity dialogue not yet verified | Use the model picker next to the message box |

The launcher offers both clients. Use your own model account and available usage. There are no author API keys or quotas in the package. Other MCP clients need their own configuration and validation.

## Install and run

Use an **Apple Silicon Mac (M1 or newer)**. The release archive includes Node.js and dependencies.

1. Install and sign into [Codex CLI](https://developers.openai.com/codex/cli) using **Sign in with ChatGPT**, or install [Claude Desktop](https://claude.ai/download).
2. Prepare your own **Walrus Memory Mainnet test account** and **Tatum Free account**, with an existing Mainnet key and at least four included credits.
3. [Download `Recall-Lab-macOS-arm64.zip`](https://github.com/VikRoz/recall-lab/releases/download/v1.0.0/Recall-Lab-macOS-arm64.zip) and extract it. In Terminal, type `cd `, drag the extracted **Recall-Lab** folder into Terminal and press Enter.
4. Run:

```sh
bash start.command
```

Choose **1 for Codex** or **2 for Claude Desktop**. For a first rehearsal without any provider or model account, use `bash start.command --pilot-example`.

### Connect your accounts

Walrus opens its browser sign-in. Complete it using your test account. In Terminal choose **2 — Only save when I ask**. Its official helper signs in an isolated local profile; you do not need to paste a Walrus private key or install another plugin.

Enter the wallet and two Mainnet transaction digests. The launcher then asks for:

| Field | What to enter |
| --- | --- |
| Tatum Account ID | Your Tatum account's 24-character ID, not the Walrus account ID or credit balance |
| Remaining included credits | The current balance shown in Tatum, such as `99974` or `99,974` |
| Mainnet API key | That Tatum account's existing key, pasted into hidden Terminal input |

Confirm **Free status, managed Walrus sponsorship and $0 additional spend**. Each run permits two Tatum requests (four included credits), two sponsored writes and two content recalls. There is no paid fallback. Each Tatum request requires a Free-account check no older than five minutes. Before the second Codex conversation, recheck the current balance when prompted; this does not reset counters.

The temporary Tatum key is kept in a private file and removed on normal exit or handled interruption. Walrus credentials and receipts stay in the private run directory printed by the launcher. Keys never enter model context. A forced kill or crash can leave the private key file behind; inspect the printed directory before trying again.

## Walk through the real scenario

You may use your own two transaction IDs involving the same wallet. These public inputs reproduce the verified example:

```text
Wallet: 0x77776760c06997206b13fa76f127aa016d24a645f04fce516be153ece0bddf23
First transaction: 2GrJYm3r55QKF36pSMBhuZiYTtqXzRaNPbgS7XGsMAKQ
Second transaction: 2it6GExEsJgfjvrh9wZ7EUK4Pboe4dm6gN3ZrBX6bgE3
```

Wait until the model chat opens. A Terminal line ending in `%` is the shell, not a model conversation. Approve individual Recall Lab tools with **Allow once**.

### 1. First report and proposed context

Paste into the model chat:

```text
Use only Recall Lab tools. Reply in English.
Prepare a Sui Mainnet activity report for wallet 0x77776760c06997206b13fa76f127aa016d24a645f04fce516be153ece0bddf23 using transaction 2GrJYm3r55QKF36pSMBhuZiYTtqXzRaNPbgS7XGsMAKQ.
Show exact base-unit changes and the gas payer.
Propose an address rule for 0x000037de3368098ebbb5bc6808283004f4746a34e16d32e171f9400cd58cdd69: relation unknown, label "Unreviewed gas payer", effectiveFrom 2026-11-05T00:00:00.000Z.
Show the complete preview and wait for confirmation. Do not save, refresh or export yet.
```

### 2. Confirm and save

Review the exact proposal, then send:

```text
I confirm this exact preview. Save it once to Walrus, show the blob ID and stop. Do not refresh or export.
```

### 3. Fresh conversation

In Codex enter `/exit`, then `NEW` at the launcher prompt. Recheck the current Tatum Free balance when asked. In Claude use **New chat**; the same five-minute billing requirement applies.

Paste this without copying the previous conversation or its record contents:

```text
Use only Recall Lab tools. Reply in English.
Prepare a Sui Mainnet activity report for wallet 0x77776760c06997206b13fa76f127aa016d24a645f04fce516be153ece0bddf23 using transaction 2it6GExEsJgfjvrh9wZ7EUK4Pboe4dm6gN3ZrBX6bgE3.
Retrieve the existing address context from Walrus. Show its blob ID and explain how it applies.
Propose a linked correction for the stored gas-payer address: relation external, label "External gas sponsor (demo context)", effectiveFrom 2026-11-05T00:00:00.000Z.
Show the complete preview and wait for confirmation. Do not save yet.
```

### 4. Confirm the correction and export

```text
I confirm this exact correction preview. Save it once to Walrus, then export the current report as CSV. Show both blob IDs and the active rule. Do not fetch another transaction.
```

The CSV is generated by code and returned as text. Copy it to a `.csv` file. Exit Codex with `/exit` when finished. For Claude, quit with **Command-Q** and return to Terminal to restore your prior settings.

These transactions have a separate gas payer and complex PTBs. An empty sender balance-change list is not proof of an empty wallet. The address labels are explicitly user-confirmed demo context.

## Recovery

If the first write is done and the second chat failed before its transaction read, preserve the printed run directory and use:

```sh
bash start.command --continue PRIVATE_RUN_DIR
```

Continuation supports Codex at this one boundary. It requires the same key and a fresh Free-account check, preserves all counters and receipts, and opens only the second conversation. It rejects uncertain receipts, stopped runs, a consumed second read or a previous continuation attempt. Do not reset the journal or repeat a write for success.

For interrupted Claude settings, quit Claude and use `bash start.command --restore PRIVATE_RUN_DIR`. For an offline Claude rehearsal, restore with `bash start.command --offline --restore PRIVATE_RUN_DIR`.

## What the evidence proves

The [model run](docs/LIVE_RUN.md) used two fresh Codex conversations, two actual Tatum transaction reads, two sponsored Walrus writes and two content recalls. The second conversation recovered the exact initial record and applied a linked correction. It required an approved recovery after an initial second-chat startup failure; it was not an uninterrupted first attempt.

A separate no-model provider pilot produced another pair of real context/correction records. There are **four activity Mainnet records** in these two saved runs. The project does not claim ten current-scenario records or improved LLM reasoning. [Validation and submission status](docs/VALIDATION.md).

The site displays saved evidence; it does not run inference or make Walrus writes. To try the live tools, use the local package and your own accounts.

## Checks and source installation

```sh
bash start.command --check
```

All checks are offline. The bundle includes the required runtime. From source, use Node.js 22.23.4 or newer and first run:

```sh
npm ci --prefix app --ignore-scripts
npm ci --prefix mcp --ignore-scripts
```

Installing dependencies contacts npm. `bash start.command --offline` connects your own model client to synthetic local transactions and local persistence; that mode uses model usage but no Tatum/Walrus calls. `bash start.command --pilot-example` runs a complete synthetic two-worker pilot without any account or model call.

[Architecture](docs/ARCHITECTURE.md) · [Validation](docs/VALIDATION.md) · [Submission checklist](docs/SUBMISSION.md)

AI assistance was used for implementation, testing and documentation. Code is [MIT licensed](LICENSE); bundled dependencies retain their licenses.
