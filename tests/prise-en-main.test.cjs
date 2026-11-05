const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), guide = path.join(root, 'docs/PRISE-EN-MAIN.md');

// Le guide de prise en main cite l'interface entre « » : chaque citation doit exister telle quelle dans la version web
// construite (interface, moteur et catalogue), sinon le guide décrit un libellé qui n'existe plus. Seuls les exemples
// de saisie en sont exclus.
const TYPED = new Set(['bouton']);
const sources = () => fs.readFileSync(path.join(root, 'app/distribution/web/index.html'), 'utf8');

test('prise en main : chaque libellé cité existe dans l’atelier', () => {
  const text = fs.readFileSync(guide, 'utf8'), haystack = sources();
  const quoted = [...new Set([...text.matchAll(/«\s([^»]+?)\s»/g)].map(m => m[1]))].filter(label => !TYPED.has(label));
  assert.ok(quoted.length >= 20, `trop peu de libellés relevés : ${quoted.length}`);
  assert.deepEqual(quoted.filter(label => !haystack.includes(label)), []);
});

test('prise en main : chaque capture citée existe', () => {
  const text = fs.readFileSync(guide, 'utf8'), images = [...text.matchAll(/!\[[^\]]+\]\(([^)]+)\)/g)].map(m => m[1]);
  assert.equal(images.length, 7);
  assert.deepEqual(images.filter(image => !fs.existsSync(path.join(path.dirname(guide), image))), []);
});
