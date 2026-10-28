const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');

function run(...flags) {
  return spawnSync('python3', ['-B', ...flags, 'tests/audit_receipt_contract.py'], {cwd: root, encoding: 'utf8', env: {...process.env, RECEIPT_NODE: process.execPath}});
}

test('le reçu d’audit refuse un état favorable sans preuve, avec les assertions Python actives', () => {
  const result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /contrôles du reçu : \d+ vérifiés/);
});

test('le reçu d’audit refuse un état favorable sans preuve, avec python3 -O', () => {
  const result = run('-O');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /contrôles du reçu : \d+ vérifiés/);
});
