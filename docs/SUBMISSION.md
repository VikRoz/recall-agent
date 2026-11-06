# Submission handoff

Updated 6 November 2026. Application not submitted.

| Field | Value |
| --- | --- |
| Project | Recall Lab |
| Track | Smart Agents for Real Life |
| Public site | https://vikroz.github.io/recall-lab/ |
| Repository | https://github.com/VikRoz/recall-lab |
| Judge package | https://github.com/VikRoz/recall-lab/releases/tag/v1.0.0 |
| Published article | https://vikroz.github.io/recall-lab/blog.html |
| Video | Author will record the new activity walkthrough; link pending |
| Mainnet memory requirement | Four activity records verified; six more required to reach ten for this scenario |

## Short description

A local Sui activity agent that retrieves real transaction facts through Tatum, stores user-confirmed address context in Walrus, recalls it in a fresh conversation and applies linked corrections before code-generated CSV export. Judges use their own model client and accounts.

## Real integration

Tatum Sui gRPC supplies selected transaction facts. Official Walrus Memory SDK operations persist scoped address rules and corrections on Mainnet. The model drives a five-tool MCP conversation; arithmetic, active revision selection, hash checks and CSV remain deterministic code.

The verified live dialogue used Codex. Claude Desktop configuration and protocol were tested offline. The model run required an approved continuation after a second-chat startup failure; counters and the original receipt were preserved. No paid fallback or account upgrade was used.

## Building experience

Walrus made context available beyond a single model conversation. Complete inventory/readback checks and receipt hashes were necessary to apply corrections confidently. Handling the difference between an accepted job and a completed record, and preserving the journal across restarts, were central implementation tasks.

Tatum RPC was used directly for actual Sui transaction data. Tatum AI Builder was not used. Exact amounts, separate gas payer handling and complex transaction uncertainty remain explicit.

## Applicant-owned fields

The applicant will supply their contact details, public account identifiers, discovery source, first-Web3-project answer and required declarations. Never enter a delegate private key or API key in the application. Do not submit this checklist or missing video/memory work as completed.
