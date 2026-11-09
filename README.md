# Recall Agent

Ask about selected Sui Mainnet transactions in Codex. Recall Agent fetches fresh data through Tatum, checks gas and balance changes in code, and saves verified observations to Walrus so a new chat can use them. A local MCP server handles these tools and generates the CSV.

[Watch the live demo](https://www.youtube.com/watch?v=7Ufi92qOGnU) · [Read the article](https://vikroz.github.io/recall-agent/blog.html) · [Download the judge package](https://github.com/VikRoz/recall-agent/releases/download/agent-demo-v1.0.0/Recall-Agent.zip)

## What the demo verifies

The first chat saves a checked transaction observation. A fresh chat retrieves the same Walrus blob alongside fresh Tatum data, without a memory instruction in the prompt. The video shows both blob IDs, the agreement check and the original CSV with its SHA-256 checksum.

[Ten-memory inventory and verification](docs/MAINNET_MEMORY_INVENTORY.md)

## Install and run

The live path was verified on macOS with Codex CLI. You need Node 22.23.1 or newer, your own ChatGPT account with Codex access, Tatum Free and Walrus Memory with sponsored storage.

1. Install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`.
2. Extract the judge ZIP and open Terminal inside the `Recall-Agent` folder.
3. Run:

```bash
bash start.command --live "$HOME/.local/share/recall-agent"
```

The launcher checks which models your account can use, opens Walrus sign-in in the browser and prompts for Tatum setup. Enter the Mainnet API key in the hidden Terminal prompt. Choose `FACTS` for transaction observations or `ALL` to also capture supported technical errors and corrections. Request limits persist across chats. The launcher uses included quota and sponsored storage.

[Detailed setup and troubleshooting](docs/INSTALL.md)

## Try the demo question

Use your own transaction IDs or try this verified public case:

```text
Explain this selected Sui Mainnet transaction for wallet
0x77776760c06997206b13fa76f127aa016d24a645f04fce516be153ece0bddf23:
2it6GExEsJgfjvrh9wZ7EUK4Pboe4dm6gN3ZrBX6bgE3.
Show who paid gas, exact balance changes and what remains unknown.
```

Exit Codex and run the same command with the same private folder. Ask about the same transaction again and request the original CSV and its SHA-256. The report tool loads relevant observations automatically. This workflow covers the transactions you supply. It can establish the gas payer, but address ownership and full wallet history remain outside its scope.

## Run offline checks

The judge ZIP includes pinned dependencies. From a source checkout, install them first:

```bash
npm ci --prefix app --ignore-scripts --no-audit --no-fund
npm ci --prefix mcp --ignore-scripts --no-audit --no-fund
bash start.command --check
```

The checks use fixtures and saved evidence. MIT licensed. AI assistance was used for implementation, testing and documentation.
