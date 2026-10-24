const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const reference = path.join(root, 'prototype/reference');
const script = path.join(root, 'scripts/check_provenance.py');
const provenance = JSON.parse(fs.readFileSync(path.join(reference, 'provenance.json'), 'utf8'));
const entry = provenance.files.find(file => file.copy === 'snum-packet.js');

function copyReference() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'provenance-'));
  for (const name of ['provenance.json', 'snum-packet.js']) fs.copyFileSync(path.join(reference, name), path.join(dir, name));
  return dir;
}
function run(dir) {
  return spawnSync('python3', [script, '--dir', dir], {encoding: 'utf8'});
}

test('la provenance sépare l’empreinte amont historique de celle de la copie adaptée', () => {
  assert.equal(entry.sha256, 'c58ede03622a97bc2a48da6a330d20d19efa3d37669993e03b3a0481d17f084b');
  assert.match(entry.adapted_sha256, /^[0-9a-f]{64}$/);
  assert.notEqual(entry.adapted_sha256, entry.sha256);
  assert.ok(entry.adaptation && entry.adaptation.includes('#24'));
  assert.ok(!provenance.adaptations.some(text => /sans modification/.test(text) && /SNUM/.test(text) && !/initial|amont|historique/.test(text)),
    'la mention « copié sans modification » ne doit plus décrire la copie actuelle');
});

test('la copie adaptée correspond à son empreinte déclarée', () => {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(reference, 'snum-packet.js'))).digest('hex');
  assert.equal(actual, entry.adapted_sha256);
  const result = run(reference);
  assert.equal(result.status, 0, result.stderr + result.stdout);
});

test('l’altération d’un seul octet de la copie adaptée fait échouer le contrôle', () => {
  const dir = copyReference();
  try {
    assert.equal(run(dir).status, 0, 'la copie intacte doit passer');
    const file = path.join(dir, 'snum-packet.js');
    const bytes = fs.readFileSync(file);
    bytes[bytes.length >> 1] ^= 1;
    fs.writeFileSync(file, bytes);
    const result = run(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /snum-packet\.js/);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('l’empreinte amont historique ne peut pas remplacer celle de la copie adaptée', () => {
  const dir = copyReference();
  try {
    assert.equal(run(dir).status, 0, 'la copie intacte doit passer');
    const manifestPath = path.join(dir, 'provenance.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.files.find(file => file.copy === 'snum-packet.js').adapted_sha256 = entry.sha256;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.notEqual(run(dir).status, 0);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});
