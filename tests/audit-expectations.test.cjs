const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');

function run(...flags) {
  return spawnSync('python3', ['-B', ...flags, 'tests/audit_expectations_contract.py'], {cwd: root, encoding: 'utf8'});
}

test('l’outillage d’accessibilité vérifie les attentes et les scènes par des erreurs explicites', () => {
  const result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /attentes de l’outillage : \d+ vérifiées/);
});

test('les mêmes contrôles restent actifs avec python3 -O', () => {
  const result = run('-O');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /attentes de l’outillage : \d+ vérifiées/);
});
