#!/usr/bin/env python3
"""Reconstruct the recorded disposable fixtures; never run a browser or replace differing files."""
from pathlib import Path
import difflib
import hashlib
import json
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
REF = 'ce1768f2798454326ed1687c37aaf05aa34c8d0d'
PREFIX = 'docs/goal-six-issues-20261025/investigations/timeouts/'


def blob(name):
    return subprocess.check_output(['git', 'show', REF + ':' + PREFIX + name], cwd=ROOT)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def put(path, data):
    if path.exists():
        if path.is_symlink() or path.read_bytes() != data:
            raise ValueError('Existing fixture differs; preserved: ' + str(path))
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as handle:
        handle.write(data)


def prepare():
    payloads = {}
    cpu = HERE / 'local-cpu-study'
    expected_cpu = json.loads((cpu / 'source-proof.json').read_text())
    with tempfile.TemporaryDirectory(prefix='builder-145-reconstruct-') as directory:
        temporary = Path(directory)
        for name in ['prepare-export-traced.py', 'trace-export.cjs']:
            (temporary / name).write_bytes(blob(name))
        output = temporary / 'export-traced'
        subprocess.run([sys.executable, str(temporary / 'prepare-export-traced.py'), '--repo', str(ROOT), '--output', str(output)], check=True, stdout=subprocess.DEVNULL)
        name = 'tests/export-names-browser.test.cjs'
        data = (output / name).read_text()
        assert digest(data.encode()) == expected_cpu['enrichedTestBeforeCpuSha256']
        before = "p => p.clock.setFixedTime(FIXED)"
        after = "async p => { const cpuSession = await p.context().newCDPSession(p); await cpuSession.send('Emulation.setCPUThrottlingRate', {rate: 4}); await p.clock.setFixedTime(FIXED); }"
        changed = data.replace(before, after, 1)
        diff = ''.join(difflib.unified_diff(data.splitlines(True), changed.splitlines(True), fromfile='enriched-ce1768f', tofile='enriched-ce1768f-cpu4'))
        assert diff.encode() == (cpu / 'cpu-only.diff').read_bytes()
        for name, hashes in expected_cpu['files'].items():
            content = changed.encode() if name == 'tests/export-names-browser.test.cjs' else (output / name).read_bytes()
            assert digest(content) == hashes['study'], name
            payloads[cpu / 'snapshot' / name] = content
        payloads[cpu / 'trace-export.cjs'] = (temporary / 'trace-export.cjs').read_bytes()

    proof = HERE / 'durable-diagnostic-proof'
    expected = json.loads((proof / 'source-proof.json').read_text())['sourceSha256']
    for name, checksum in expected.items():
        content = (ROOT / name).read_bytes()
        assert digest(content) == checksum, 'Checkout the published diagnostic source before reconstruction: ' + name
        if name == 'tests/export-names-browser.test.cjs':
            original = content.decode()
            changed = original.replace('saved, click, confirmChecks', 'saved, click: realClick, confirmChecks', 1)
            anchor = "const {attachExportDiagnostics, recordExportPhase, exportDiagnosticError} = require('./export-diagnostics.cjs');"
            assert changed.count(anchor) == 1
            changed = changed.replace(anchor, anchor + "\n// Counterexample only: artificial activation rejection, never a product hypothesis.\nconst click = async (page, selector) => { if (selector === '[data-action=export-mail]') throw new Error('CONTROL145_ACTIVATION_REJECTED'); return realClick(page, selector); };")
            diff = ''.join(difflib.unified_diff(original.splitlines(True), changed.splitlines(True), fromfile='current-source', tofile='disposable-activation-rejection'))
            assert diff.encode() == (proof / 'counterexample-only.diff').read_bytes()
            content = changed.encode()
        payloads[proof / 'counterexample' / name] = content
    for path, content in payloads.items():
        put(path, content)
    print(json.dumps({'reconstructedOrVerifiedFiles': len(payloads), 'browsersRun': 0, 'replacedDifferingFiles': 0}))


if __name__ == '__main__':
    prepare()
