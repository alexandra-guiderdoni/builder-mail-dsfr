const test = require('node:test'), assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const catalog = JSON.parse(execFileSync('python3', ['-B', '-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8', maxBuffer: 20 * 1024 * 1024}));

test('HTML des images : hauteur auto en CSS et dimensions numériques conservées', () => {
  for (const component of catalog.components) {
    assert(!/<img\b[^>]*\bheight="auto"/.test(component.semanticTemplate), component.id);
    const dimensions = template => [...template.matchAll(/<img\b[^>]*>/g)].map(([tag]) => [...tag.matchAll(/\b(width|height)="(\d+)"/g)].map(([, key, value]) => [key, value]));
    assert.deepEqual(dimensions(component.semanticTemplate), dimensions(component.template), component.id);
  }
  assert.match(catalog.components[6].semanticTemplate, /<img\b[^>]*style="[^"]*height:auto/);
});

test('HTML des tableaux : aucune déclaration CSS de dimension vide', () => {
  assert.match(catalog.components[33].template, /width=""/);
  for (const component of catalog.components) assert(!/\b(?:width|height)\s*:\s*;/.test(component.semanticTemplate), component.id);
});

test('HTML des tableaux : attributs colpos de la référence retirés du rendu dérivé', () => {
  assert.match(catalog.components[46].template, /colpos="left"/);
  assert.match(catalog.components[46].template, /colpos="right"/);
  for (const component of catalog.components) assert(!/\bcolpos\s*=/.test(component.semanticTemplate), component.id);
  assert.equal(catalog.id, '6ca8ea12a0dcbdd6e59f287b6435b06367b8a44c4278f74858e8cddd6e72af8b');
});

test('une dimension inconnue ou une signature colpos altérée est refusée', () => {
  const result = execFileSync('python3', ['-B', '-c', `
from scripts.catalogue import compile_catalogue
from scripts.mail_layout import css_template, Fragment
c=compile_catalogue()['components']
mutations=[(6,c[6]['template'].replace('height="auto"','height="inconnue"')),(33,c[33]['template'].replace('width=""','width="inconnue"')),(46,c[46]['template'].replace('colpos="right"','colpos="left"')),(19,c[19]['template'].replace('<table','<table colpos="left"',1))]
for index,source in mutations:
    assert source != c[index]['template']
    try: css_template(index,source)
    except ValueError: pass
    else: raise AssertionError('Signature invalide acceptée')
fragment=Fragment(c[6]['template'])
image=next(n for n in fragment.root.elements() if n.tag=='img')
image.attrs['style']='height:24px;'+image.attrs.get('style','')
source=fragment.root.source()
# Les styles préexistants suivent le repli et gardent leur priorité de cascade.
rendered=css_template(6,source)
image=next(n for n in Fragment(rendered).root.elements() if n.tag=='img')
heights=[declaration.strip() for declaration in image.attrs['style'].split(';') if declaration.strip().startswith('height:')]
assert heights==['height:auto','height:24px']
print('DERIVES_REFUSEES_4_ET_PRIORITE_CSS')
`], {encoding: 'utf8'});
  assert.equal(result.trim(), 'DERIVES_REFUSEES_4_ET_PRIORITE_CSS');
});
