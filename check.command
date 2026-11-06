#!/bin/bash
set -euo pipefail
root=$(cd -- "$(dirname -- "$0")" && pwd -P)
node="$root/runtime/node/bin/node"
if [[ ! -x "$node" ]]; then node=$(command -v node); fi
"$node" --disable-warning=ExperimentalWarning --test "$root/app/activity.test.ts" "$root/app/activity-live.test.ts" "$root/app/activity-pilot.test.ts" "$root/app/activity-key.test.ts" "$root/app/activity-launch.test.mjs" "$root/app/activity-resume.test.ts" "$root/app/tatum.test.ts" "$root/app/agent.test.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/app/check-activity-mcp.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/app/check-activity-provider-mcp.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-activity.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-activity-model.mjs"
"$node" "$root/verify-source.mjs"
