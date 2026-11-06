#!/bin/bash
set -euo pipefail
root=$(cd -- "$(dirname -- "$0")" && pwd -P)
case "${1:-}" in
  '') exec bash "$root/activity-live.command" ;;
  --offline) shift; exec bash "$root/activity.command" "$@" ;;
  --pilot-example) exec bash "$root/activity.command" --pilot-example ;;
  --check|--activity-check) exec bash "$root/check.command" ;;
  --continue) shift; exec bash "$root/continue.command" "$@" ;;
  --restore) shift; exec bash "$root/activity-live.command" --restore "$@" ;;
  *) printf 'Use bash start.command [--check | --offline | --pilot-example | --continue RUN_DIR | --restore RUN_DIR].\n' >&2; exit 2 ;;
esac
