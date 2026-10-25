#!/bin/sh
set -eu
cd /proof/snapshot
export PLAYWRIGHT_MODULE=/deps/playwright NODE_PATH=/deps PATH=/proof/node-v24.18.0-linux-arm64/bin:$PATH
: > /proof/natural-trace.jsonl
: > /proof/controlled-trace.jsonl
set +e
TRACE130=/proof/natural-trace.jsonl node --test --test-reporter=tap --test-name-pattern='écriture concurrente pendant' tests/instrumented.test.cjs > /proof/natural.log 2>&1
natural=$?
CONTROL130=remove-marker TRACE130=/proof/controlled-trace.jsonl node --test --test-reporter=tap --test-name-pattern='écriture concurrente pendant' tests/instrumented.test.cjs > /proof/controlled.log 2>&1
controlled=$?
printf '{"originalExit":0,"naturalExit":%s,"controlledExit":%s,"instrumentation":"raw marker read retained"}\n' "$natural" "$controlled" > /proof/results.json
cat /proof/results.json
[ "$natural" = 0 ] && [ "$controlled" = 1 ]
