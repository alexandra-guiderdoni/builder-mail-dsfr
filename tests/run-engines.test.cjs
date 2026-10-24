const test = require('node:test');
const assert = require('node:assert/strict');
const {parseTap, classify, summarize, exitCode, selectFiles} = require('./run-engines.cjs');
const tap = [
  'TAP version 13', '# Subtest: réussi', 'ok 1 - réussi', '  ---', '  duration_ms: 3', '  ...',
  '# Subtest: échoué', 'not ok 2 - échoué', '  ---', '  duration_ms: 4', "  error: 'valeur attendue'", '  ...',
  'ok 3 - ignoré # SKIP pas de collage réel', 'ok 4 - à faire # TODO plus tard', '1..4'
].join('\n');
test('la sortie TAP donne un résultat par test, avec le message d’échec et la raison d’un test ignoré', () => {
  assert.deepEqual(parseTap(tap), [
    {name: 'réussi', status: 'pass'},
    {name: 'échoué', status: 'fail', message: 'valeur attendue'},
    {name: 'ignoré', status: 'skip', reason: 'pas de collage réel'},
    {name: 'à faire', status: 'todo', reason: 'plus tard'}
  ]);
});
test('un échec absent du registre est un échec produit ; un échec inscrit prend la classe et la raison du registre', () => {
  const registry = [{engine: 'webkit', file: 'a.test.cjs', test: 'échoué', class: 'automation', reason: 'API absente'}, {engine: 'webkit', file: 'a.test.cjs', test: 'largeur', class: 'product', reason: 'défaut connu', issue: '#39'}];
  assert.deepEqual(classify({engine: 'webkit', file: 'a.test.cjs', name: 'échoué', status: 'fail'}, registry), {class: 'automation', reason: 'API absente'});
  assert.deepEqual(classify({engine: 'webkit', file: 'a.test.cjs', name: 'largeur', status: 'fail'}, registry), {class: 'product', reason: 'défaut connu', issue: '#39', known: true});
  assert.deepEqual(classify({engine: 'webkit', file: 'a.test.cjs', name: 'autre', status: 'fail'}, registry), {class: 'product', known: false});
  assert.deepEqual(classify({engine: 'firefox', file: 'a.test.cjs', name: 'échoué', status: 'fail'}, registry), {class: 'product', known: false});
});
test('le bilan sépare réussites, échecs produit, limitations d’automatisation, ignorés et moteur indisponible', () => {
  const results = [
    {engine: 'webkit', file: 'a', name: '1', status: 'pass'},
    {engine: 'webkit', file: 'a', name: '2', status: 'fail', class: 'product', known: false},
    {engine: 'webkit', file: 'a', name: '3', status: 'fail', class: 'product', known: true},
    {engine: 'webkit', file: 'a', name: '4', status: 'fail', class: 'automation'},
    {engine: 'webkit', file: 'a', name: '5', status: 'skip', reason: 'x'}
  ];
  const report = summarize(results, [{engine: 'firefox', reason: 'exécutable absent'}]);
  assert.deepEqual(report.engines.webkit, {pass: 1, productUnknown: 1, productKnown: 1, automation: 1, skipped: 1, total: 5});
  assert.deepEqual(report.unavailable, [{engine: 'firefox', reason: 'exécutable absent'}]);
});
test('le code de sortie échoue sur un échec produit inconnu, signale un moteur absent, et accepte seulement le reste', () => {
  const ok = {engines: {webkit: {pass: 3, productUnknown: 0, productKnown: 1, automation: 1, skipped: 1, total: 6}}, unavailable: []};
  assert.equal(exitCode(ok), 0);
  assert.equal(exitCode({...ok, unavailable: [{engine: 'firefox', reason: 'absent'}]}), 2);
  assert.equal(exitCode({engines: {webkit: {...ok.engines.webkit, productUnknown: 1}}, unavailable: [{engine: 'firefox', reason: 'absent'}]}), 1);
});
test('seuls les fichiers qui lancent un navigateur sont rejoués par moteur', () => {
  const sources = {'a-browser.test.cjs': "const b = await chromium.launch();", 'b.test.cjs': "assert.equal(1, 1);", 'c.test.cjs': "const {chromium} = require('./browser-support.cjs'); test('x', async () => { const browser = await chromium.launch({headless: true}); });"};
  assert.deepEqual(selectFiles(sources), ['a-browser.test.cjs', 'c.test.cjs']);
});
test('chaque entrée du registre désigne un test existant, un moteur connu, une classe valide et une raison', () => {
  const fs = require('node:fs'), path = require('node:path');
  const {ENGINES} = require('./run-engines.cjs'), {entries} = JSON.parse(fs.readFileSync(path.join(__dirname, 'engine-expectations.json'), 'utf8'));
  for (const e of entries) {
    assert(ENGINES.includes(e.engine), `moteur inconnu : ${e.engine}`);
    assert(['product', 'automation'].includes(e.class), `classe invalide : ${e.class}`);
    assert(e.reason && e.reason.length > 20, `raison absente : ${e.test}`);
    assert(!e.issue || /^#\d+$/.test(e.issue), `issue mal formée : ${e.issue}`);
    assert(fs.readFileSync(path.join(__dirname, e.file), 'utf8').includes(e.test), `test absent de ${e.file} : ${e.test}`);
  }
  assert.equal(new Set(entries.map(e => [e.engine, e.file, e.test].join('|'))).size, entries.length, 'entrée en double');
});
