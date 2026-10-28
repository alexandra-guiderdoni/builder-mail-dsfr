const test = require('node:test');
const assert = require('node:assert/strict');
const {assertEditorialSource} = require('./editorial-oracle.cjs');
const needle = '<a href="https://exemple.invalid/source" style="color:#000091"';
const link = needle + '>Lire la source</a>';
const row = `<tr><td>${link}</td></tr>`;

test('oracle éditorial : la rangée valide appartient vraiment à la table de 496 px', () => {
  const html = `<table width="620"><tr><td><table style="width:496px">${row}</table></td></tr></table>`;
  const result = assertEditorialSource(html, needle);
  assert.equal(result.rowParent.tag, 'table'); assert.equal(result.width, 496);
});
test('oracle éditorial : le mutant tr dans td est rejeté par sa parenté, pas sa largeur', () => {
  const html = `<table width="496"><tr><td>${row}</td></tr></table>`;
  assert.throws(() => assertEditorialSource(html, needle), /source-row-parent : rangée sous td/);
});
test('oracle éditorial : le mutant largeur 135 px reste rejeté', () => {
  assert.throws(() => assertEditorialSource(`<table width="135">${row}</table>`, needle), /source-editorial-width/);
});
test('oracle éditorial : une table étroite au-dessus du cadre ne disparaît pas de la preuve', () => {
  const html = `<table width="236"><tr><td><table width="496">${row}</table></td></tr></table>`;
  assert.throws(() => assertEditorialSource(html, needle), /source-subtable-width/);
});
test('oracle éditorial : une section tbody explicite conserve la parenté réelle', () => {
  const result = assertEditorialSource(`<table width="496"><tbody>${row}</tbody></table>`, needle);
  assert.equal(result.rowParent.tag, 'tbody'); assert.equal(result.table.tag, 'table');
});
test('oracle éditorial : commentaires, attributs et balises vides ne faussent pas la pile', () => {
  const html = `<!-- <table width="135"><tr><td> --><table data-label="a > b" width="496"><tr><td><img src="x"><br>${link}</td></tr></table>`;
  assert.equal(assertEditorialSource(html, needle).width, 496);
  assert.throws(() => assertEditorialSource(`<!-- <table width="496">${row}</table> -->`, needle), /source-marker/);
});
test('oracle éditorial : lien absent, dupliqué ou dans un texte brut ne qualifie pas la source', () => {
  assert.throws(() => assertEditorialSource('<table></table>', needle), /source-marker/);
  assert.throws(() => assertEditorialSource(`<table width="496">${row}${row}</table>`, needle), /source-marker/);
  assert.throws(() => assertEditorialSource(`<script>${link}</script>`, needle), /source-marker/);
});


test('oracle éditorial : seuls les attributs width/style exacts définissent la largeur', () => {
  for (const attrs of [
    'data-width="496" width="135"',
    'data-style="width:496px" style="width:135px"',
    `data-label='width="496"' width="135"`,
    `data-label='style="width:496px"' style="width:135px"`,
    'aria-width="496" width="135"',
    'data-width="496"', 'data-style="width:496px"'
  ]) assert.throws(() => assertEditorialSource(`<table ${attrs}>${row}</table>`, needle), /source-editorial-width/, attrs);
  for (const attrs of ['width="496"', "WIDTH='496'", 'width=496', 'style="width:496px"', "style='color:red;width:496px;'", 'data-width="135" width="496"', `data-label='width="135"' width="496"`]) {
    assert.equal(assertEditorialSource(`<table ${attrs}>${row}</table>`, needle).width, 496, attrs);
  }
});
