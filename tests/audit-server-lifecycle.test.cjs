const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('la campagne ferme le serveur qu’elle a lancé et jamais un serveur préexistant', () => {
  const result = spawnSync('python3', ['-B', 'tests/audit_server_lifecycle_contract.py'], {cwd: root, encoding: 'utf8', timeout: 90000});
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /cycle de vie du serveur de recette : \d+ vérifications/);
});
