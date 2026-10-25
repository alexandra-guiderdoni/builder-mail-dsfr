"""Collect one natively completed ShipGuard attempt, never discover artifacts by glob."""
import datetime
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parents[3]
artifacts = pathlib.Path(__file__).resolve().parent
location = json.loads((artifacts / 'run-location.json').read_text())
run_dir = pathlib.Path(location['run_dir'])
dispatch_path = run_dir / 'dispatch.json'
dispatch = json.loads(dispatch_path.read_text())
zone_id = sys.argv[1]
entry = next(e for e in dispatch['entries'] if e['zone_id'] == zone_id and e['status'] == 'running')
worktree = pathlib.Path(entry['worktree_path']).resolve()
registered = subprocess.check_output(['git', '-C', str(root), 'worktree', 'list', '--porcelain'], text=True)
assert f'worktree {worktree}\n' in registered
assert subprocess.check_output(['git', '-C', str(worktree), 'rev-parse', 'HEAD'], text=True).strip() == dispatch['base_sha']
source = worktree / entry['artifact']
assert source.resolve() == source and source.is_relative_to(worktree)
data = json.loads(source.read_text())
for key in ['run_id', 'base_sha', 'zone_id', 'round', 'agent_id']:
    assert data[key] == entry[key], (key, data.get(key), entry[key])
assert data['candidate_overlay_sha256'] == dispatch['candidate_overlay_sha256']
assert isinstance(data['bugs'], list)
assert isinstance(data['files_audited'], int)
for item in json.loads((artifacts / 'auditable-manifest.json').read_text()):
    assert hashlib.sha256((worktree / item['path']).read_bytes()).hexdigest() == item['sha256'], item['path']
retained = subprocess.check_output(['git', '-C', str(worktree), 'ls-files', '--stage', '--', entry['artifact']], text=True)
assert retained.strip(), 'artifact retention missing'
assert subprocess.check_output(['git', '-C', str(worktree), 'diff', '--cached', '--name-only'], text=True).strip() == '', 'staged contents unexpected'
required = {'id', 'severity', 'category', 'file', 'line', 'title', 'description', 'fix_tier', 'fix_tier_reason', 'fix_applied', 'fix_evidence', 'negative_evidence'}
for bug in data['bugs']:
    assert required <= bug.keys()
    assert bug['severity'] in {'critical', 'high', 'medium', 'low'}
    assert bug['fix_tier'] in {'mechanical', 'test-first', 'human-only'}
    assert bug['fix_applied'] is False and bug['fix_evidence'] is None
destination = root / entry['artifact']
destination.parent.mkdir(parents=True, exist_ok=True)
assert not destination.exists()
shutil.copy2(source, destination)
assert source.read_bytes() == destination.read_bytes()
entry.update(status='completed', completed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(), accepted_artifact=entry['artifact'], artifact_sha256=hashlib.sha256(destination.read_bytes()).hexdigest(), retention_index=retained.strip(), source_manifest_unchanged=True)
dispatch['accepted_artifacts'].append(entry['artifact'])
temporary = dispatch_path.with_suffix('.tmp')
temporary.write_text(json.dumps(dispatch, indent=2) + '\n')
temporary.replace(dispatch_path)
print(json.dumps({'zone': zone_id, 'files_audited': data['files_audited'], 'bugs': len(data['bugs']), 'accepted': entry['artifact'], 'sha256': entry['artifact_sha256']}))
