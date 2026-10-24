const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');

global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['model.js', 'render.js', 'imports.js']) vm.runInThisContext(fs.readFileSync('app/source/' + name, 'utf8'), {filename: name});
const {Model: M, Render: R, Imports: I} = MailBuilder;
const RESIDUE = 'Alternative résiduelle synthétique';
const withoutImage = () => {
  const block = M.createBlock(31);
  Object.assign(block.values, {f0: '', f1: RESIDUE, f3: 'https://example.invalid/article', f4: 'Titre synthétique', f5: 'Métadonnées synthétiques'});
  return block;
};
const withImage = () => {
  const block = M.createBlock(31);
  Object.assign(block.values, {f1: 'Alternative conservée synthétique', f4: 'Titre avec image'});
  return block;
};
const doc = (name, blocks) => { const d = M.create(name, [5]); d.blocks.push(...blocks); return d; };
const library = () => {
  const lib = M.initial();
  lib.documents.push(doc('Composition', [withoutImage(), withImage()]));
  lib.templates.push(doc('Modèle', [withoutImage(), withImage()]));
  return lib;
};
const mail31 = d => d.blocks.filter(b => b.component === 'mail-31');
const assertClean = d => {
  const [bare, pictured] = mail31(d);
  assert.equal(bare.values.f1, '');
  assert.equal(pictured.values.f1, 'Alternative conservée synthétique');
  assert.equal(pictured.values.f0, M.createBlock(31).values.f0);
  assert.ok(!R.html(d).includes(RESIDUE));
  assert.ok(!R.plain(d).includes(RESIDUE));
  assert.ok(R.plain(d).includes('Alternative conservée synthétique'));
  assert.ok(!JSON.stringify(d).includes(RESIDUE));
};

test('l’import d’une composition vide l’alternative d’un article sans image, sans toucher aux autres champs ni au fichier source', () => {
  const source = JSON.stringify(doc('Composition', [withoutImage(), withImage()]));
  const before = JSON.parse(source), imported = I.parse(source).value;
  assertClean(imported);
  const bare = mail31(imported)[0], original = mail31(before)[0];
  assert.deepEqual({...bare.values, f1: RESIDUE}, original.values);
  assert.equal(source, JSON.stringify(before));
  assert.ok(source.includes(RESIDUE));
  assertClean(JSON.parse(JSON.stringify(imported)));
});

test('l’import d’une bibliothèque normalise compositions et modèles, et la fusion conserve le résultat', () => {
  const incoming = I.parse(JSON.stringify(library()));
  assert.equal(incoming.type, 'library');
  for (const d of [...incoming.value.documents, ...incoming.value.templates]) if (mail31(d).length) assertClean(d);
  const merged = I.merge(M.initial(), incoming);
  for (const d of [...merged.documents, ...merged.templates]) if (mail31(d).length) assertClean(d);
});

test('le rendu ne normalise rien : une alternative résiduelle déjà en mémoire n’est pas modifiée', () => {
  const d = doc('Composition', [withoutImage()]);
  R.html(d); R.plain(d);
  assert.equal(mail31(d)[0].values.f1, RESIDUE);
});

test('un import refusé laisse la bibliothèque existante intacte', async () => {
  const existing = M.initial(), snapshot = JSON.stringify(existing);
  const bad = library(); bad.templates[0].blocks[1].values.f0 = 'pas une image';
  global.MailBuilder.State = {guard() {}}; global.MailBuilder.Files = {validate: async () => {}}; global.MailBuilder.pendingInputs = 0;
  MailBuilder.library = existing;
  await assert.rejects(I.prepare(JSON.stringify(bad)), /image/i);
  assert.equal(JSON.stringify(MailBuilder.library), snapshot);
  assert.equal(JSON.stringify(existing), snapshot);
});
