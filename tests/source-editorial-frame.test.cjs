// Issue PR #128 (constat P2 Astra) : le lien source doit être inséré dans le cadre
// éditorial (table 496 px) du bloc, pas dans une sous-table (vignette 135 px de
// mail-31 ou sous-colonne 236 px de mail-46), et pas dans un td par erreur.
//
// Ces tests inspectent la parenté du HTML source, sans laisser un DOM réparer les
// rangées mal imbriquées. L’oracle a ses propres témoins et mutants purs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['app/source/model.js', 'app/source/render.js', 'app/source/imports.js']) vm.runInThisContext(fs.readFileSync(name, 'utf8'));
const {Model: M, Render: R} = MailBuilder;

// Image base64 valide (PNG 1x1) utilisée pour la variante vignette de mail-31 ;
// la validation du modèle exige un data:image/* au Base64 décodable avec les
// bons entêtes. Ce PNG transparent 1x1 passe la validation sans embarquer un
// gros binaire dans le fichier de test.
const VALID_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const {assertEditorialSource, tableWidthPx} = require('./editorial-oracle.cjs');

// Marqueur stable sans ambiguïté : l'ancre complète du lien source émise par
// injectSourceLink utilise toujours l'attribut style="color:#000091".
const SOURCE_ANCHOR_PREFIX = '<a href="https://exemple.invalid/source" style="color:#000091"';

test("mail-31 avec vignette : le lien source est inséré dans le cadre éditorial 496 px, pas dans la table 135 px de l'image", () => {
  const doc = M.create('mail-31 vignette', [31]);
  const b = doc.blocks[0];
  // Variante avec vignette : f0 (image) est renseigné avec un data:image valide.
  b.values.f0 = VALID_PNG;
  b.values.f1 = 'Vignette';
  b.values.f3 = 'https://exemple.invalid/cible';
  b.values.f4 = 'Titre';
  b.source = 'https://exemple.invalid/source';
  b.sourceLabel = 'Lire la source';
  const html = R.html(doc);
  const result = assertEditorialSource(html, SOURCE_ANCHOR_PREFIX);
  assert.equal(result.rowParent.tag, 'table', 'La rangée source est enfant direct de la table éditoriale.');
  assert.equal(result.width, 496);
});

test("mail-46 : le lien source n'est pas inséré dans un <td> et vit dans le cadre éditorial 496 px", () => {
  const doc = M.create('mail-46', [46]);
  const b = doc.blocks[0];
  b.source = 'https://exemple.invalid/source';
  b.sourceLabel = 'Lire la source';
  const html = R.html(doc, true);
  const result = assertEditorialSource(html, SOURCE_ANCHOR_PREFIX);
  assert.equal(result.rowParent.tag, 'table', 'La rangée source n’est pas insérée dans un td.');
  assert.equal(result.width, 496);
});

test("mail-31 avec vignette : la nouvelle rangée du lien n'est pas enfant de la sous-table 135 px", () => {
  const doc = M.create('mail-31 vignette (anti-régression)', [31]);
  const b = doc.blocks[0];
  b.values.f0 = VALID_PNG;
  b.values.f1 = 'Vignette';
  b.values.f3 = 'https://exemple.invalid/cible';
  b.values.f4 = 'Titre';
  b.source = 'https://exemple.invalid/source';
  const html = R.html(doc);
  const stack = assertEditorialSource(html, SOURCE_ANCHOR_PREFIX).tables;
  // Aucune des tables ouvertes au-dessus du lien ne doit avoir une largeur
  // inférieure à 496 px (toute table de 135 ou 236 est une sous-table).
  for (const open of stack) {
    const w = tableWidthPx(open.opening);
    if (w) assert.ok(w >= 496, `Table ancêtre de largeur ${w} px (<496) détectée au-dessus du lien source : ${open.opening}`);
  }
});
