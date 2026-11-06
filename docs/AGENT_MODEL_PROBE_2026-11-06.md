# Native model probe — 6 November 2026

## Goal

Check whether the experimental agent selects tools from ordinary requests without the previous scripted route. This is an engineering smoke test, not a blinded benchmark or proof of better reasoning with memory.

## Assumptions and scope

Product baseline: f1e37c0. Actual model reported by native thread/start: gpt-5.6-luna. Existing ChatGPT sign-in; included usage at preflight was 16% used, additional-credit balance zero and hasCredits false. No API keys, credit purchases/resets, Tatum calls or Walrus calls. Maximum four user turns started across both attempts. A user turn is not one internal model request.

Tools used synthetic local Sui data. Local capture was enabled, but no erroneous supported gas-payer claim occurred. Tasks were selected by the developer from existing fixtures; they are not previously unseen user-selected test cases. Each new native conversation was ephemeral, with client memory disabled for the probe. Broader client context cannot be treated as a fully controlled scientific environment.

## Results and findings

Attempt 1 stopped at the 120-second turn timeout. The model selected prepare_report with the supplied task inputs. The harness ignored an authorization request whose numeric ID was zero due to a truthiness check. No tool completion occurred. Preserve this failed attempt; it is not a successful uninterrupted run.

Fixed the harness dispatch and tested the zero-ID case offline. The product tools and developer policy were unchanged between attempts. Only single requests for named local tools were approved; no global permission setting was relaxed. The remaining three turns completed:

1. Explain a selected transaction: model selected prepare_report and verify_gas_payer. The code verified the wallet's gas-payer claim; the balance change was -10000001050 base units and gas was 1050. No experience record was created.
2. Export that result: model called export_report with the existing report ID; it did not fetch another transaction or save an address label.
3. A new conversation with missing wallet/transaction inputs: model asked for wallet and network and made no tool calls. It did not invent balances, but it did not yet request transaction IDs.

Observed limitations: the model described a direct transfer to 0xb even though balance-change rows alone do not establish direct-counterparty semantics. Its clarification commentary promised wallet-history inspection, a capability this toolset does not provide. The gas-payer verifier cannot detect either unsupported prose claim. These are verification-coverage and capability-description gaps; no automatic general error detection is claimed.

## Decisions

Retain both attempts and the negative observations. Tighten the general capability policy to describe selected-digest coverage and prohibit inferring a direct counterparty from net balance rows alone. This adds no initial task or mandatory tool sequence. That post-probe wording change has not been re-tested with a real model; do not substitute it for the recorded baseline result.

Do not force an incorrect gas claim to manufacture a learning demonstration. SDK receipt plumbing and local correction tests remain separate evidence. Current result supports limited task-driven tool selection, not learning from errors, memory benefit, real Mainnet performance or Claude compatibility.

## Next checks and open questions

Run genuinely new user-selected tasks after freezing the revised candidate. Financial-claim verification remains narrower than free-text output: should the next supported structured claim cover exact wallet movements? Adding a verifier still cannot guarantee that all free prose is checked. Live admission and one durable budget for all writers remain pending. Do not enable Mainnet on the strength of this probe.

## Evidence and sources

- evidence/agent-model-probe-2026-11-06/run.json retains sanitized prompts, tool results, model replies, both attempt summaries and raw-event hashes. Private raw logs remain outside the repository.
- app/agent-model-probe.mjs is an evaluation harness; the product launcher does not import it.
- app/agent-probe-approval.mjs handles explicit single-operation native permissions.
- Official protocol documentation: https://developers.openai.com/codex/app-server — native threads/turns, rate-limit read, MCP elicitation and account checks.
- Official plugin policy documentation: https://developers.openai.com/plugins/build/plugins — per-tool/native approval remains distinct from plugin installation.

No deployment, new Mainnet records or submission. Additional spend: $0; included ChatGPT usage was consumed.
