# Single activation confirmation and terminal-width repair

Date: 8 November 2026.

## Goal and assumptions

The user explicitly asked to remove FREE-SPONSORED after a failed setup. The existing ACTIVATE can confirm the displayed Free/sponsored conditions and bounded activation once. No account, provider, model or existing user-home operation is authorized by this repair. The frozen d552e7e archive and its pending publication request remain historical and unchanged.

## Adversarial review and decision

Removing all confirmation or accepting malformed financial-policy statements was rejected: it would change the meaning of account activation and the user's $0 constraint. Keep ACTIVATE, make its Free/sponsored and finite-budget meaning explicit immediately above it, and remove only the redundant phrase. The coordinator accepted this narrow user-authorized repair; backend admission, checkedAt, limits and critical stops are unchanged.

Removing a phrase alone would leave the terminal redraw cause. The hidden-input Writable did not forward the actual output width, so readline issued cursor columns beyond a narrow terminal. Forward the public columns property and resize event, and detach the listener on close. Reject replacing hidden input with visible input, patching private readline methods or adding a terminal framework. Prompts are shortened without changing accepted account, credit, capture or activation values.

## Actual offline checks

-17/17 own-account cases passed, zero skipped. Updated first-setup/restart test consumes the shorter prompt sequence; a new denied-ACTIVATE case proves no key prompt/file, activation state or model-client spawn.
- Before/after isolated real PTY canary at40 columns runs the actual launcher with injected login/profile/spawn ports. Old d552e7e prompt renderer emitted3 cursor-column commands beyond the terminal width; the repaired renderer emitted0. Both completed setup with the exact synthetic key, and neither echoed it. This is input/terminal evidence, not a real account login.
- Shared public MCP synthetic protocol passed with Tatum2/write7/read10/service92. No new provider/model/profile/private-key read, external request or cost occurred.
- No claimed fix to unknown user credentials or account state. The failed user setup is not deleted, reset or retried automatically; the next user launch uses the same folder.

## Sources

app/agent-own-launch.mjs, app/agent-own.test.mjs, docs/INSTALL.md; actual local report /private/tmp/recall-setup-pty-report-20261108.json and targeted log /private/tmp/recall-own-setup-fix-20261108.log. The frozen earlier live result remains in evidence/own-account-completion-live-2026-11-07/.

## Open questions

The user-led live task has not completed. A new clean archive and review packet must bind this revision; an approval for d552e7e must not publish different bytes. Other account conditions and missing/expired activations still stop normally. No new live allowance or published result is implied.
