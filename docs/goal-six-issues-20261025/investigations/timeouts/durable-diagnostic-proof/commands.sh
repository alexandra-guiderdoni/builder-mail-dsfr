#!/bin/sh
set -eu
proof=docs/goal-six-issues-20261025/investigations/timeouts/durable-diagnostic-proof
export PLAYWRIGHT_MODULE=/Users/alex/Claude/git-hors-workflow/builder-mail-dsfr/node_modules/playwright
export MAIL_BUILDER_ENGINE=chromium
node -e 'console.log(JSON.stringify({platform:process.platform,arch:process.arch,node:process.version,playwright:require(process.env.PLAYWRIGHT_MODULE+"/package.json").version}))' > "$proof/environment.json"
date -u +%FT%TZ > "$proof/started-at.txt"
set +e
node --test --test-reporter=tap tests/export-names-browser.test.cjs > "$proof/current-four.log" 2>&1
current_exit=$?
node --unhandled-rejections=strict --trace-warnings --test --test-reporter=tap --test-name-pattern='noms des fichiers exportés, trois types d’export \(Chromium\)$' "$proof/counterexample/tests/export-names-browser.test.cjs" > "$proof/activation-rejection.log" 2>&1
counter_exit=$?
node --unhandled-rejections=strict --trace-warnings "$proof/snapshot-deadline-probe.cjs" > "$proof/snapshot-deadline.log" 2>&1
snapshot_exit=$?
set -e
date -u +%FT%TZ > "$proof/finished-at.txt"
printf '{"currentExit":%s,"activationCounterExit":%s,"snapshotCounterExit":%s}\n' "$current_exit" "$counter_exit" "$snapshot_exit" > "$proof/results.json"
cat "$proof/results.json"
[ "$current_exit" = 0 ] && [ "$counter_exit" = 1 ] && [ "$snapshot_exit" = 0 ]
