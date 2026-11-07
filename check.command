#!/bin/bash
set -euo pipefail
root=$(cd -- "$(dirname -- "$0")" && pwd -P)
node="$root/runtime/node/bin/node"
if [[ ! -x "$node" ]]; then node=$(command -v node); fi
"$node" --disable-warning=ExperimentalWarning --test "$root/app/activity.test.ts" "$root/app/activity-live.test.ts" "$root/app/activity-pilot.test.ts" "$root/app/activity-key.test.ts" "$root/app/activity-launch.test.mjs" "$root/app/activity-resume.test.ts" "$root/app/tatum.test.ts" "$root/app/agent.test.mjs" "$root/app/agent-probe.test.mjs" "$root/app/agent-activity-index.test.mjs" "$root/app/agent-observer.test.mjs" "$root/app/agent-comparison.test.mjs" "$root/app/agent-provider.test.mjs" "$root/app/agent-live.test.mjs" "$root/app/agent-ordinary.test.mjs" "$root/app/agent-managed.test.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/app/check-activity-mcp.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/app/check-activity-provider-mcp.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/app/check-agent-ordinary.mjs" --compact
"$node" --disable-warning=ExperimentalWarning "$root/app/check-agent-evaluation.mjs" --compact
"$node" --disable-warning=ExperimentalWarning "$root/app/check-agent-managed.mjs" --compact
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-activity.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-activity-model.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-agent-probe.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-wallet-model-probe.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-memory-comparison.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-experience-continuation.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-agent-walrus-gate.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-agent-live-trial.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-candidate-readiness.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-ordinary-provider.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-candidate-evaluation.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-ordinary-managed.mjs"
"$node" --disable-warning=ExperimentalWarning "$root/evidence/verify-ordinary-live.mjs"
"$node" "$root/verify-source.mjs"
