'use strict';
const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {loadBuilder, readDocument, writeDocument} = require('../scripts/builder-document.cjs');
const {audit, starters, selection, seed} = require('../scripts/layouts.cjs');
const {fixture} = require('./catalogue-fixture.cjs');
const {root} = require('./builder-root.cjs');
const A = loadBuilder(root), coverage = audit(A);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'newsletter-layouts-'));
after(() => fs.rmSync(temporary, {recursive: true}));

test('couvrir exactement les 52 composants des neuf familles et détecter une évolution inconnue', () => {
  assert.equal(coverage.complete, true); assert.equal(coverage.total, 52); assert.equal(coverage.covered, 52);
  assert.equal(coverage.families.length, 9);
  const ids = coverage.families.flatMap(group => group.components.map(c => c.id));
  assert.equal(new Set(ids).size, 52);
  assert.deepEqual(ids.slice().sort(), A.catalog.components.map(c => c.id).sort());
  const changed = audit({...A, catalog: {...A.catalog, components: [...A.catalog.components, {...A.catalog.components[0], id: 'mail-99'}]}});
  assert.equal(changed.complete, false); assert.deepEqual(changed.unknown, ['mail-99']);
});

for (const component of A.catalog.components) test(`${component.id} : champs, liens et images conservés dans le rendu natif`, () => {
  const doc = fixture(A), block = doc.blocks.find(b => b.component === component.id);
  const single = {...doc, blocks: [block]}, html = A.Render.html(single), plain = A.Render.plain(single);
  const escaped = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  for (const field of component.fields) {
    assert.ok(html.includes(escaped(block.values[field.key])), `${component.id}.${field.key}`);
    if (field.type !== 'image') assert.ok(plain.includes(block.values[field.key]));
  }
  assert.ok(html.includes(block.source)); assert.ok(html.includes(block.sourceLabel));
  assert.ok(!html.includes('<exemple>'));
});

test('lire les trois départs natifs et assembler aussi des composants répétés', () => {
  const values = starters(root);
  assert.deepEqual(Object.keys(values).sort(), ['information', 'invitation', 'lettre']);
  for (const [key, indices] of Object.entries(values)) {
    const doc = seed(A, root, '@' + key, 'Squelette de recette');
    assert.deepEqual(JSON.parse(JSON.stringify(doc.blocks.map(b => b.component))), indices.map(n => `mail-${String(n).padStart(2, '0')}`));
    A.Render.html(doc);
  }
  assert.deepEqual(selection(A, root, 'mail-05,mail-19,mail-19'), ['mail-05', 'mail-19', 'mail-19']);
  assert.throws(() => seed(A, root, '@absent', 'Recette'), /inconnue/);
  assert.throws(() => seed(A, root, 'mail-99', 'Recette'), /inconnu/);
});

test('livrer le format natif et refuser de remplacer une sortie existante', () => {
  const doc = fixture(A), output = path.join(temporary, 'sortie');
  writeDocument(A, doc, output);
  const loaded = readDocument(A, path.join(output, 'composition.json'));
  assert.equal(JSON.stringify(loaded), JSON.stringify(doc));
  assert.equal(fs.readFileSync(path.join(output, 'newsletter.html'), 'utf8'), A.Render.html(doc));
  assert.equal(fs.readFileSync(path.join(output, 'newsletter.txt'), 'utf8'), A.Render.plain(doc));
  assert.throws(() => writeDocument(A, doc, output), /EEXIST/);
});

test('annoncer un squelette à personnaliser et échouer sans fichier sur composant absent', () => {
  const script = path.join(__dirname, '../scripts/layouts.cjs');
  const output = path.join(temporary, 'invitation');
  const result = spawnSync(process.execPath, [script, 'seed', root, '@invitation', 'Invitation de recette', output], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.status, 'SQUELETTE'); assert.ok(receipt.fields.length);
  assert.ok(readDocument(A, path.join(output, 'composition.json')));
  const absent = path.join(temporary, 'absent');
  assert.equal(spawnSync(process.execPath, [script, 'seed', root, 'mail-99', 'Refus', absent]).status, 1);
  assert.ok(!fs.existsSync(absent));
});
