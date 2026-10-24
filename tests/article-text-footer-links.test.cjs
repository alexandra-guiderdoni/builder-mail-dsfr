const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');

global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['model.js', 'render.js', 'imports.js']) vm.runInThisContext(fs.readFileSync('app/source/' + name, 'utf8'), {filename: name});
const {Model: M, Render: R, Imports: I} = MailBuilder;
// #42 : le seul ajout au HTML par défaut est un bloc réservé au mode sombre ; hors de ce bloc, les octets du mode clair restent ceux du catalogue v1.
const darkOnlyBlock = '@media(prefers-color-scheme:dark){\n td.wlkm-cl[style*="#585858"]{color:#CECECE!important}\n}\n';
const hash = value => createHash('sha256').update(value.replace(darkOnlyBlock, '')).digest('hex');
const mailto = 'mailto:service@example.invalid?subject=' + encodeURIComponent('S’abonner & rester informé');
const article = () => {
  const doc = M.create('Article texte', [5, 13, 31]);
  Object.assign(doc.blocks[2].values, {f0: '', f1: '', f2: '', f3: 'https://example.invalid/article', f4: 'Un titre cliquable', f5: 'CRD · Source · 23 octobre 2026', f6: ''});
  return doc;
};
const footer = () => {
  const doc = M.create('Trois liens', [50]);
  Object.assign(doc.blocks[0].values, {f0: 'Une question ?', f1: mailto, f2: 'S’abonner'});
  doc.blocks[0].additionalLinks = [
    {url: 'mailto:service@example.invalid?subject=D%C3%A9sabonnement', label: 'Se désabonner'},
    {url: 'https://example.invalid/contact?a="x"&b=<y>', label: 'Contact <équipe> & "aide"'},
  ];
  return doc;
};

test('les 52 composants gardent exactement leur HTML par défaut et le catalogue v1', () => {
  assert.equal(MailBuilder.catalog.id, '6ca8ea12a0dcbdd6e59f287b6435b06367b8a44c4278f74858e8cddd6e72af8b');
  assert.equal(MailBuilder.catalog.components.length, 52);
  assert.equal(MailBuilder.catalog.components.reduce((count, c) => count + c.fields.length, 0), 178);
  const doc = M.create('Valeurs par défaut', Array.from({length: 52}, (_, i) => i));
  assert.equal(hash(R.html(doc)), '34c9a2b3579eba44b549d15aafd460e4d4672a83d398a500f28ee942e8e666fc');
  for (const [index, expected] of [[31, '4eccb52993ec177c37d5a9a4d8abec71597576c8ec6c4e5dc23a8cac30a2faa1'], [50, '54609b46f1a7a3f20c5991476661f3fbaa2af26b435d73d0d96774409480a406']]) {
    assert.equal(hash(R.html(M.create('Valeurs par défaut', [index]))), expected);
  }
  const defaultFooter = M.create('Sans option', [50]), html = R.html(defaultFooter);
  defaultFooter.blocks[0].additionalLinks = [];
  assert.equal(R.html(defaultFooter), html);
});

test('un article texte produit un h3 cliquable, les métadonnées et une colonne fluide sans image', () => {
  const doc = article(), html = R.block(doc.blocks[2], [{rank: 1, level: 1}, {rank: 2, level: 2}]);
  assert.match(html, /<h3\b[^>]*><a href="https:\/\/example.invalid\/article"/);
  assert.match(html, /font-size:18px;line-height:26px;font-weight:700/);
  assert.match(html, /color:#000091/);
  assert.match(html, /font-size:13px;line-height:20px/);
  assert.match(html, /max-width:496px;margin:0 auto/);
  assert.doesNotMatch(html, /<img\b|data-mail-column|&nbsp;/);
  assert.ok(html.indexOf(doc.blocks[2].values.f4) < html.indexOf(doc.blocks[2].values.f5));
  assert.match(R.html(doc), /<h3\b/);
  assert.equal((html.match(/<div\b/g) || []).length, 2);
  Object.assign(doc.blocks[2].values, {f2: 'Prétexte <avant>', f6: 'Fin & suite'});
  const complete = R.block(doc.blocks[2]);
  assert.ok(complete.indexOf('Prétexte &lt;avant&gt;') < complete.indexOf('Un titre cliquable'));
  assert.ok(complete.indexOf('CRD · Source') < complete.indexOf('Fin &amp; suite'));
});

test('l’image vide est réservée au champ image du composant 31', () => {
  assert.throws(() => M.image(''), /image incorporée/);
  for (const component of MailBuilder.catalog.components) {
    for (const field of component.fields.filter(f => f.type === 'image')) {
      const block = M.createBlock(component.id); block.values[field.key] = '';
      if (component.id === 'mail-31' && field.key === 'f0') assert.doesNotThrow(() => M.block(block));
      else assert.throws(() => M.block(block), /image incorporée/, component.id + '/' + field.key);
    }
  }
});

test('import, duplication et aller-retour conservent article, extras et liens source', () => {
  const doc = article(); doc.blocks.push(footer().blocks[0]);
  for (const block of [doc.blocks[2], doc.blocks[3]]) { block.source = 'https://example.invalid/source'; block.sourceLabel = 'Source conservée'; }
  assert.deepEqual(I.parse(JSON.stringify(doc)).value, doc);
  const clone = M.clone(doc);
  assert.notEqual(clone.id, doc.id);
  clone.blocks.forEach((block, index) => {
    assert.notEqual(block.id, doc.blocks[index].id);
    assert.deepEqual({...block, id: doc.blocks[index].id}, doc.blocks[index]);
  });
  const lib = M.initial(); lib.documents.push(doc); lib.templates.push(clone);
  lib.identities.push({id: 'identite', name: 'Identité', blocks: [M.copy(doc.blocks[3])]});
  assert.deepEqual(I.parse(JSON.stringify(lib)).value, lib);
  const merged = I.merge(M.initial(), I.parse(JSON.stringify(doc)));
  assert.deepEqual(merged.documents.at(-1).blocks[3].additionalLinks, doc.blocks[3].additionalLinks);
  for (const block of [doc.blocks[2], doc.blocks[3]]) {
    block.source = mailto; assert.throws(() => M.document(doc), /HTTPS/); block.source = 'https://example.invalid/source';
  }
});

test('les trois actions du pied de page sont ordonnées, échappées et présentes en texte', () => {
  const doc = footer(), block = doc.blocks[0], html = R.block(block), plain = R.plain(doc);
  assert.equal((html.match(/<a\b/g) || []).length, 3);
  assert.ok(html.indexOf('Une question ?') < html.indexOf('S’abonner'));
  assert.ok(html.indexOf('S’abonner') < html.indexOf('Se désabonner'));
  assert.ok(html.indexOf('Se désabonner') < html.indexOf('Contact &lt;équipe&gt; &amp; &quot;aide&quot;'));
  assert.ok(html.includes('href="' + R.escape(block.additionalLinks[1].url) + '"'));
  assert.equal((html.match(/white-space:nowrap/g) || []).length, 3);
  assert.match(html, /text-align:center/);
  assert.match(html, /font-size:13px;line-height:20px/);
  assert.doesNotMatch(html, /<button\b|min-width/);
  for (const link of [{url: block.values.f1, label: block.values.f2}, ...block.additionalLinks]) {
    assert.ok(plain.includes(link.label)); assert.ok(plain.includes(link.url));
  }
  assert.ok(plain.indexOf('S’abonner') < plain.indexOf('Se désabonner'));
  assert.ok(plain.indexOf('Se désabonner') < plain.indexOf('Contact <équipe>'));
});

test('les extras sont limités à deux liens, à des clés strictes et au composant 50', () => {
  for (const additionalLinks of [null, {}, 'texte', [null], [{url: mailto}], [{url: mailto, label: 'Lien', html: '<b>'}], Array(3).fill({url: mailto, label: 'Lien'})]) {
    const doc = footer(); doc.blocks[0].additionalLinks = additionalLinks;
    assert.throws(() => M.document(doc));
  }
  for (const component of MailBuilder.catalog.components.filter(c => c.id !== 'mail-50')) {
    const block = M.createBlock(component.id); block.additionalLinks = [];
    assert.throws(() => M.block(block), /champs manquants ou inconnus/, component.id);
  }
});

test('les extras appliquent footerUrl et refusent les contrôles dans leurs libellés', () => {
  for (const url of ['http://example.invalid/', 'javascript:alert(1)', 'https://user:pass@example.invalid/', 'https://example.invalid/\n', 'mailto:service@example.invalid?bcc=autre@example.invalid', 'mailto:service@example.invalid?subject=A%250D%250AB']) {
    const doc = footer(); doc.blocks[0].additionalLinks[0].url = url;
    assert.throws(() => M.document(doc), /HTTPS|mailto/);
  }
  for (const control of ['\n', '\r', '\t', '\x00', '\x7f', '\x85', '\u2028', '\u2029']) {
    const doc = footer(); doc.blocks[0].additionalLinks[0].label = 'Avant' + control + 'Après';
    assert.throws(() => M.document(doc), /contrôle/);
  }
});

test('un libellé supplémentaire vide reste importable mais bloque la sortie et cible son champ UI', () => {
  for (const index of [0, 1]) {
    const doc = footer(); doc.blocks[0].additionalLinks[index].label = '  ';
    assert.doesNotThrow(() => I.parse(JSON.stringify(doc)));
    const issues = R.linkIssues(doc);
    assert.equal(issues.length, 1); assert.equal(issues[0].field, 'footer-label-' + index);
    assert.equal(issues[0].block, doc.blocks[0].id);
    assert.throws(() => R.assertOutput(doc), error => error.linkIssue.field === 'footer-label-' + index);
    assert.throws(() => R.html(doc), /intitulé du lien supplémentaire/);
    assert.throws(() => R.clipboardHtml(doc), /intitulé du lien supplémentaire/);
    const preview = R.html(doc, true);
    assert.ok(preview.includes('Intitulé du lien à renseigner'));
    assert.equal((preview.match(/<a\b[^>]*href=/g) || []).length, 2);
  }
});

test('le schéma conserve v1 et n’ouvre les nouvelles valeurs que pour 31 et 50', () => {
  const schema = JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;from scripts.interchange import schema;print(json.dumps(schema(compile_catalogue())))'], {encoding: 'utf8'}));
  assert.equal(schema.$defs.document.properties.version.const, 1);
  assert.equal(schema.$defs.document.properties.catalogue.const, MailBuilder.catalog.id);
  assert.equal(schema.$defs['mail-31'].properties.values.properties.f0.anyOf[0].const, '');
  assert.ok(schema.$defs['mail-30'].properties.values.properties.f0.pattern.startsWith('^data:image/'));
  const extras = schema.$defs['mail-50'].properties.additionalLinks;
  assert.equal(extras.maxItems, 2); assert.equal(extras.items.additionalProperties, false);
  assert.deepEqual(extras.items.required, ['url', 'label']);
  assert.ok(!schema.$defs['mail-50'].required.includes('additionalLinks'));
  for (const c of MailBuilder.catalog.components) if (c.id !== 'mail-50') assert.ok(!Object.hasOwn(schema.$defs[c.id].properties, 'additionalLinks'));
});
