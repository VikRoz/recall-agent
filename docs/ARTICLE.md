# What a Sui agent can carry into its next chat

8 November 2026 · Recall Agent

A transaction can tell you that one address sent a request and another paid gas. It cannot tell you which explanation you already checked yesterday. A new model conversation should be able to retrieve that work without treating an old note as fresh chain data.

Recall Agent connects a model client to selected Sui transaction data from Tatum and persistent memory in Walrus. The model asks questions and explains results. Code validates structured facts, calculates exact amounts and produces the original CSV.

## Three parts with different jobs

Tatum supplies current selected-transaction responses. The adapter checks the requested digest, preserves integer base units and separates the gas payer from the sender. A complex programmable transaction can remain unparsed; the agent should say so instead of inventing a token operation or counterparty.

Walrus stores scoped, checked observations and supported technical experience. Records carry their workspace, source and evidence. Storage receipts bind the exact content to a blob ID. The complete reader checks the inventory and payload hashes, rather than assuming a semantic search returned every relevant correction.

The model runs in the user's own client. Our local MCP server supplies the tools; it does not host a model or use the author's subscription for visitors. The current verified client is Codex CLI with the user's ChatGPT account.

## A new chat, without a memory command

On 8 November, the project owner opened a new Codex conversation and asked who paid gas in a selected Sui transaction, how the wallet balance changed, what relationship could be inferred and where to download the CSV. The request did not mention Walrus, memory or any previous conversation.

The model chose the report tool. Its response automatically included an earlier Walrus observation, with blob ID `q71H-BD57yPAE15l7j0X7r2JcRBF4K5w1WgUw-SQdAQ` and comparison `same`, alongside fresh Tatum facts. The model completed the explanation and delivered the original 396-byte CSV with its matching SHA-256. The existing observation was reused; no duplicate was written.

This confirms automatic retrieval and delivery into a new model conversation. It does not establish that memory improved the answer: the final response did not cite the old observation, and fresh data independently supported the same facts. It was a stored transaction observation, not an error/correction recall test. This personal workspace is separate from the ten-record candidate inventory; its record is not counted as an eleventh candidate memory.

The ordinary launch now has persistent request limits with no session expiry. Users can pause and open another conversation using the same private folder without resetting their allowance. Individual request timeouts, explicit Free/sponsored conditions and critical-error stops remain. Before provider activation, a metadata-only check verifies included ChatGPT quota and binds an available model; every fresh launch passes that model explicitly instead of inheriting an unrelated global default.

## The ten-record Mainnet run on 7 November

We now have ten distinct completed Mainnet memory receipts in one candidate workspace: two technical error/recovery records, one gas-payer hypothesis observation and seven whole-transaction fact notes.

The final three fact notes were created by an explicit operator request through the same public MCP entry. This preparation fetched and checked all seven transactions, preserved four existing facts and stored only the three missing ones. It was operator preparation, not a claim that the model spontaneously learned seven new lessons.

A fresh native model conversation then selected the report tool. It received fresh Tatum data alongside seven historical Walrus observations. All seven selected transactions were successful. In the first case the monitored wallet was the sender, another address paid gas, and the wallet had no balance-change row. The other six had no participation under the reported sender, gas-payer and balance-change checks.

The model explained exact gas and balance amounts, identified unparsed PTBs and kept the selected-case scope explicit. One negative net gas charge was correctly described as storage rebate exceeding costs, not investment profit. It chose to export the report and delivered the original 2,110-byte CSV with its path and SHA-256.

A second fresh client also recovered historical context, fetched the selected case again and exported a 396-byte CSV. It did not finish its final answer before our shared 240-second deadline. The extended experiment remains STOPPED, and its dedicated final SDK reader did not run. We retain that negative result rather than call the entire experiment a pass.

The completed first report, ten receipt-bound records and independently initialized client paths are separate positive evidence. Additional spend in this recorded run was $0, using included ChatGPT/Tatum allowances and sponsored Walrus writes. Those account conditions are checked before activation; there is no paid fallback.

## What the error memory demonstrated

An earlier known-case trial stored an actual numeric-input failure: a request used limit100 when the tool allowed at most10. A fresh conversation retrieved that experience, used a valid first request and produced a linked verified resolution. Those two records remain in the ten-record inventory.

That example used saved Sui data and a real Walrus/native-client path. It is one observed case, not a claim of general reasoning improvement. The new transaction run adds current Tatum evidence and checked facts; it does not turn the earlier experiment into a statistical result or prove recovery from an unseen error.

## Why a simple algorithm still matters

The model should not be trusted to do token arithmetic or decide that a receipt exists. A simple deterministic algorithm should calculate the same totals, validate a required field and reject an unsupported claim.

Our added layer makes the checked context portable across conversations: typed evidence, scope, provenance, receipt binding and a usable tool interface. Walrus is the persistent memory substrate; the project adds domain checks and a workflow that can explain where a remembered fact came from. The code can verify a submitted gas-payer hypothesis; it cannot verify every sentence the model writes.

## Where this can help

A person reviewing selected wallet operations can keep a checked gas-payer observation and revisit it without re-pasting a transcript. A support analyst can hand a case to another session with the transaction and memory IDs. A repeated tool constraint can become explicit context for the next attempt instead of another identical invalid call.

For a team, the same pattern could carry approved address explanations and corrections between clients. That needs real access control and review; it is a development direction, not a shipped collaboration feature. Selected transactions also do not equal unrestricted wallet-history discovery or contract intelligence.

## From this prototype to everyday use

The next steps are smoother account setup, a visible memory review workflow and explicit management of each finite request allowance. Saved immutable records cannot simply be erased through a UI. Asynchronous capture could keep storage polling out of the conversational response while preserving durable receipts and uncertain-job recovery.

A browser experience would also need a supported model connection for each user. A website cannot simply borrow a visitor's paid model subscription. The local client is the working starting point: users connect their own ChatGPT, Walrus and Tatum accounts; no author keys are shipped.

The tool boundary is MCP and the memory schema does not depend on a particular model. That makes other model clients possible. This candidate's live primary path is Codex; other clients require configuration and validation before we advertise them as passed.

## Try and inspect

The README provides installation, account setup, a small optional transaction example and offline checks. The source includes the ten-memory inventory, actual receipts, raw public transaction proofs, original CSVs and the stopped extended-run evidence. Public pages present saved results; live questions run in the local model client.

The earlier ten-record core run used `e72bdeef88d583edeccfb6c3f59b73cfaeac57af`. The 8 November ordinary launch and neutral fresh-chat run used `eb1558682a781f431eae7e26949645048eff9eac`. AI assistance was used for implementation, testing and documentation. Source is MIT licensed. The final judge archive, article and site publication are prepared together; the project author records the new walkthrough.
