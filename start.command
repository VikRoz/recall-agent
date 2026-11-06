#!/bin/bash
set -euo pipefail
umask 077
root=$(cd -- "$(dirname -- "$0")" && pwd -P)
node="$root/runtime/node/bin/node"
if [[ ! -x "$node" ]]; then node=$(command -v node); fi
case "${1:-}" in
  --check) [[ $# -eq 1 ]] || exit 2; exec bash "$root/check.command" ;;
  --example) shift; exec "$node" --disable-warning=ExperimentalWarning "$root/app/agent-mcp.mjs" --example "$@" ;;
  --prepare-provider-fixture)
    [[ $# -ge 2 && $# -le 3 ]] || exit 2
    workspace=$2
    shift 2
    mkdir -p -m 700 -- "$workspace"
    exec "$node" --disable-warning=ExperimentalWarning "$root/app/agent-ordinary-fixture.mjs" --prepare "$workspace" "$@"
    ;;
  --mcp|--codex)
    mode=$1
    [[ $# -ge 2 && $# -le 5 ]] || exit 2
    workspace=$2
    shift 2
    capture_seen=false
    saved_seen=false
    provider_seen=false
    for option in "$@"; do
      case "$option" in
        --capture-local) [[ "$capture_seen" == false ]] || exit 2; capture_seen=true ;;
        --saved) [[ "$saved_seen" == false ]] || exit 2; saved_seen=true ;;
        --provider-fixture) [[ "$provider_seen" == false ]] || exit 2; provider_seen=true ;;
        *) exit 2 ;;
      esac
    done
    if [[ "$provider_seen" == true ]]; then
      [[ "$saved_seen" == false && "$capture_seen" == false ]] || exit 2
    fi
    mkdir -p -m 700 -- "$workspace"
    if [[ "$mode" == --mcp ]]; then
      if [[ "$provider_seen" == true ]]; then
        exec "$node" --disable-warning=ExperimentalWarning "$root/app/agent-ordinary-fixture.mjs" --mcp "$workspace"
      fi
      exec "$node" --disable-warning=ExperimentalWarning "$root/app/agent-mcp.mjs" --offline "$workspace" "$@"
    fi
    printf 'Offline data only: synthetic by default; --saved selects a partial Mainnet replay; --provider-fixture uses intercepted SDK adapters. Model usage comes from your own account.\n'
    exec "$node" --disable-warning=ExperimentalWarning "$root/app/agent-launch.mjs" "$root" "$workspace" "$@"
    ;;
  *) printf 'Recall Agent development: offline tools only.\nUse --check, --example [--saved], --mcp PRIVATE_WORKSPACE [--capture-local] [--saved], or --codex PRIVATE_WORKSPACE [--capture-local] [--saved].\nFor intercepted provider adapters: --prepare-provider-fixture PRIVATE_WORKSPACE [--capture], then --mcp or --codex PRIVATE_WORKSPACE --provider-fixture.\nNo model or provider starts by default.\n' ;;
esac
