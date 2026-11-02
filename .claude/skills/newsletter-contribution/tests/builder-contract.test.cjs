'use strict';
const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {loadBuilder, writeDocument} = require('../scripts/builder-document.cjs');
const {audit, seed} = require('../scripts/layouts.cjs');
const {verify, assertVerified} = require('../scripts/builder-contract.cjs');
const {root} = require('./builder-root.cjs');
const A = loadBuilder(root);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'newsletter-contract-'));
after(() => fs.rmSync(temporary, {recursive: true}));
const altered = (id, patch) => ({...A, catalog: {...A.catalog, components: A.catalog.components.map(c => c.id === id ? {...c, ...patch(c)} : c)}});
const field = (id, index, patch) => altered(id, c => ({fields: c.fields.map((f, i) => i === index ? {...f, ...patch} : f)}));

// Contrat du consommateur (#197) : ce que le skill remplit et cite bloque ; un renommage d'interface ne bloque pas.
test('le builder de ce dépôt respecte le contrat du skill', () => {
  const result = verify(A);
  assert.equal(result.unchanged, true, JSON.stringify(result));
  assert.deepEqual(result.formats, {local: [1], remote: [2], assigned: [1, 2]});
  assert.equal(audit(A).complete, true);
});
test('un libellé, une valeur par défaut ou un style modifiés ne bloquent pas la fabrication', () => {
  assert.equal(verify(field('mail-31', 0, {label: 'Libellé renommé'})).unchanged, true);
  assert.equal(verify(field('mail-31', 4, {default: 'Autre exemple'})).unchanged, true);
  assert.equal(verify({...A, catalog: {...A.catalog, layoutCss: A.catalog.layoutCss + '\n/* variante */'}}).unchanged, true);
});
test('une clé, un type, un gabarit ou un libellé de composant modifiés sont signalés', () => {
  for (const changed of [field('mail-31', 4, {type: 'url'}), field('mail-31', 0, {key: 'g0'}),
    altered('mail-31', c => ({semanticTemplate: c.semanticTemplate + '<!-- variante -->'})), altered('mail-31', () => ({label: 'Autre nom'}))]) {
    const result = verify(changed);
    assert.deepEqual(result.components, ['mail-31']); assert.equal(audit(changed).inventoryComplete, true); assert.equal(audit(changed).complete, false);
  }
});
test('une fonction utilisée absente bloque avant écriture', () => {
  const changed = {...A, Render: {...A.Render, clipboardHtml: undefined}};
  assert.deepEqual(verify(changed).missingApi, ['Render.clipboardHtml']);
  assert.throws(() => assertVerified(changed), /PRÉREQUIS TECHNIQUE/);
  assert.throws(() => seed(changed, root, '@lettre', 'Recette'), /contrat/);
  const output = path.join(temporary, 'refus');
  assert.throws(() => writeDocument(changed, A.Model.create('Recette', [5]), output), /contrat/);
  assert.ok(!fs.existsSync(output));
});
test('une version de composition nouvelle ou une image distante en version 1 changent le contrat', () => {
  const accepting = rule => ({...A, Model: {...A.Model, document: doc => rule(doc) ? doc : A.Model.document(doc)}});
  assert.equal(verify(accepting(doc => doc.version === 3)).formatsChanged, true);
  assert.equal(verify(accepting(doc => doc.version === 1)).formatsChanged, true);
  assert.equal(verify({...A, Model: {...A.Model, versions: doc => { doc.version = 1; }}}).formatsChanged, true);
});
test('une image distante se fabrique en version 2 et son adresse est rendue', () => {
  const index = A.catalog.components.findIndex(c => c.fields.some(f => f.type === 'image'));
  const key = A.catalog.components[index].fields.find(f => f.type === 'image').key, address = 'https://example.org/visuel.png';
  const doc = A.Model.create('Image distante', [index]); doc.blocks[0].remoteImages = {[key]: address};
  assert.throws(() => A.Model.document(doc), /version 2/);
  A.Model.versions(doc); assert.equal(doc.version, 2);
  const output = path.join(temporary, 'distante'); writeDocument(A, doc, output);
  assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'composition.json'), 'utf8')).version, 2);
  assert.ok(fs.readFileSync(path.join(output, 'newsletter.html'), 'utf8').includes(`src="${address}"`));
});
// Libellés d'interface que les références demandent d'activer : ils doivent exister dans le shell du builder.
const UI_LABELS = ['Copier le courriel', 'Importer du JSON'];
test('les libellés d’interface cités par les références existent dans le builder', () => {
  const skill = path.join(__dirname, '..'), shell = fs.readFileSync(path.join(root, 'app/source/shell.html'), 'utf8');
  const cited = [path.join(skill, 'SKILL.md'), ...fs.readdirSync(path.join(skill, 'references')).map(name => path.join(skill, 'references', name))]
    .map(file => fs.readFileSync(file, 'utf8')).join('\n');
  for (const label of UI_LABELS) { assert.ok(cited.includes(`« ${label} »`), `${label} n’est plus cité`); assert.ok(shell.includes(label), `${label} absent du builder`); }
});
test('la vérification ne réécrit jamais le contrat de référence', () => {
  const lock = path.join(__dirname, '../assets/builder-contract.json'), before = fs.readFileSync(lock, 'utf8');
  verify(field('mail-31', 4, {type: 'url'})); assert.equal(fs.readFileSync(lock, 'utf8'), before);
});
