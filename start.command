#!/bin/bash
set -euo pipefail
umask 077
root=$(cd -- "$(dirname -- "$0")" && pwd -P)
node="$root/runtime/node/bin/node"
if [[ ! -x "$node" ]]; then node=$(command -v node); fi
case "${1:-}" in
  --check) exec bash "$root/check.command" ;;
  --example) exec "$node" --disable-warning=ExperimentalWarning "$root/app/activity-mcp.mjs" --example ;;
  --mcp)
    [[ $# -eq 2 || ( $# -eq 3 && "$3" == --capture-local ) ]] || exit 2
    mkdir -p -m 700 -- "$2"
    if [[ $# -eq 3 ]]; then
      exec "$node" --disable-warning=ExperimentalWarning "$root/app/agent-mcp.mjs" --offline "$2" --capture-local
    fi
    exec "$node" --disable-warning=ExperimentalWarning "$root/app/agent-mcp.mjs" --offline "$2"
    ;;
  --codex)
    [[ $# -eq 2 || ( $# -eq 3 && "$3" == --capture-local ) ]] || exit 2
    mkdir -p -m 700 -- "$2"
    printf 'Synthetic Sui data and local memory. Your model account supplies inference.\n'
    exec "$node" --disable-warning=ExperimentalWarning "$root/app/agent-launch.mjs" "$root" "$2" "${3:-}"
    ;;
  *) printf 'Recall Agent development: offline tools only.\nUse --check, --example, --mcp PRIVATE_WORKSPACE [--capture-local], or --codex PRIVATE_WORKSPACE.\nNo model or provider starts by default.\n' ;;
esac
