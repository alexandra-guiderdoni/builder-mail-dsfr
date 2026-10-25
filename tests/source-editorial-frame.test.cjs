// Issue PR #128 (constat P2 Astra) : le lien source doit être inséré dans le cadre
// éditorial (table 496 px) du bloc, pas dans une sous-table (vignette 135 px de
// mail-31 ou sous-colonne 236 px de mail-46), et pas dans un td par erreur.
//
// Ces tests déterminent la table-parent du lien source par parsing DOM indépendant
// du helper d'injection : on repart de l'index du lien dans la chaîne et on remonte
// par une pile LIFO des <table>/</table> ouvertes du début jusqu'à cette position.
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

// Pile des tables ouvertes à la position d'un repère ; renvoie l'ouverture (`<table ...>`)
// qui est l'ancêtre direct, puis les ouvertures encore ouvertes à l'index donné.
function openingAncestorsAt(html, index) {
  const re = /<(table|\/table)\b[^>]*>/gi;
  const stack = [];
  let m;
  while ((m = re.exec(html)) && m.index < index) {
    if (m[0].startsWith('</')) stack.pop();
    else stack.push(m[0]);
  }
  return stack;
}

// Trouve l'ancêtre `<table ...>` le plus proche du repère.
function nearestTableOpen(html, needle) {
  const idx = html.indexOf(needle);
  assert.ok(idx >= 0, `Lien source introuvable dans le HTML (${needle}).`);
  const stack = openingAncestorsAt(html, idx);
  assert.ok(stack.length > 0, "Le lien source n'est contenu dans aucune table.");
  return stack[stack.length - 1];
}

// Extrait la largeur rendue (px) d'une balise `<table ...>` depuis son style ou son
// attribut width ; renvoie 0 si aucune largeur fixe en pixels n'est trouvée.
function tableWidthPx(openTag) {
  const styleMatch = openTag.match(/\bstyle="([^"]*)"/i);
  if (styleMatch) {
    const w = styleMatch[1].match(/(?:^|[;\s])width\s*:\s*(\d+)px/i);
    if (w) return Number(w[1]);
  }
  const attr = openTag.match(/\bwidth="(\d+)"/i);
  return attr ? Number(attr[1]) : 0;
}

// Nom de balise de l'ouverture (`table`, `td`...) extrait d'un tag ouvrant.
function tagName(openTag) {
  const m = openTag.match(/^<\s*([a-zA-Z]+)/);
  return m ? m[1].toLowerCase() : '';
}

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
  const parent = nearestTableOpen(html, SOURCE_ANCHOR_PREFIX);
  const width = tableWidthPx(parent);
  assert.equal(tagName(parent), 'table', 'Le parent immédiat du lien source doit être une balise <table>.');
  assert.equal(width, 496, `Le lien source doit vivre dans le cadre éditorial 496 px, trouvé ${width} px. Ouverture: ${parent}`);
});

test("mail-46 : le lien source n'est pas inséré dans un <td> et vit dans le cadre éditorial 496 px", () => {
  const doc = M.create('mail-46', [46]);
  const b = doc.blocks[0];
  b.source = 'https://exemple.invalid/source';
  b.sourceLabel = 'Lire la source';
  const html = R.html(doc, true);
  const parent = nearestTableOpen(html, SOURCE_ANCHOR_PREFIX);
  assert.equal(tagName(parent), 'table', `Le parent immédiat doit être <table>, pas ${tagName(parent)}. Ouverture: ${parent}`);
  const width = tableWidthPx(parent);
  assert.equal(width, 496, `Le lien source doit vivre dans le cadre éditorial 496 px, trouvé ${width} px. Ouverture: ${parent}`);
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
  const stack = openingAncestorsAt(html, html.indexOf(SOURCE_ANCHOR_PREFIX));
  // Aucune des tables ouvertes au-dessus du lien ne doit avoir une largeur
  // inférieure à 496 px (toute table de 135 ou 236 est une sous-table).
  for (const open of stack) {
    const w = tableWidthPx(open);
    if (w) assert.ok(w >= 496, `Table ancêtre de largeur ${w} px (<496) détectée au-dessus du lien source : ${open}`);
  }
});
