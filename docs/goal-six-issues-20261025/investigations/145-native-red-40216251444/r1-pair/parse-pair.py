"""Offline R1 evidence validator. No browser, network, retry or input action."""
import argparse
import hashlib
import json
from pathlib import Path

SOURCE = 'f3aa8324dbcd255bddafeeb2eec559e698f6065c'
EXPECTED = {
    'loop-confirmation.cjs': '127fec761916ef3962176b981588df37443a9baaa3bf03a2de7b36fdabcefda4',
    'trace-confirmation.cjs': '065c9d06fd804c7f8adbeb5bed0210d4f6b848d8d4d310ffadc2214a533550d5',
    'prepare-comparator.py': 'e74d8d9aa39359e4fb5ce7d447090c5ddc77181f0376e6aad60d9d2599e980d8',
}
PORTABLE = {'baseline': '622a289ddbaa4fdacc0ff96ff85caba21e4ab85225c3e622dc0ecebf2d3c23f7',
            'comparator': '69b0d0ad06742ffd6e77df9a573238afd849c37628878aadcae9ee9dc5736ab9'}
HELPER = 'd56fc80d3c569c93301aea1a2e7022c9cb1a2fccc7240d3162fba7ddb65d3c3e'
SELECTORS = ['[data-action=export-mail]', '[data-action=export-document]', '[data-action=export-library]']

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def load(path):
    return json.loads(path.read_text())

def activated(trace):
    return any((row.get('kind') == 'click' and row.get('target') == 'check-confirm')
               or row.get('kind') == 'submit' for row in trace.get('rows', []))

def summarize(data, exit_status):
    assert data['source'] == SOURCE and data['passes'] == 30 and data['scenario'] == 'full'
    assert (data['platform'], data['node'], data['playwright']) == ('linux', 'v24.18.0', '1.64.1')
    assert data['observerOnly'] is True and data['timeoutChanged'] is False
    runs = data['runs']
    assert 1 <= len(runs) <= 30
    assert [run['pass'] for run in runs] == list(range(len(runs)))
    green = sum(run['status'] == 'green' for run in runs)
    red = sum(run['status'] == 'red' for run in runs)
    assert green + red == len(runs)
    assert ((green == 30 and red == 0 and exit_status == 0)
            or (red == 1 and runs[-1]['status'] == 'red' and exit_status == 1))
    confirmations = persistent = 0
    for run in runs:
        contexts = run['contexts']
        assert [c['index'] for c in contexts] == list(range(1, len(contexts)+1))
        assert len(contexts) <= 9
        if run['status'] == 'green':
            assert len(contexts) == 9
            for context in contexts:
                assert [e['selector'] for e in context['exports']] == SELECTORS
                assert all(e.get('filename') and '\ufffd' not in e['filename'] for e in context['exports'])
        for context in contexts:
            for export in context['exports']:
                if export['selector'] == SELECTORS[0] and export.get('filename'):
                    assert activated(export.get('afterDownloadTrace') or export), 'mail without DOM activation'
                    confirmations += 1
        signal = run.get('red', {})
        if signal.get('kind') == 'persistent-confirmation-without-DOM-activation':
            assert run['status'] == 'red' and signal['persistent'] is True
            context = next(c for c in contexts if c['index'] == signal['contextIndex'])
            export = next(e for e in context['exports'] if e['selector'] == signal['selector'])
            assert export['initialCandidate'] is True and not export.get('filename')
            assert export['state']['dialog'] is True and not activated(export)
            assert export['finalTrace']['state']['dialog'] is True and not activated(export['finalTrace'])
            assert export['downloadError']['name'] == 'TimeoutError'
            assert 'download' in export['downloadError']['message'] and '30000' in export['downloadError']['message']
            persistent += 1
    exports = [e for run in runs for c in run['contexts'] for e in c['exports']]
    return {'passesObserved': len(runs), 'green': green, 'red': red, 'persistentRed': persistent,
            'exports': len(exports), 'downloads': sum(bool(e.get('filename')) for e in exports),
            'initialSuspicions': sum(bool(e.get('initialCandidate')) for e in exports),
            'transientACK': sum(bool(e.get('transientAck')) for e in exports),
            'mailConfirmations': confirmations,
            'browserVersions': sorted(set(run['browserVersion'] for run in runs))}

def verdict(baseline, comparator):
    # A green control always means no reproduction, even if the other arm failed.
    if baseline['green'] == 30:
        return 'non-reproduction-no-fix-proof'
    if baseline['persistentRed'] == 1 and comparator['green'] == 30:
        return 'candidate-supported-in-this-pair'
    return 'comparator-not-supported'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--evidence', required=True)
    ap.add_argument('--snapshot', required=True)
    ap.add_argument('--comparator', required=True)
    ap.add_argument('--host', required=True)
    ap.add_argument('--output', required=True)
    args = ap.parse_args()
    here, evidence = Path(__file__).resolve().parent, Path(args.evidence).resolve()
    receipt = {'verdict': 'invalid-or-incomplete', 'arms': {}, 'automaticReplay': False,
               'sourceHashes': {}, 'snapshotHashes': {}, 'observations': 'exact-R1-no-new-browser-reads'}
    try:
        host = load(Path(args.host)); receipt['host'] = host
        assert (host['os'], host['release'], host['architecture']) == ('ubuntu', '26.04', 'x86_64')
        assert host['source'] == SOURCE
        for name, expected in EXPECTED.items():
            receipt['sourceHashes'][name] = sha(here/name)
            assert receipt['sourceHashes'][name] == expected
        prep = load(evidence/'comparator-preparation.json'); receipt['preparation'] = prep
        assert prep['source'] == SOURCE and prep['trackedFileCount'] == 742 and prep['unchangedFileCount'] == 738
        assert prep['cspUnchanged'] is True and prep['scriptBytesUnchanged'] is True
        assert set(prep['changes']) == {'app/source/style.css', 'app/distribution/portable.html', 'app/distribution/web/index.html', 'app/distribution/web/sw.js'}
        statuses = load(evidence/'pair-exit-status.json'); receipt['exitStatuses'] = statuses
        for arm, app in [('baseline', Path(args.snapshot)), ('comparator', Path(args.comparator))]:
            for name in ('loop-confirmation.cjs', 'trace-confirmation.cjs'):
                actual = sha(evidence/arm/name)
                receipt['sourceHashes'][arm+'/'+name] = actual
                assert actual == EXPECTED[name]
            portable, helper = sha(app/'app/distribution/portable.html'), sha(app/'tests/browser-support.cjs')
            receipt['snapshotHashes'][arm] = {'portable': portable, 'helper': helper}
            assert portable == PORTABLE[arm] and helper == HELPER
            receipt['arms'][arm] = summarize(load(evidence/arm/'result.json'), statuses[arm])
        baseline, comparator = receipt['arms']['baseline'], receipt['arms']['comparator']
        assert baseline['browserVersions'] == comparator['browserVersions'] == ['156.0.8078.4']
        receipt['verdict'] = verdict(baseline, comparator)
        receipt['stopAfterThisPair'] = True
        return 1 if receipt['verdict'] == 'comparator-not-supported' else 0
    except Exception as error:
        receipt['validationError'] = f'{type(error).__name__}: {error}'
        return 1
    finally:
        receipt['parserSHA256'] = sha(Path(__file__).resolve())
        Path(args.output).write_text(json.dumps(receipt, indent=2)+'\n')
        print(json.dumps(receipt, indent=2))

if __name__ == '__main__':
    raise SystemExit(main())
