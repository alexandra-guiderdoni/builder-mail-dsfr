const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// #216 : `.node-version` porte la version exacte de la CI ; `engines.node` annonce la plage compatible, bornée par les
// versions corrigées de CVE-2026-111497 (#152). npm avertit hors plage sans bloquer : pas d'engine-strict.
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const parse = version => version.replace(/^v/, '').split('.').map(Number);
const compare = (a, b) => a.reduce((order, part, index) => order || part - b[index], 0);
// Grammaire limitée à celle du dépôt : alternatives `>=a.b.c <d` séparées par `||`.
function satisfies(version, range) {
  return range.split('||').some(alternative => {
    const match = /^\s*>=(\d+\.\d+\.\d+)\s+<(\d+)\s*$/.exec(alternative);
    assert.ok(match, `plage non prise en charge par ce test : ${alternative}`);
    return compare(parse(version), parse(match[1])) >= 0 && parse(version)[0] < Number(match[2]);
  });
}
const exact = read('.node-version').trim();
const engines = JSON.parse(read('package.json')).engines?.node;

test('.node-version donne une version exacte, comprise dans engines.node', () => {
  assert.match(read('.node-version'), /^\d+\.\d+\.\d+\n$/);
  assert.equal(typeof engines, 'string');
  assert.equal(satisfies(exact, engines), true);
});

test('engines.node exclut les versions vulnérables et admet les branches corrigées', () => {
  for (const version of ['24.22.1', '24.30.0', '26.12.1', '26.13.0']) assert.equal(satisfies(version, engines), true, version);
  for (const version of ['24.18.0', '24.22.0', '25.0.0', '26.9.0', '26.12.0', '27.0.0', '22.23.4']) assert.equal(satisfies(version, engines), false, version);
  assert.doesNotMatch(read('.npmrc'), /engine-strict/);
});

test('les workflows lisent .node-version et ne répètent aucun numéro', () => {
  for (const workflow of ['pages.yml', 'repetition-modale.yml']) {
    const text = read(`.github/workflows/${workflow}`);
    assert.match(text, /^\s+node-version-file: '\.node-version'$/m, workflow);
    assert.doesNotMatch(text, /^\s+node-version: /m, workflow);
  }
});

test('le verrou npm et la documentation suivent la même source', () => {
  assert.equal(JSON.parse(read('package-lock.json')).packages[''].engines?.node, engines);
  for (const doc of ['README.md', 'docs/MAINTENANCE.md']) assert.match(read(doc), /`\.node-version`/, doc);
  assert.doesNotMatch(read('README.md'), new RegExp(`Node\\.js ${exact.replaceAll('.', '\\.')}`));
});
