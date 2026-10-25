#!/bin/sh
set -eu
cd /proof/snapshot
export PLAYWRIGHT_MODULE=/deps/playwright
export NODE_PATH=/deps
export PATH=/proof/node-v24.18.0-linux-arm64/bin:$PATH
node -e 'const p=require("/deps/playwright"); (async()=>{const b=await p.chromium.launch(); console.log(JSON.stringify({node:process.version,arch:process.arch,playwright:require("/deps/playwright/package.json").version,browser:b.version()}));await b.close()})()' > /proof/environment.json
cat /etc/os-release > /proof/os-release.txt
set +e
node --test --test-reporter=tap --test-name-pattern='écriture concurrente pendant' tests/restore-after-refusal-browser.test.cjs > /proof/exact-original.log 2>&1
original=$?
TRACE130=/proof/natural-trace.jsonl node --test --test-reporter=tap --test-name-pattern='écriture concurrente pendant' tests/instrumented.test.cjs > /proof/natural.log 2>&1
natural=$?
CONTROL130=remove-marker TRACE130=/proof/controlled-trace.jsonl node --test --test-reporter=tap --test-name-pattern='écriture concurrente pendant' tests/instrumented.test.cjs > /proof/controlled.log 2>&1
controlled=$?
printf '{"originalExit":%s,"naturalExit":%s,"controlledExit":%s}\n' "$original" "$natural" "$controlled" > /proof/results.json
cat /proof/results.json
[ "$original" = 0 ] && [ "$natural" = 0 ] && [ "$controlled" = 1 ]
