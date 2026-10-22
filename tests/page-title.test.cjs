const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), {execFileSync} = require('node:child_process');
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['app/source/model.js', 'app/source/render.js', 'app/source/imports.js']) vm.runInThisContext(fs.readFileSync(name, 'utf8'));
const {Model: M, Render: R, Imports: I} = MailBuilder;

test('un objet vide ou blanc utilise le nom pour le seul titre HTML, sans modifier les données', () => {
  for (const subject of ['', ' \n\t ', '\u00a0']) {
    const doc = M.create('Édition & <dossier> "suivi"', [40]); doc.subject = subject;
    const before = JSON.stringify(doc), body = R.body(doc), plain = R.plain(doc);
    for (const preview of [false, true]) {
      const html = R.html(doc, preview);
      assert(html.includes('<title>Édition &amp; &lt;dossier&gt; &quot;suivi&quot;</title>'));
      assert.equal(JSON.stringify(doc), before);
    }
    assert.equal(R.body(doc), body); assert.equal(R.plain(doc), plain);
    assert.deepEqual(I.parse(before).value, doc);
  }
});

test('un objet renseigné reste prioritaire et les titres sont échappés', () => {
  const doc = M.create('Nom de travail interne', [40]); doc.subject = ' Objet & <dossier> ';
  assert(R.html(doc).includes('<title> Objet &amp; &lt;dossier&gt; </title>'));
  assert(!R.html(doc).includes('Nom de travail interne'));
  doc.subject = ''; doc.name = '</title><script>globalThis.injected=1</script>';
  const html = R.html(doc);
  assert(html.includes('<title>&lt;/title&gt;&lt;script&gt;globalThis.injected=1&lt;/script&gt;</title>'));
  assert(!/<script[\s>]/i.test(html));
});

test('le repli de titre conserve la garde des liens et exige un nom valide', () => {
  const doc = M.create('Nom du fichier', [40]); doc.subject = ''; doc.blocks[0].values.f1 = '';
  const before = JSON.stringify(doc);
  assert.throws(() => R.html(doc), e => e.linkIssue.field === 'f1');
  assert(R.html(doc, true).includes('<title>Nom du fichier</title>'));
  assert(R.html(doc, true).includes('Intitulé du lien à renseigner'));
  assert.equal(JSON.stringify(doc), before);
  for (const name of ['', '   ']) { doc.name = name; assert.throws(() => M.document(doc)); assert.throws(() => R.html(doc)); }
});
