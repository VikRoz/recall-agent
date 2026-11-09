# Recall Agent submission

| Field | Link or value |
| --- | --- |
| Project | Recall Agent |
| Track | Smart Agents for Real Life |
| Site | [Recall Agent](https://vikroz.github.io/recall-agent/) |
| Source | [GitHub repository](https://github.com/VikRoz/recall-agent) |
| Judge package | [Recall-Agent.zip](https://github.com/VikRoz/recall-agent/releases/download/agent-demo-v1.0.0/Recall-Agent.zip) |
| Article | [What a Sui agent can carry into its next chat](https://vikroz.github.io/recall-agent/blog.html) |
| Video | [Recall Agent Live Demo](https://www.youtube.com/watch?v=7Ufi92qOGnU) |
| Mainnet memory evidence | [Ten completed Walrus receipts](MAINNET_MEMORY_INVENTORY.md) |

Recall Agent uses Tatum Sui gRPC to fetch selected Mainnet transactions. Its local MCP server verifies structured facts, computes amounts in exact base units and exports CSV. The official Walrus Memory SDK stores checked observations and supported technical experience, then retrieves applicable records in a fresh Codex chat.

In the video, the first chat saves a verified observation. A new chat retrieves the same blob ID alongside fresh Tatum data and exports the original 396-byte CSV with its SHA-256. The separate ten-record inventory includes a linked tool failure and resolution, one verified gas-payer mismatch and seven transaction observations. [Evidence and limits](ACTUAL_COMPLETION_REQUIREMENTS_AUDIT_2026-11-07.md)

Judges can use the same transaction or supply their own selected transaction IDs. The [installation guide](INSTALL.md) covers live use with their own ChatGPT, Tatum and Walrus accounts, as well as offline checks.
