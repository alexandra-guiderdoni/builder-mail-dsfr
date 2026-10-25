// Issue #71 : le lien source d'un article vit DANS le cadre visuel du bloc,
// pas dans une table séparée en dessous.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['app/source/model.js', 'app/source/render.js', 'app/source/imports.js']) vm.runInThisContext(fs.readFileSync(name, 'utf8'));
const {Model: M, Render: R} = MailBuilder;

// Localise le dernier <table ...> qui porte class="wlkm-cl darkmode" dans result,
// trouve son </table> fermant par comptage de balance, et renvoie le sous-fragment.
function wlkmClFragment(html) {
  const key = 'class="wlkm-cl darkmode"';
  const pos = html.lastIndexOf(key);
  if (pos < 0) return null;
  const openStart = html.lastIndexOf('<table', pos);
  const openEnd = html.indexOf('>', pos) + 1;
  const re = /<\/?table\b[^>]*>/gi;
  re.lastIndex = openEnd;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('</')) { depth--; if (depth === 0) return html.slice(openStart, m.index + m[0].length); }
    else depth++;
  }
  return null;
}

test("le lien source d'un article vit dans le cadre wlkm-cl du bloc", () => {
  const doc = M.create('Source dans le cadre', [19]);
  doc.blocks[0].source = 'https://exemple.invalid/article';
  doc.blocks[0].sourceLabel = 'Lire la source';
  const html = R.html(doc);
  const fragment = wlkmClFragment(html);
  assert.ok(fragment, 'Le bloc expose bien une table wlkm-cl.');
  assert.ok(fragment.includes('href="https://exemple.invalid/article"'), "Le lien source est inclus dans la table wlkm-cl du bloc.");
  assert.ok(fragment.includes('Lire la source</a>'), "L'intitulé personnalisé est bien dans le cadre du bloc.");
});

test("aucune table enveloppe de 600px n'est ajoutée pour le lien source", () => {
  const doc = M.create('Pas de wrapper', [19]);
  doc.blocks[0].source = 'https://exemple.invalid/article';
  const html = R.html(doc);
  assert.ok(!/max-width:600px;margin-left:auto;margin-right:auto"><tr><td style="padding:8px 52px 20px/.test(html),
    "La table enveloppe héritée de l'ancien rendu n'est plus émise.");
});

test("sur un article mail-31 texte, le lien source reste dans le cadre éditorial", () => {
  // mail-31 index 31 (0-based) ; variante texte quand f0 (image) est vide
  const doc = M.create('Article texte', [31]);
  const b = doc.blocks[0];
  b.values.f0 = ''; // force la variante articleTextTemplate
  b.values.f3 = 'https://exemple.invalid/cible';
  b.values.f4 = 'Titre';
  b.source = 'https://exemple.invalid/source';
  b.sourceLabel = 'Consulter la publication';
  const html = R.html(doc);
  const fragment = wlkmClFragment(html);
  assert.ok(fragment, 'La variante articleTextTemplate expose wlkm-cl.');
  assert.ok(fragment.includes('Consulter la publication</a>'),
    "Le lien source est à l'intérieur du même cadre que le titre.");
});

test("fallback 'Consulter la source' et échappement conservés dans le cadre", () => {
  const doc = M.create('Fallback', [19]);
  doc.blocks[0].source = 'https://exemple.invalid/x?a=1&b=2';
  doc.blocks[0].sourceLabel = '';
  const html = R.html(doc);
  const fragment = wlkmClFragment(html);
  assert.ok(fragment.includes('Consulter la source</a>'));
  assert.ok(fragment.includes('href="https://exemple.invalid/x?a=1&amp;b=2"'));
});
