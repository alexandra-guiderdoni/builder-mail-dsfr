const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['app/source/model.js', 'app/source/render.js', 'app/source/imports.js']) vm.runInThisContext(fs.readFileSync(name, 'utf8'));
const {Model: M, Render: R, Imports: I} = MailBuilder;
const pairs = [[1, 'f1', 'f2'], [31, 'f3', 'f4'], [33, 'f2', 'f3'], [40, 'f0', 'f1'], [41, 'f0', 'f1'], [42, 'f0', 'f1'], [43, 'f0', 'f1'], [43, 'f2', 'f3'], [45, 'f2', 'f3'], [47, 'f1', 'f2'], [48, 'f1', 'f2'], [49, 'f1', 'f2'], [50, 'f1', 'f2']];

test('les 13 associations lien/intitulé sont dérivées sans changer le catalogue canonique', () => {
  assert.equal(MailBuilder.catalog.id, '6ca8ea12a0dcbdd6e59f287b6435b06367b8a44c4278f74858e8cddd6e72af8b');
  assert.deepEqual(MailBuilder.catalog.components.flatMap(c => c.links.map(l => [Number(c.id.slice(5)), l.url, l.label])), pairs);
  assert.equal(MailBuilder.catalog.components.reduce((n, c) => n + c.fields.length, 0), 178);
});

test('la dérivation refuse les liens absents, ambigus, inconnus ou répétés', () => {
  const code = `from scripts.catalogue import link_fields
fields = [{'key':'f0','type':'url'}, {'key':'f1','type':'text'}, {'key':'f2','type':'text'}]
assert link_fields('<a href="{{f0}}"><strong>{{f1}}</strong></a>', fields) == [{'url':'f0','label':'f1'}]
for template in ['', '<a href="{{f0}}"></a>', '<a href="{{f0}}">{{f1}}{{f2}}</a>', '<a href="{{f0}}">{{f9}}</a>', '<a href="https://exemple.invalid/">{{f1}}</a>', '<a href="{{f0}}">{{f1}}</a><a href="{{f0}}">{{f1}}</a>', '<a href="{{f0}}"><span data-label="{{f1}}"></span></a>', '<a href="{{f0}}"><!--{{f1}}--></a>', '<a href="{{f0}}">{{f1}}</a>{{f1}}', '<a href="{{f0}}" role="link">{{f1}}</a>', '<a href="{{f0}}" tabindex="0">{{f1}}</a>', '<a href="{{f0}}" onclick="run()">{{f1}}</a>']:
    try: link_fields(template, fields)
    except ValueError: pass
    else: raise AssertionError(template)
print('12 mutations refusées')`;
  assert.match(execFileSync('python3', ['-c', code], {encoding: 'utf8'}), /12 mutations refusées/);
});

test('un seul des deux liens de même destination est neutralisé dans l’aperçu', () => {
  const doc = M.create('Liens de même destination', [43]), block = doc.blocks[0];
  block.values.f2 = block.values.f0; block.values.f1 = ' \t '; block.values.f3 = 'Lire le second dossier';
  const before = JSON.stringify(doc), preview = R.html(doc, true);
  assert.equal((preview.match(/Intitulé du lien à renseigner/g) || []).length, 1);
  assert.equal((preview.match(/<a\b[^>]*href=/g) || []).length, 1);
  assert(preview.includes('Lire le second dossier')); assert.equal(JSON.stringify(doc), before);
  for (const c of MailBuilder.catalog.components) { const valid = M.create('Rendu valide', [c.id]); assert.equal(R.body(valid, true), R.body(valid)); }
});

test('les 13 intitulés vides ou blancs bloquent les sorties, sans empêcher aperçu ni récupération JSON', () => {
  for (const [component, , field] of pairs) for (const value of ['', ' \n\t ']) {
    const doc = M.create('Ancien fichier', [component]); doc.blocks[0].values[field] = value;
    const before = JSON.stringify(doc), expected = {block: doc.blocks[0].id, field};
    assert.equal(M.document(doc), doc); assert.deepEqual(I.parse(before).value, doc);
    assert(R.html(doc, true).includes('Intitulé du lien à renseigner')); assert.doesNotThrow(() => R.plain(doc));
    for (const render of [R.html, R.clipboardHtml]) assert.throws(() => render(doc), error => {
      assert.equal(error.linkIssue.block, expected.block); assert.equal(error.linkIssue.field, expected.field);
      assert.match(error.message, /intitulé/i); return true;
    });
    assert.equal(JSON.stringify(doc), before);
    doc.blocks[0].values[field] = 'Lire le dossier & les suites'; assert.doesNotThrow(() => R.html(doc));
  }
});

test('les anciens modèles, identités et duplications restent importables mais ne contournent pas la garde', () => {
  const lib = M.initial(), doc = M.create('Ancienne composition', [1, 43, 47]);
  for (const block of doc.blocks) for (const [, , label] of pairs.filter(p => p[0] === Number(block.component.slice(5)))) block.values[label] = '';
  lib.documents.push(doc); lib.activeId = doc.id; lib.templates.push(M.clone(doc));
  lib.identities.push({id: M.id(), name: 'Identité ancienne', blocks: M.copy(doc.blocks.filter(b => b.component !== 'mail-43'))});
  const original = JSON.stringify(lib), merged = I.merge(M.initial(), I.parse(original));
  assert.equal(JSON.stringify(lib), original); assert.equal(R.linkIssues(merged.documents.at(-1)).length, 4);
  for (const item of [merged.documents.at(-1), merged.templates[0], M.clone(doc), {...M.create('Identité'), blocks: merged.identities[0].blocks}]) {
    assert.doesNotThrow(() => M.document(item)); assert.throws(() => R.html(item), /intitulé/i);
  }
  const repaired = merged.documents.at(-1), first = R.linkIssues(repaired)[0];
  repaired.blocks.find(b => b.id === first.block).values[first.field] = 'Intitulé corrigé';
  assert.equal(R.linkIssues(repaired).length, 3); assert.doesNotThrow(() => M.library(merged));
});

test('la copie refuse un intitulé vide avant de solliciter les capacités du presse-papiers', async () => {
  const doc = M.create('Copie refusée', [40]); doc.blocks[0].values.f1 = '';
  let reads = 0;
  const scope = {MailBuilder: {...MailBuilder, State: {guard() {}}, doc: () => doc}, navigator: {get clipboard() { reads++; throw new Error('Accès interdit pendant ce contrôle'); }}};
  scope.window = scope; vm.runInNewContext(fs.readFileSync('app/source/files.js', 'utf8'), scope);
  await assert.rejects(scope.MailBuilder.Files.copy(), /intitulé/i); assert.equal(reads, 0);
});
