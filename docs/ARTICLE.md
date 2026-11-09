# What a Sui agent can carry into its next chat

You ask a wallet assistant who paid the gas on a Sui transaction. The answer depends on a small but important distinction: the address that sent the transaction can be different from the address that paid for it. If you reopen the case tomorrow, you want to recover what was already checked and see whether it still agrees with the data.

We built Recall Agent to do that across conversations. It takes a question about selected transactions, fetches current evidence, builds a report and can save a verified observation for a later chat. Each saved observation has a source and a record ID that let you trace it back.

## What we built and what each part does

**Sui Mainnet and Tatum.** Sui is where the transactions happened. We use Tatum to fetch the transactions identified in the question. Our code checks the transaction digest, keeps amounts in integer base units and reports the sender, gas payer and recorded balance changes separately. It can flag an unparsed programmable transaction block when its higher-level meaning is unclear.

**Walrus Memory.** The agent stores scoped observations and supported technical errors in Walrus. A storage receipt identifies the saved content by its blob ID. When a new chat asks for a report, the tool can load an applicable record, check its content against the receipt and compare it with fresh data. A record carries context such as the network, transaction, source and workspace.

**Codex CLI and MCP.** Codex handles the conversation and decides which tools to call. Our local Model Context Protocol (MCP) server supplies those tools and handles the checks, exact arithmetic and CSV generation. The verified live setup uses the operator’s own ChatGPT, Tatum and Walrus accounts. Other MCP clients are a possible extension and would need their own live validation.

## What the video actually shows

On 9 November, we recorded a live run against one selected Sui Mainnet transaction. The setup starts in Terminal, connects Walrus in the browser, configures Tatum and opens Codex.

1. **First chat.** We supply a transaction ID and a wallet address and ask who paid the gas and how the wallet’s balance changed. Fresh Tatum data shows that the wallet was the sender, another address paid **104,194 MIST**, and the selected transaction contains no balance change for the queried wallet. Recall Agent saves the checked observation to Walrus.
2. **Second chat.** We close the first conversation and launch a fresh one in the same private workspace. The new question asks about the transaction and a CSV. The report tool automatically supplies the earlier Walrus observation alongside a fresh Tatum response. The chat exports the original 396-byte CSV, its local path and a SHA-256 checksum.
3. **Log check.** The two distinct chats show the same blob ID, `IJI-Fd4hA_NJH8u_4dwpm4M77gETR7Ot7iVYhWN8Ri8`. The receipt shows `done`, and the second report shows `comparison: same`. The saved observation agrees with the fresh data.

The video demonstrates automatic retrieval of a verified fact in a fresh chat. Fresh transaction data independently supported the same answer, so this run measures retrieval and agreement. The transaction identifies the gas payer for this operation. Address ownership and the relationship between the parties remain unknown. [Watch the live demo](https://www.youtube.com/watch?v=7Ufi92qOGnU).

## Why we gave the error path a known bad input

An arbitrary wallet address or transaction ID gives us no reliable way to exercise a mistake. The transaction can succeed, the assistant can interpret it correctly and there may be nothing to capture. We therefore chose a reproducible test where the evidence could settle the question.

**Live hypothesis test, 7 November.** We deliberately supplied the wrong assumption that the transaction sender also paid the gas. The model chose to check it against a real Tatum response. The verifier found a different payer and saved the mismatch to Walrus. A later fresh conversation retrieved that record. The continuation stopped before it could write a resolution. The deliberately wrong input was the proposed payer. The Sui data was genuine, and the model correctly rejected the proposal. [First run](https://github.com/VikRoz/recall-agent/blob/main/docs/ORDINARY_LIVE_RESULT_2026-11-07.md) · [Fresh-chat continuation](https://github.com/VikRoz/recall-agent/blob/main/docs/ORDINARY_CONTINUATION_LIVE_RESULT_2026-11-07.md).

**Known tool error, 6 November.** In a separate control, a model independently requested `limit=100` from a wallet activity tool that allowed at most `10`. We reused that captured error in a follow-up with saved Sui data and real Walrus storage. A fresh conversation retrieved it, used `10` on its first request and saved a verified resolution linked to the original error. This was one case with a known input error. The recorded video shows the separate fact-retrieval workflow. [Known-case trial](https://github.com/VikRoz/recall-agent/blob/main/docs/AGENT_LIVE_TRIAL_2026-11-06.md).

## Scope and other results

The live flow reports on selected transactions. It cannot establish complete wallet history, prove who controls an address or decode every programmable transaction. The code verifies supported structured facts and tool results. The model’s wider explanation still requires judgment. Memory applies within a scope, and a fresh provider response remains the reference when it disagrees with an old observation.

A separate candidate workspace recorded ten completed Mainnet receipts: two linked technical error and recovery records, one gas-payer mismatch and seven transaction observations. The operator explicitly requested the final three transaction notes. The extended experiment produced reports and CSVs but stopped before its second final answer and final independent reader. The ten receipts are evidence of completed storage operations within that workspace. [Inventory and limits](https://github.com/VikRoz/recall-agent/blob/main/docs/MAINNET_MEMORY_INVENTORY.md).

## What we could build next

- **Wallet and treasury review.** Keep checked gas-payer and balance observations for recurring reconciliation, then export evidence for a review period. Broader transaction coverage would be the next step.
- **Support and incident handoffs.** Pass the next analyst a transaction ID, a checked observation and the questions still open. A shared workspace would need team permissions and an audit trail.
- **Reusable tool lessons.** Carry a verified constraint into a later run and link a successful correction to the original failure. More controlled trials would show when this saves retries across tools and models.

[Run Recall Agent locally](https://github.com/VikRoz/recall-agent/blob/main/docs/INSTALL.md) · [Download the demo package](https://github.com/VikRoz/recall-agent/releases/tag/agent-demo-v1.0.0) · [Source code, MIT](https://github.com/VikRoz/recall-agent).
