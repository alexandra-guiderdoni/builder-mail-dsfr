/* Conversion SNUM : la paire synthétique de #46, au format de la revue de presse (#222), donne exactement la structure attendue. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');

global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-B', '-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['prototype/reference/snum-packet.js', 'app/source/model.js', 'app/source/render.js', 'app/snum/adapter.js']) vm.runInThisContext(fs.readFileSync(name, 'utf8'), {filename: name});
const {Model: M, Render: R} = MailBuilder;
const fixtures = path.join(__dirname, 'fixtures/snum-46');
const inputText = fs.readFileSync(path.join(fixtures, 'entree-synthetique.json'), 'utf8');
const expected = JSON.parse(fs.readFileSync(path.join(fixtures, 'sortie-attendue.json'), 'utf8'));
// Les identifiants de composition et de blocs sont aléatoires : la comparaison exacte porte sur tout le reste.
const shape = doc => ({schema: doc.schema, version: doc.version, catalogue: doc.catalogue, name: doc.name, subject: doc.subject, blocks: doc.blocks.map(({id, ...rest}) => rest)});
const headings = html => [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map(m => ({level: Number(m[1]), text: m[2].replace(/<[^>]*>/g, '').trim()}));

test('SNUM : la paire synthétique convertie donne exactement la sortie attendue, hors identifiants', () => {
  const result = MailBuilder.SnumAdapter.convert(inputText), doc = result.document;
  assert.deepEqual(shape(doc), shape(expected));
  assert.equal(result.notice, '7 articles · 5 rubriques. 2 remarques de collecte restent dans le paquet source, hors du courriel.');
  assert.equal(M.document(doc), doc);
  assert.equal(new Set(doc.blocks.map(b => b.id)).size, doc.blocks.length);
  assert.notEqual(doc.id, expected.id);
});

test('SNUM : archive à cinq thématiques, rubriques dans l’ordre du courriel, un article court par entrée', () => {
  const packet = JSON.parse(inputText), doc = MailBuilder.SnumAdapter.convert(inputText).document;
  assert.deepEqual(doc.blocks.map(b => b.component), ['mail-02', 'mail-05', 'mail-19', 'mail-17', 'mail-31', 'mail-31', 'mail-17', 'mail-31', 'mail-17', 'mail-31', 'mail-17', 'mail-31', 'mail-17', 'mail-31', 'mail-31', 'mail-19', 'mail-47', 'mail-50']);
  const articles = doc.blocks.filter(b => b.component === 'mail-31');
  assert.deepEqual(articles.map(b => b.values.f3), ['fictif-02', 'fictif-05', 'fictif-04', 'fictif-06', 'fictif-07', 'fictif-01', 'fictif-03'].map(id => packet.articles.find(a => a.id === id).url));
  for (const block of articles) {
    const article = packet.articles.find(a => a.url === block.values.f3);
    assert.equal(block.source, '');
    assert.equal(block.values.f5, `${article.source}, ${article.publication_date_iso.split('-').reverse().join('/')}`);
    assert.equal(block.values.f6, article.takeaway);
  }
});

test('SNUM : le rendu garde les titres natifs et la ligne à retenir, sans fait, intérêt, mots-clés ni remarques', () => {
  const packet = JSON.parse(inputText), doc = MailBuilder.SnumAdapter.convert(inputText).document;
  const html = R.html(doc), plain = R.plain(doc), actual = headings(html);
  // h1 titre, h2 par rubrique, h3 par article ; le paragraphe de clôture n’a pas de titre.
  assert.deepEqual(actual.map(h => h.level), [1, 2, 3, 3, 2, 3, 2, 3, 2, 3, 2, 3, 3]);
  for (const article of packet.articles) {
    assert.match(html, new RegExp(`<h3[^>]*>\\s*<a[^>]*href="${article.url.replaceAll('.', '\\.')}"`));
    assert.equal(html.split(article.url).length - 1, 1);
    assert(plain.includes(article.takeaway));
    for (const key of ['fact', 'snum_interest']) assert(!plain.includes(article[key]));
  }
  assert(!html.includes('Mots-clés')); assert(!html.includes('Essentiel')); assert(!html.includes('Consulter la source'));
  for (const item of packet.watch) { assert(!plain.includes(item.title)); assert(!plain.includes(item.summary)); }
  assert.equal((R.html({...doc, blocks: doc.blocks.filter(b => b.component === 'mail-31')}).match(/<img\b/gi) || []).length, 0);
  assert(!html.includes('données personnelles'));
});

test('SNUM : un seul article, une seule rubrique, pied complet', () => {
  const packet = JSON.parse(inputText);
  packet.articles = [packet.articles[1]];
  const result = MailBuilder.SnumAdapter.convert(JSON.stringify(packet)), doc = result.document;
  assert.deepEqual(doc.blocks.map(b => b.component), ['mail-02', 'mail-05', 'mail-19', 'mail-17', 'mail-31', 'mail-19', 'mail-47', 'mail-50']);
  assert.equal(doc.blocks[3].values.f0, '01. Intelligence artificielle (IA)');
  assert.equal(doc.blocks[4].values.f5, 'Gazette fictive de l’innovation, 12/03/2027');
  assert.equal(result.notice, '1 article · 1 rubrique. 2 remarques de collecte restent dans le paquet source, hors du courriel.');
  packet.watch = [packet.watch[0]];
  assert.match(MailBuilder.SnumAdapter.convert(JSON.stringify(packet)).notice, /\. 1 remarque de collecte reste dans le paquet source/);
});
