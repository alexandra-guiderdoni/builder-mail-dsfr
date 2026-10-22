const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['app/source/model.js', 'app/source/render.js', 'app/source/imports.js']) vm.runInThisContext(fs.readFileSync(name, 'utf8'));
const {Model: M, Render: R, Imports: I} = MailBuilder;

test('un intitulé personnalisé est conservé dans le contrat et échappé dans le HTML et le texte', () => {
  const doc = M.create('Intitulés', [19]), b = doc.blocks[0];
  b.source = 'https://exemple.invalid/article'; b.sourceLabel = 'Lire « État & numérique » <dossier>';
  assert.equal(M.document(doc), doc);
  assert(R.html(doc).includes('Lire « État &amp; numérique » &lt;dossier&gt;</a>'));
  assert(R.plain(doc).includes(b.sourceLabel + '\n' + b.source));
  const restored = I.parse(JSON.stringify(doc)).value;
  assert.equal(restored.blocks[0].sourceLabel, b.sourceLabel);
  assert.equal(M.clone(restored).blocks[0].sourceLabel, b.sourceLabel);
  b.source = ''; assert(!R.html(doc).includes('Lire « État &amp;'));
  assert.equal(b.sourceLabel, 'Lire « État & numérique » <dossier>');
});

test('les anciens fichiers et les intitulés vides gardent le texte par défaut sans modifier les données', () => {
  const doc = M.create('Ancien fichier', [19]); doc.blocks[0].source = 'https://exemple.invalid/article';
  const old = JSON.stringify(doc); assert.doesNotThrow(() => M.document(doc));
  assert(R.html(doc).includes('Consulter la source</a>')); assert.equal(JSON.stringify(doc), old);
  for (const value of ['', '   ']) { doc.blocks[0].sourceLabel = value; assert.doesNotThrow(() => M.document(doc)); assert(R.html(doc).includes('Consulter la source</a>')); }
  for (const value of [null, 3, {}, []]) { doc.blocks[0].sourceLabel = value; assert.throws(() => M.document(doc)); }
  delete doc.blocks[0].sourceLabel; doc.blocks[0].unknown = ''; assert.throws(() => M.document(doc));
});

test('les modèles et identités conservent les intitulés après export et fusion de bibliothèque', () => {
  const lib = M.initial(), doc = lib.documents[0]; doc.blocks[0].sourceLabel = 'Notre service'; doc.blocks[0].source = 'https://exemple.invalid/service';
  lib.templates.push(M.clone(doc, 'Modèle')); lib.identities.push({id: M.id(), name: 'Service', blocks: [M.copy(doc.blocks[0])]});
  const merged = I.merge(M.initial(), I.parse(JSON.stringify(lib)));
  for (const item of [merged.documents.at(-1), merged.templates[0], merged.identities[0]]) assert.equal(item.blocks[0].sourceLabel, 'Notre service');
});
