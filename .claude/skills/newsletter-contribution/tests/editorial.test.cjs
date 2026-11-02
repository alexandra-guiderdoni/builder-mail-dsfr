'use strict';
const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {loadBuilder} = require('../scripts/builder-document.cjs');
const {compose, capabilities} = require('../scripts/editorial.cjs');
const {root} = require('./builder-root.cjs');
const A = loadBuilder(root);
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/editorial-example.json'), 'utf8'));
const fresh = () => structuredClone(data);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'newsletter-editorial-'));
after(() => fs.rmSync(temporary, {recursive: true}));
const cli = (...args) => spawnSync(process.execPath, [path.join(__dirname, '../scripts/editorial.cjs'), ...args], {encoding: 'utf8'});

test('conserver articles, ordre, métadonnées et trois actions dans le rendu natif', () => {
  assert.equal(capabilities(A).supported, true);
  const doc = compose(A, data);
  const articles = doc.blocks.filter(b => b.component === 'mail-31');
  const expected = data.sections.flatMap(section => section.articles);
  assert.equal(articles.length, expected.length);
  articles.forEach((block, i) => {
    assert.equal(block.values.f0, ''); assert.equal(block.values.f1, '');
    assert.equal(block.values.f3, expected[i].url); assert.equal(block.values.f4, expected[i].title);
    assert.equal(block.values.f5, [expected[i].crd ? 'CRD' : '', expected[i].source, expected[i].date].filter(Boolean).join(' · '));
  });
  const footer = doc.blocks.at(-1);
  assert.equal(footer.values.f1, data.footer.links[0].url);
  assert.equal(JSON.stringify(footer.additionalLinks), JSON.stringify(data.footer.links.slice(1)));
  const html = A.Render.html(doc);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.equal((html.match(/<h2\b/g) || []).length, 2);
  assert.equal((html.match(/<h3\b/g) || []).length, 3);
  assert.equal((html.match(/<img\b/g) || []).length, (A.Render.block(doc.blocks[0]).match(/<img\b/g) || []).length,
    'Seules les variantes du logo institutionnel sont conservées.');
  for (const link of [...expected, ...data.footer.links]) assert.ok(html.includes(link.url));
});

test('laisser les métadonnées absentes vides et échapper le contenu HTML', () => {
  const input = fresh();
  input.sections[0].articles[0] = {title: '<script>test</script>', url: 'https://example.org/article-1', source: '', date: ''};
  const doc = compose(A, input);
  assert.equal(doc.blocks.find(b => b.component === 'mail-31').values.f5, '');
  const html = A.Render.html(doc);
  assert.ok(html.includes('&lt;script&gt;test&lt;/script&gt;'));
  assert.ok(!html.includes('<script>test</script>'));
});

test('refuser les données omises et les liens mailto hors pied de page', () => {
  const extra = fresh(); extra.sections[0].articles[0].summary = 'Ne pas perdre ce contenu silencieusement';
  assert.throws(() => compose(A, extra), /champs manquants ou inconnus/);
  const wrong = fresh(); wrong.sections[0].articles[0].url = 'mailto:contact@example.org';
  assert.throws(() => compose(A, wrong), /HTTPS/);
  const blank = fresh(); blank.footer.links[0].label = '';
  assert.throws(() => compose(A, blank), /texte requis/);
});

test('écrire JSON, HTML et texte identiques au moteur, puis refuser un écrasement', () => {
  const input = path.join(temporary, 'contenu.json'), output = path.join(temporary, 'sortie');
  fs.writeFileSync(input, JSON.stringify(data));
  const first = cli('compose', root, input, output);
  assert.equal(first.status, 0, first.stderr);
  const doc = A.Model.document(JSON.parse(fs.readFileSync(path.join(output, 'composition.json'), 'utf8')));
  const html = fs.readFileSync(path.join(output, 'newsletter.html'), 'utf8');
  assert.equal(html, A.Render.html(doc));
  assert.equal(fs.readFileSync(path.join(output, 'newsletter.txt'), 'utf8'), A.Render.plain(doc));
  assert.notEqual(cli('compose', root, input, output).status, 0);
  assert.equal(fs.readFileSync(path.join(output, 'newsletter.html'), 'utf8'), html);
});

// Builder réel d'avant les capacités éditoriales (parent de c7edf74), extrait de l'historique de ce dépôt (#197).
const OLD_COMMIT = '56c5d56d5c904087b9c1f47411e1aa43cd7cc739';
function oldBuilder() {
  if (process.env.OLD_BUILDER) return process.env.OLD_BUILDER;
  const target = fs.mkdtempSync(path.join(temporary, 'ancien-builder-'));
  // En conteneur CI, le checkout appartient à un autre utilisateur : exception limitée à cette lecture du dépôt testé.
  const archive = spawnSync('git', ['-c', `safe.directory=${root}`, '-C', root, 'archive', '--format=tar', OLD_COMMIT], {maxBuffer: 256 * 1024 * 1024});
  assert.equal(archive.status, 0, `historique Git requis pour ${OLD_COMMIT} : ${archive.stderr}`);
  const extract = spawnSync('tar', ['-x', '-C', target], {input: archive.stdout});
  assert.equal(extract.status, 0, String(extract.stderr));
  return target;
}

test('refuser un ancien builder avant toute écriture', () => {
  const old = oldBuilder();
  assert.equal(cli('probe', old).status, 2);
  const input = path.join(temporary, 'ancien-contenu.json'), output = path.join(temporary, 'ancien');
  fs.writeFileSync(input, JSON.stringify(data));
  const result = cli('compose', old, input, output);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /PRÉREQUIS TECHNIQUE/);
  assert.ok(!fs.existsSync(output));
});
