#!/bin/bash
set -euo pipefail
umask 077
root=$(cd -- "$(dirname -- "$0")" && pwd -P)
node="$root/runtime/node/bin/node"
if [[ ! -x "$node" ]]; then node=$(command -v node); fi
if [[ $(uname -s)/$(uname -m) != Darwin/arm64 || ! -t 0 ]]; then
  printf 'Run this launcher in Terminal on an Apple Silicon Mac.\n' >&2; exit 2
fi
closed() {
  local code=0
  /usr/bin/pgrep -x Claude >/dev/null || code=$?
  if [[ "$code" -gt 1 ]]; then printf 'Could not inspect Claude process state.\n' >&2; exit 2; fi
  [[ "$code" == 1 ]]
}
if [[ "${1:-}" == --restore && $# -eq 2 ]]; then
  [[ "$2" =~ ^/private/tmp/recall-activity-live\.[A-Za-z0-9]{8}$ && -O "$2" && ! -L "$2" ]] || exit 2
  closed || { printf 'Quit Claude with Command-Q first.\n'; exit 2; }
  exec "$node" "$root/app/claude-config.mjs" restore --activity-live "$2"
fi
[[ $# -eq 0 ]] || exit 2
printf 'Live Sui activity assistant. Use your own accounts.\n1. Codex CLI (ChatGPT)\n2. Claude Desktop\n'
IFS= read -r -p 'Choose [1/2]: ' client
case "$client" in
  1) unset OPENAI_API_KEY CODEX_API_KEY
     codex login status 2>&1 | /usr/bin/grep -qi 'Logged in using ChatGPT' || {
       printf 'Run codex login and sign in with ChatGPT first.\n'; exit 2; } ;;
  2) [[ -d /Applications/Claude.app || -d "$HOME/Applications/Claude.app" ]] || exit 2
     while ! closed; do IFS= read -r -p 'Quit Claude with Command-Q, then press Enter. ' ignored; done ;;
  *) exit 2 ;;
esac
printf 'Limits: 2 Tatum reads (4 included credits), 2 sponsored Walrus writes, 2 content reads. No paid fallback.\n'
IFS= read -r -p 'Type YES to connect your own Walrus test account: ' answer
[[ "$answer" == YES ]] || exit 0
run=$(mktemp -d /private/tmp/recall-activity-live.XXXXXXXX)
mkdir -m 700 "$run/client" "$run/client/.git" "$run/profile"
printf 'Private run directory: %s\n' "$run"
configured=0
cleanup() {
  rm -f -- "$run/tatum.key"
  if [[ "$configured" == 1 ]]; then
    if closed; then "$node" "$root/app/claude-config.mjs" restore --activity-live "$run" || true
    else printf 'Quit Claude, then restore: bash activity-live.command --restore %q\n' "$run"; fi
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
printf 'At the memory choice, use 2 (save only when asked). Never approve a paid wallet operation.\n'
(
  cd -- "$run/client"
  /usr/bin/env -i PATH=/usr/bin:/bin MEMWAL_CREDS_DIR="$run/profile" MEMWAL_AUTO_SAVE=0 \
    "$node" "$root/mcp/node_modules/@mysten-incubation/memwal-mcp/dist/bin/memwal-mcp.js" \
    login --prod --label 'Recall Lab isolated check'
)
IFS= read -r -p 'Sui Mainnet wallet to report on: ' wallet
IFS= read -r -p 'First transaction digest: ' first
IFS= read -r -p 'Second transaction digest: ' second
printf 'Open Tatum Account: confirm FREE and at least 4 included credits remaining.\n'
IFS= read -r -p 'Tatum Account ID (24 hex characters): ' account
IFS= read -r -p 'Remaining included credits shown now (e.g. 99976 or 99,976): ' credits
IFS= read -r -s -p 'Paste this account’s existing Mainnet API key (hidden), then Enter: ' secret
printf '\n'
printf '%s' "$secret" > "$run/tatum.key"
unset secret
IFS= read -r -p 'Confirm current FREE plan and sponsored Walrus, additional spend $0. Type YES: ' answer
[[ "$answer" == YES ]] || exit 0
"$node" --disable-warning=ExperimentalWarning "$root/app/activity-setup.ts" "$run" "$wallet" "$first" "$second" "$account" "$credits"
printf 'Read both selected transactions within 5 minutes of this billing check. Stop on any error.\n'
printf 'First chat: report on the first transaction; explain an observed address; confirm the preview to save.\n'
printf 'New chat: report on the second transaction; check the recalled blob ID; correct the address explanation, confirm and export CSV.\n'
if [[ "$client" == 1 ]]; then
  "$node" "$root/app/activity-codex.mjs" "$root" "$run"
  IFS= read -r -p 'Enter NEW to open a fresh conversation with the same memory and remaining limits: ' answer
  if [[ "$answer" == NEW ]]; then
    "$node" --disable-warning=ExperimentalWarning "$root/app/activity-resume.ts" --inspect "$run"
    printf 'Recheck this Tatum account is still FREE, with at least 4 included credits, before the second chat.\n'
    IFS= read -r -p 'Current remaining included credits: ' credits
    IFS= read -r -p 'Confirm current FREE account and sponsored Walrus, additional spend $0. Type YES: ' answer
    [[ "$answer" == YES ]] || exit 0
    "$node" --disable-warning=ExperimentalWarning "$root/app/activity-resume.ts" --renew "$run" "$credits"
    "$node" "$root/app/activity-codex.mjs" "$root" "$run" --live continued
  fi
else
  "$node" "$root/app/claude-config.mjs" first --activity-live "$run"
  configured=1
  open -a Claude
  printf 'In Claude Chat use only Recall Lab activity tools. Confirm the complete address-rule preview before saving. Start a New chat for the second transaction.\n'
  IFS= read -r -p 'After testing, quit Claude with Command-Q and press Enter. ' ignored
  while ! closed; do IFS= read -r -p 'Quit Claude with Command-Q, then Enter. ' ignored; done
fi
printf 'Session ended. Receipts remain in the private directory; temporary Tatum key is deleted.\n'
