"""Exact #145 package/subject guards; no browser or package-manager invocation."""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

SUBJECT = '0b7adc7f18355e740f144b379f7930bf4c8c23de'
MANIFEST = '59c9d711e9c59fe60982e559af79ee5234c1a6fc729bc423f5d11b2351c0df2f'
BEFORE = {
    'tests/export-names-browser.test.cjs': 'e61e34e08b9a825e0f8ddf590445ba2360ad690a9654e735966c840ef57dc108',
    'tests/browser-support.cjs': 'd56fc80d3c569c93301aea1a2e7022c9cb1a2fccc7240d3162fba7ddb65d3c3e',
    'tests/export-diagnostics.cjs': '2114b56bd2525093037ccbfcf954687a354777b91dc02983788a88a6a9a93ec6',
    'app/distribution/portable.html': '69b0d0ad06742ffd6e77df9a573238afd849c37628878aadcae9ee9dc5736ab9',
}
OVERLAY = {
    'tests/export-names-browser.test.cjs': '15ce9dc78583b2a83b9946134495f46fa25a109ef8d07b272d3649ebab28e7b1',
    'tests/browser-support.cjs': '44c3857b41398cdc982124618cbc12f75b18fd349f21b5b7dbe58daf675b4755',
    'tests/destinations-probe.cjs': '4cb34c9fb53ea73f3ce813a5e3b700a56295a551acda0beda0f2188825dba4e6',
}
AFTER = {**BEFORE, **OVERLAY}


def digest(file):
    if file.is_symlink() or not file.is_file():
        raise ValueError(f'not a regular owned input: {file}')
    return hashlib.sha256(file.read_bytes()).hexdigest()


def verify_files(root, expected):
    actual = {name: digest(root / name) for name in expected}
    if actual != expected:
        raise ValueError(f'SHA mismatch: {actual}')
    return actual


def verify_package(probe):
    if digest(probe / 'MANIFEST.json') != MANIFEST:
        raise ValueError('frozen manifest mismatch')
    rows = json.loads((probe / 'MANIFEST.json').read_text())
    expected = {r['path']: r['sha256'] for r in rows}
    if len(rows) != 32 or len(expected) != 32:
        raise ValueError('expected exactly 32 sealed entries')
    actual_paths = {str(p.relative_to(probe)) for p in probe.rglob('*') if p.is_file()}
    if actual_paths != set(expected) | {'MANIFEST.json'}:
        raise ValueError('unexpected package file set')
    verify_files(probe, expected)
    for row in rows:
        if (probe / row['path']).stat().st_size != row['bytes']:
            raise ValueError('package size mismatch')
    inputs = json.loads((probe / 'INPUTS.json').read_text())
    if {r['path']: r['sha256'] for r in inputs} != BEFORE or any(r['commit'] != SUBJECT for r in inputs):
        raise ValueError('INPUTS differs from pinned subject')
    verify_files(probe / 'runtime', OVERLAY)


def write_json(file, value):
    with file.open('x') as stream:
        json.dump(value, stream, indent=2, ensure_ascii=False)
        stream.write('\n')


def apply_overlay(subject, probe, artifacts):
    verify_package(probe)
    before = verify_files(subject, BEFORE)
    extra = subject / 'tests/destinations-probe.cjs'
    if extra.exists() or extra.is_symlink():
        raise ValueError('observer destination already exists')
    write_json(artifacts / 'subject-before.json', {'subjectSHA': SUBJECT, 'sha256': before, 'portableFileURL': (subject / 'app/distribution/portable.html').as_uri(), 'packageManifestSHA256': MANIFEST})
    for name in OVERLAY:
        if name == 'tests/destinations-probe.cjs':
            with (subject / name).open('xb') as stream:
                stream.write((probe / 'runtime' / name).read_bytes())
        else:
            shutil.copyfile(probe / 'runtime' / name, subject / name)
    after = verify_files(subject, AFTER)
    write_json(artifacts / 'subject-after.json', {'sha256': after, 'overlayCount': 3, 'invariantsCount': 2})
    return after


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['overlay', 'after'])
    for field in ['subject', 'probe', 'artifacts']:
        parser.add_argument('--' + field, type=Path, required=True)
    args = parser.parse_args()
    subject, probe, artifacts = (p.resolve() for p in [args.subject, args.probe, args.artifacts])
    actual = subprocess.check_output(['git', '-C', str(subject), 'rev-parse', 'HEAD'], text=True).strip()
    if actual != SUBJECT:
        raise ValueError('subject commit mismatch')
    if args.mode == 'overlay':
        result = apply_overlay(subject, probe, artifacts)
    else:
        verify_package(probe)
        result = verify_files(subject, AFTER)
        write_json(artifacts / 'immediate-before-test.json', {'subjectSHA': actual, 'sha256': result})
    print(json.dumps({'mode': args.mode, 'verified': result}))


if __name__ == '__main__':
    main()
