# Recall Agent

Ask your own model about selected Sui transactions. Check exact balance changes and gas, keep verified observations in Walrus, and retrieve them in another conversation beside fresh Tatum data.

The local MCP server handles validation, memory receipts and CSV. Codex handles the conversation through your own ChatGPT account. No hosted model server or author's credentials are included.

## Verified result

On 8 November, a new user conversation asked a normal transaction question without mentioning memory. The tool automatically supplied the stored Walrus observation beside fresh Tatum data, and the model completed the answer and delivered the original 396-byte CSV. Automatic delivery is confirmed; causal improvement and error/correction recall are not established by that case. The user workspace is separate from the ten-record inventory below. [Neutral-run audit](docs/AUTOMATIC_RECALL_ACTUAL_2026-11-08.md).

The 7 November live run completed one full native report and delivered its original CSV. Ten distinct Mainnet memories were stored and read through the signed SDK path. A second fresh client retrieved the same context and exported another CSV, but its final answer hit the shared deadline. The extended two-answer/final-reader harness remains **STOPPED**; the primary report/memory/export flow is complete. Additional spend: **$0**.

[Ten-memory inventory](docs/MAINNET_MEMORY_INVENTORY.md) · [Actual result and limits](docs/ACTUAL_COMPLETION_REQUIREMENTS_AUDIT_2026-11-07.md) · [Original CSV](evidence/own-account-completion-live-2026-11-07/exports/8a4b5e98973650724d46863dc8d7b2b2e8f71986189f57e9a3dfe9ef8ee4a04a.csv)

## Install and run

Verified primary client: **Codex CLI on macOS**. Tested with Node 22.23.1 and Codex 0.153.0. Before provider activation, a metadata-only check verifies ChatGPT included quota and lists available models. The launcher binds gpt-5.6-luna when available, or asks you to choose an available model, and passes it explicitly on every fresh launch. It does not change your global Codex settings. Other MCP clients need their own configuration and live validation; this revision does not advertise a passed Claude run.

1. Install Node 22.23.1 or newer and [Codex CLI](https://developers.openai.com/codex/cli). Sign in with your own ChatGPT account using `codex login`.
2. Extract the judge ZIP. Open Terminal **inside the extracted Recall-Agent folder**. The ZIP includes pinned project dependencies.
3. Run:

```bash
bash start.command --live "$HOME/.local/share/recall-agent"
```

The launcher opens official Walrus browser sign-in, then asks for your Tatum Account ID, included credits and the same account's Mainnet key using hidden input. Confirm Free pricing/sponsorship before activation. Choose `FACTS` for checked transaction notes, or `ALL` to include supported verified technical failures/corrections. The conversation starts empty.

This activation has request limits, with no session expiry: Tatum≤8 attempts/16 included credits, Walrus≤7 sponsored writes/10 content reads/192 service requests and≤8 polls/job. Individual request timeouts remain. Counts persist across pauses and new chats. Only the confirmed Free account and official sponsored storage are allowed; access, quota, uncertain outcomes and billing errors stop the run. There is no paid fallback, upgrade or automatic allowance reset. Your model usage is your own included ChatGPT quota.

[Detailed setup and troubleshooting](docs/INSTALL.md)

## What to ask

Use your own wallet and transaction IDs or explorer links. For a previously verified public case:

```text
Reply in English. Explain this selected Sui Mainnet transaction for wallet
0x77776760c06997206b13fa76f127aa016d24a645f04fce516be153ece0bddf23:
2it6GExEsJgfjvrh9wZ7EUK4Pboe4dm6gN3ZrBX6bgE3.
Show who paid gas, exact balance changes and what remains unknown.
```

Then ask for the original CSV and hash. For memory reuse, exit Codex and repeat the same launch command with the same private folder. Ask the new chat to retrieve the historical observation, show its blob ID and compare it with fresh data. Do not resume the old transcript. Stopped activations remain closed. Existing legacy timed activations require an explicitly reviewed migration; the launcher never silently renews them.

These are optional examples, not a programmed route. Live mode supports selected transactions; unrestricted wallet-history discovery and complex contract interpretation are not implemented. Only supported structured claims are verified. Stored observations do not prove ownership or general model learning.

## Offline checks and source installation

```bash
bash start.command --check
```

Checks use synthetic/intercepted providers and fake native clients; they do not sign in, call a model or write Mainnet. The request-budget/model-binding runtime passed 218 tests plus independent protocols and saved-evidence checks. The new neutral-run verifier checks saved evidence without another provider/model request. The release's source manifest pins the packaged files.

For a source checkout, install the pinned dependencies first:

```bash
npm ci --prefix app --ignore-scripts --no-audit --no-fund
npm ci --prefix mcp --ignore-scripts --no-audit --no-fund
```

The earlier ten-record core run used `e72bdeef88d583edeccfb6c3f59b73cfaeac57af`; the current ordinary launch and neutral fresh-chat run used `eb1558682a781f431eae7e26949645048eff9eac`. Publication and a new walkthrough are prepared separately; older Recall Lab releases are not this candidate. MIT licensed; AI assistance was used for implementation, testing and documentation.
