const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), {execFileSync} = require('node:child_process');
const catalog = JSON.parse(execFileSync('python3', ['-B', '-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8', maxBuffer: 20 * 1024 * 1024}));
const scope = {window: {MailBuilder: {catalog}}, crypto: require('node:crypto').webcrypto, URL, atob, btoa}; vm.createContext(scope);
for (const file of ['model.js', 'render.js']) vm.runInContext(fs.readFileSync('app/source/' + file, 'utf8'), scope);
const {Model: M, Render: R} = scope.window.MailBuilder;

test('les 52 exports et aperçus ne diffusent plus la propriété inconnue font-color', () => {
  for (const component of catalog.components) {
    const doc = M.create('Couleurs', [component.id]), before = JSON.stringify(doc);
    for (const preview of [false, true]) assert(!/\bfont-color\s*:/i.test(R.html(doc, preview)), component.id);
    assert.equal(JSON.stringify(doc), before);
  }
});

test('seules les quinze déclarations qualifiées sont retirées du CSS dérivé', () => {
  assert.equal(catalog.id, '6ca8ea12a0dcbdd6e59f287b6435b06367b8a44c4278f74858e8cddd6e72af8b');
  assert.equal(catalog.reference_sha256, '5ba14f67952bc10d1356abf8bdcbd7f3d6028a8b45f0ce968927c6444e4c3dd5');
  assert.equal([...catalog.css.matchAll(/\bfont-color\s*:/g)].length, 15);
  assert.equal(catalog.renderCss, catalog.css.replace(/^[ \t]*font-color: #[0-9a-fA-F]{6} !important;\r?\n/gm, ''));
  assert.equal(catalog.components.length, 52);
  assert.equal(catalog.components.reduce((count, component) => count + component.fields.length, 0), 178);
});

test('une dérive de sélecteur, valeur, priorité, nombre ou propriété arrête la compilation', () => {
  const result = execFileSync('python3', ['-B', '-c', `
from scripts.catalogue import compile_catalogue
from scripts.mail_layout import render_css
css=compile_catalogue()['css']
mutations=[css.replace('body {','body.autre {',1),css.replace('font-color: #ffffff','font-color: #000000',1),css.replace('font-color: #ffffff !important;','font-color: #ffffff;',1),css.replace('font-color: #ffffff !important;','',1),css+'\\n.inattendu { font-color: #ffffff !important; }',css.replace('font-color: #ffffff','font-color-autre: #ffffff',1)]
for changed in mutations:
    assert changed != css
    try: render_css(changed)
    except ValueError: pass
    else: raise AssertionError('Dérive de couleur acceptée')
print('DERIVES_CSS_REFUSEES_6')
`], {encoding: 'utf8'});
  assert.equal(result.trim(), 'DERIVES_CSS_REFUSEES_6');
});
