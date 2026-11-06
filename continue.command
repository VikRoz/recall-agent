#!/bin/bash
set -euo pipefail
set -o noclobber
umask 077
root=$(cd -- "$(dirname -- "$0")" && pwd -P)
node="$root/runtime/node/bin/node"
if [[ ! -x "$node" ]]; then node=$(command -v node); fi
[[ $# -eq 1 && -t 0 && $(uname -s)/$(uname -m) == Darwin/arm64 ]] || {
  printf 'In Terminal run bash start.command --continue PRIVATE_RUN_DIR.\n' >&2; exit 2;
}
run=$1
"$node" --disable-warning=ExperimentalWarning "$root/app/activity-resume.ts" --inspect "$run"
unset OPENAI_API_KEY CODEX_API_KEY
codex login status 2>&1 | /usr/bin/grep -qi 'Logged in using ChatGPT' || {
  printf 'Sign into Codex with ChatGPT first.\n' >&2; exit 2;
}
printf 'Continue the same run: 1 Tatum read, 1 sponsored write, 2 content reads remain. No first-write repeat.\n'
printf 'Open the same Tatum account and check current FREE status and at least 4 included credits.\n'
IFS= read -r -p 'Remaining included credits shown now: ' credits
IFS= read -r -s -p 'Paste the SAME existing Mainnet API key (hidden), then Enter: ' secret
printf '\n'
# Exclusive creation: never overwrite a key left by an active or interrupted process.
printf '%s' "$secret" > "$run/tatum.key"
unset secret
cleanup() { rm -f -- "$run/tatum.key"; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
IFS= read -r -p 'Confirm current FREE account, sponsored Walrus and additional spend $0. Type YES: ' answer
[[ "$answer" == YES ]] || exit 0
"$node" --disable-warning=ExperimentalWarning "$root/app/activity-resume.ts" --renew "$run" "$credits"
printf 'Opening the SECOND conversation. Request only the second transaction and its stored context.\n'
"$node" "$root/app/activity-codex.mjs" "$root" "$run" --live continued
