"""Prepare a disposable f3 copy; refuse any delta beyond one CSS rule/build derivatives."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile

SOURCE = 'f3aa8324dbcd255bddafeeb2eec559e698f6065c'
PORTABLE = '622a289ddbaa4fdacc0ff96ff85caba21e4ab85225c3e622dc0ecebf2d3c23f7'
HELPER = 'd56fc80d3c569c93301aea1a2e7022c9cb1a2fccc7240d3162fba7ddb65d3c3e'
RULE = b'\nbody:has(#check-dialog[open]) #preview { pointer-events: none; }\n'
ALLOWED = {'app/source/style.css', 'app/distribution/portable.html', 'app/distribution/web/index.html', 'app/distribution/web/sw.js'}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', required=True)
    ap.add_argument('--output', required=True)
    ap.add_argument('--receipt', required=True)
    args = ap.parse_args()
    repo, output = Path(args.repo).resolve(), Path(args.output).resolve()
    assert subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip() == SOURCE
    assert not output.exists(), 'output must be new; no overwrite'
    archive = subprocess.check_output(['git', '-C', str(repo), 'archive', SOURCE])
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        original = {m.name: tar.extractfile(m).read() for m in tar.getmembers() if m.isfile()}
        # Verify baseline's working files, not just its git object, before comparing.
        assert all((repo / name).read_bytes() == data for name, data in original.items()), 'baseline working bytes differ from f3'
        output.mkdir(parents=True)
        tar.extractall(output, filter='data')
    assert sha(original['app/distribution/portable.html']) == PORTABLE
    assert sha(original['tests/browser-support.cjs']) == HELPER
    subprocess.run(['python3', 'scripts/build_app.py', '--check'], cwd=output, check=True)
    css = output / 'app/source/style.css'
    css.write_bytes(css.read_bytes() + RULE)
    subprocess.run(['python3', 'scripts/build_app.py'], cwd=output, check=True)
    changed = {name for name, data in original.items() if (output / name).read_bytes() != data}
    assert changed == ALLOWED, changed
    assert css.read_bytes() == original['app/source/style.css'] + RULE
    csp = rb'<meta http-equiv="Content-Security-Policy"[^>]*>'
    for name in ('app/distribution/portable.html', 'app/distribution/web/index.html'):
        before, after = original[name], (output / name).read_bytes()
        assert before.count(original['app/source/style.css']) == 1
        assert after == before.replace(original['app/source/style.css'], original['app/source/style.css'] + RULE, 1)
        assert re.findall(csp, before) == re.findall(csp, after) and re.findall(csp, before), 'CSP changed/missing'
        assert re.findall(rb'<script\b[^>]*>.*?</script>', before, re.S) == re.findall(rb'<script\b[^>]*>.*?</script>', after, re.S)
    # The web cache key is the sole additional generated delta; web is not exercised here.
    sw = 'app/distribution/web/sw.js'
    normalize = lambda data: re.sub(rb'[0-9a-f]{16}', b'<VERSION>', data)
    assert normalize(original[sw]) == normalize((output / sw).read_bytes())
    assert sha((output / 'tests/browser-support.cjs').read_bytes()) == HELPER
    receipt = {'source': SOURCE, 'repo': str(repo), 'comparator': str(output), 'rule': RULE.decode(), 'cspUnchanged': True,
               'scriptBytesUnchanged': True, 'originalPortableSHA256': PORTABLE, 'helperSHA256': HELPER,
               'trackedFileCount': len(original), 'unchangedFileCount': len(original)-len(changed),
               'changes': {name: {'before': sha(original[name]), 'after': sha((output/name).read_bytes())} for name in sorted(changed)}}
    Path(args.receipt).write_text(json.dumps(receipt, indent=2)+'\n')
    print(json.dumps(receipt, indent=2))

if __name__ == '__main__':
    main()
