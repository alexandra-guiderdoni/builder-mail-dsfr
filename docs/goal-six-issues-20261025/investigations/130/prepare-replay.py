#!/usr/bin/env python3
"""Isolated historical replay; instrumentation changes tests only, never product bytes."""
from pathlib import Path
import argparse, hashlib, json, subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--repo', default='.')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent / 'snapshot')
args = parser.parse_args()
sha = '395c08d1dfa4d0b8e41416da798bf0313a8bd379'
files = ['tests/restore-after-refusal-browser.test.cjs', 'tests/browser-support.cjs', 'app/distribution/portable.html', 'package.json', 'package-lock.json', '.github/workflows/pages.yml']
manifest = {}
for filename in files:
    data = subprocess.check_output(['git', '-C', args.repo, 'show', sha + ':' + filename])
    path = args.output / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    manifest[filename] = hashlib.sha256(data).hexdigest()
(args.output.parent / 'snapshot-manifest.json').write_text(json.dumps({'commit': sha, 'files': manifest}, indent=2) + '\n')
p = args.output / 'tests'
s = (p / 'restore-after-refusal-browser.test.cjs').read_text()
s = "const {attach, sample} = require('./trace130.cjs');\n" + s
s = s.replace("page.on('pageerror', e => errors.push(e.message));", "page.on('pageerror', e => errors.push(e.message)); await attach(page);")
s = s.replace("const refused = sessionStorage.getItem('refus-initial') === '1';", "const markerBefore130 = sessionStorage.getItem('refus-initial'); const refused = markerBefore130 === '1';")
s = s.replace('window.refusedAtStart = refused;', "console.log('[130]' + JSON.stringify({event:'init', url:location.href, origin:location.origin, documentId:performance.timeOrigin, refused, markerBefore:markerBefore130, markerAfter:sessionStorage.getItem('refus-initial')})); window.refusedAtStart = refused;")
s = s.replace("if (!refused && ++attempts === 1) { const request = {};", "if (!refused && ++attempts === 1) { console.log('[130]' + JSON.stringify({event:'artificial-refusal', documentId:performance.timeOrigin, name:args[0]})); const request = {};")
s = s.replace('return open.apply(this, args);', "console.log('[130]' + JSON.stringify({event:'native-open', documentId:performance.timeOrigin, name:args[0]})); return open.apply(this, args);")
line = "await Promise.all([page.waitForEvent('load'), click(page, '#reopen-reload')]); await page.waitForFunction(() => window.MailBuilder?.ready);"
assert s.count(line) == 2
s = s.replace(line, "await sample(page, 'before-reload'); if(process.env.CONTROL130 === 'remove-marker') { await page.evaluate(() => sessionStorage.removeItem('refus-initial')); await sample(page, 'controlled-marker-removed'); }\n    " + line + "\n    await sample(page, 'after-reload');")
(p / 'instrumented.test.cjs').write_text(s)
(p / 'trace130.cjs').write_bytes((Path(__file__).resolve().parent / 'trace130.cjs').read_bytes())
