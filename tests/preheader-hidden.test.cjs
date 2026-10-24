const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');

// #41 : contrat du pré-en-tête masqué (mail-00), vérifié sur le rendu produit par Render.
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['model.js', 'render.js']) vm.runInThisContext(fs.readFileSync('app/source/' + name, 'utf8'), {filename: name});
const {Model: M, Render: R} = MailBuilder;
const hiding = ['display:none', 'max-height:0', 'overflow:hidden', 'mso-hide:all'];
const compose = (...texts) => {
  const doc = M.create('Pré-en-tête', [0, 5]);
  texts.slice(1).forEach(() => doc.blocks.unshift(M.create('x', [0]).blocks[0]));
  doc.blocks.filter(b => b.component === 'mail-00').forEach((b, i) => { b.values.f0 = texts[i]; });
  return doc;
};
// Style en ligne de l'élément qui porte le texte du pré-en-tête, quel que soit le chemin.
const holder = (html, text) => {
  const at = html.indexOf(text); assert.ok(at >= 0, 'texte absent : ' + text);
  const open = html.lastIndexOf('<', html.lastIndexOf('style="', at) );
  return html.slice(open, at);
};

for (const [path, render] of [['export', d => R.html(d)], ['aperçu', d => R.html(d, true)]]) {
  test(`le texte de mail-00 est porté par un élément masqué (${path})`, () => {
    const html = render(compose('Texte de pré-en-tête de recette'));
    const open = holder(html, 'Texte de pré-en-tête de recette').replace(/\s+/g, '');
    for (const declaration of hiding) assert.ok(open.includes(declaration), `${path} : ${declaration} manquant dans ${open}`);
  });
  test(`seul le premier mail-00 est rendu, en tête du corps (${path})`, () => {
    const html = render(compose('Premier pré-en-tête', 'Second pré-en-tête'));
    assert.ok(html.includes('Premier pré-en-tête'));
    assert.ok(!html.includes('Second pré-en-tête'));
    const body = html.slice(html.indexOf('<body'));
    assert.ok(body.indexOf('Premier pré-en-tête') < body.indexOf('<table'), 'le pré-en-tête précède le premier tableau');
  });
}

test('un mail-00 placé après d’autres blocs est rendu en tête', () => {
  const doc = M.create('Ordre', [5, 0]); doc.blocks[1].values.f0 = 'Pré-en-tête en fin de liste';
  const body = R.html(doc).slice(R.html(doc).indexOf('<body'));
  assert.ok(body.indexOf('Pré-en-tête en fin de liste') < body.indexOf('<table'));
});

test('un avertissement signale plusieurs mail-00 et rien pour un seul', () => {
  assert.deepEqual(R.warnings(compose('Seul')), []);
  const warnings = R.warnings(compose('A', 'B', 'C'));
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /seul le premier/i);
  assert.match(warnings[0], /3/);
});

test('une ancienne composition avec mail-00 reste valide et inchangée dans le modèle', () => {
  const doc = compose('A', 'B'), before = JSON.stringify(doc);
  assert.doesNotThrow(() => M.document(doc));
  R.html(doc); R.plain(doc);
  assert.equal(JSON.stringify(doc), before, 'le rendu ne modifie pas la composition');
  assert.equal(doc.blocks.filter(b => b.component === 'mail-00').length, 2, 'les deux blocs restent dans la composition');
});

test('le texte brut ne reprend que le premier mail-00', () => {
  const plain = R.plain(compose('Premier', 'Second'));
  assert.ok(plain.includes('Premier')); assert.ok(!plain.includes('Second'));
});
