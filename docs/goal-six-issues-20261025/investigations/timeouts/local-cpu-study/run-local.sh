#!/bin/sh
set -eu
study=docs/goal-six-issues-20261025/investigations/timeouts/local-cpu-study
export PLAYWRIGHT_MODULE=/Users/alex/Claude/git-hors-workflow/builder-mail-dsfr/node_modules/playwright
export MAIL_BUILDER_ENGINE=chromium
export EXPORT_REPLAYS=3
node -e 'const p=require(process.env.PLAYWRIGHT_MODULE);(async()=>{const b=await p.chromium.launch();try{console.log(JSON.stringify({platform:process.platform,arch:process.arch,osRelease:require("node:os").release(),node:process.version,playwright:require(process.env.PLAYWRIGHT_MODULE+"/package.json").version,browser:b.version(),cpuRate:4,replays:3,executable:p.chromium.executablePath()}));}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1})' > "$study/environment.json"
date -u +%FT%TZ > "$study/started-at.txt"
set +e
node --test --test-reporter=tap --test-name-pattern='noms des fichiers exportés, trois types d’export \(Chromium\)$' "$study/snapshot/tests/export-names-browser.test.cjs" > "$study/cpu4.log" 2>&1
replay_exit=$?
set -e
date -u +%FT%TZ > "$study/finished-at.txt"
printf '{"replayExit":%s,"cpuRate":4,"maximumReplays":3}\n' "$replay_exit" > "$study/process-result.json"
cat "$study/process-result.json"
exit "$replay_exit"
