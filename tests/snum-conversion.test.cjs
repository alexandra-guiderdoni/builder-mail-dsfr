/* Conversion SNUM (#46) : la paire synthétique validée le 24 octobre 2026 donne exactement la structure du modèle éditorial. */
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

test('SNUM #46 : la paire synthétique convertie donne exactement la sortie attendue, hors identifiants', () => {
  const result = MailBuilder.SnumAdapter.convert(inputText), doc = result.document;
  assert.deepEqual(shape(doc), shape(expected));
  assert.equal(result.notice, '7 articles · 5 rubriques. 2 remarques de collecte restent dans le paquet source, hors du courriel.');
  assert.equal(M.document(doc), doc);
  assert.equal(new Set(doc.blocks.map(b => b.id)).size, doc.blocks.length);
  assert.notEqual(doc.id, expected.id);
});

test('SNUM #46 : un bloc mail-31 sans image par article, rubriques V519 numérotées, Essentiel et dates en toutes lettres', () => {
  const packet = JSON.parse(inputText), doc = MailBuilder.SnumAdapter.convert(inputText).document;
  assert.deepEqual(doc.blocks.map(b => b.component), ['mail-02', 'mail-05', 'mail-19', 'mail-17', 'mail-31', 'mail-31', 'mail-17', 'mail-31', 'mail-31', 'mail-17', 'mail-31', 'mail-17', 'mail-31', 'mail-17', 'mail-31', 'mail-19', 'mail-50', 'mail-47']);
  assert.deepEqual(doc.blocks.filter(b => b.component === 'mail-17').map(b => b.values.f0), ['01. Numérique', '02. Intelligence artificielle (IA)', '03. Commande publique', '04. Ressources humaines', '05. Bercy']);
  const articles = doc.blocks.filter(b => b.component === 'mail-31');
  assert.deepEqual(articles.map(b => b.values.f3), ['fictif-01', 'fictif-03', 'fictif-02', 'fictif-05', 'fictif-04', 'fictif-06', 'fictif-07'].map(id => packet.articles.find(a => a.id === id).url));
  for (const block of articles) {
    const article = packet.articles.find(a => a.url === block.values.f3);
    assert.equal(block.values.f0, ''); assert.equal(block.values.f1, ''); assert.equal(block.values.f2, ''); assert.equal(block.source, '');
    assert.equal(block.values.f4, article.title);
    assert.equal(block.values.f5, `${article.essential ? 'Essentiel · ' : ''}${article.source} · ${article.publication_date_long}`);
    assert(!block.values.f5.includes(article.publication_date_iso));
    assert.equal(block.values.f6, `${article.fact}\nÀ retenir : ${article.takeaway}\nPour le SNUM : ${article.snum_interest}\nMots-clés : ${article.keywords.join(' · ')}`);
  }
  assert.equal(articles.filter(b => b.values.f5.startsWith('Essentiel · ')).length, 2);
  assert.equal(doc.subject, 'Revue de presse — mardi 16 mars 2027');
  assert.equal(doc.blocks[2].values.f0, 'Édition du mardi 16 mars 2027\n\nVeille du 2 mars 2027 au 15 mars 2027 · 7 articles sélectionnés, dont 2 essentiels.');
  assert.equal(doc.blocks[0].values.f4, 'Service');
  assert.equal(doc.blocks[15].values.f0, 'Sélection d’articles préparée à partir de la Collecte.\n\nL’équipe de veille du Service');
  const footer = doc.blocks[16];
  assert.equal(footer.values.f0, 'Pour gérer votre réception ou nous écrire :'); assert.equal(footer.additionalLinks.length, 2);
  for (const link of [{url: footer.values.f1, label: footer.values.f2}, ...footer.additionalLinks]) { assert.match(link.url, /^mailto:[a-z]+@exemple\.invalid\?subject=/); assert.match(link.label, /^→ /); }
  const privacy = doc.blocks[17];
  assert.equal(privacy.values.f2, 'Informations sur les données personnelles'); assert.equal(privacy.values.f1, M.createBlock(47).values.f1); assert.equal(privacy.values.f7, 'Service');
});

test('SNUM #46 : le rendu garde titres natifs, contenus exigés et exclusion des remarques, sans h4 ni lien source', () => {
  const packet = JSON.parse(inputText), doc = MailBuilder.SnumAdapter.convert(inputText).document;
  const html = R.html(doc), plain = R.plain(doc), actual = headings(html);
  assert.deepEqual(actual.map(h => h.level), [1, 2, 3, 3, 2, 3, 3, 2, 3, 2, 3, 2, 3]);
  assert.equal(actual.length, 1 + 5 + packet.articles.length);
  assert(!actual.some(h => ['À retenir', 'Pour le SNUM'].includes(h.text)));
  for (const article of packet.articles) {
    assert.match(html, new RegExp(`<h3[^>]*>\\s*<a[^>]*href="${article.url.replaceAll('.', '\\.')}"`));
    assert.equal(html.split(article.url).length - 1, 1);
    for (const key of ['fact', 'takeaway', 'snum_interest']) { assert(plain.includes(article[key])); assert(html.includes(article[key])); }
    for (const keyword of article.keywords) assert(plain.includes(keyword));
  }
  assert(html.includes('À retenir : ')); assert(html.includes('Pour le SNUM : ')); assert(!html.includes('Consulter la source'));
  for (const item of packet.watch) { assert(!plain.includes(item.title)); assert(!plain.includes(item.summary)); assert(!html.includes(item.summary)); }
  assert.equal((R.html({...doc, blocks: doc.blocks.filter(b => b.component === 'mail-31')}).match(/<img\b/gi) || []).length, 0);
  assert(html.includes('Informations sur les données personnelles'));
});

test('SNUM #46 : singulier avec un seul article essentiel et rubrique vide sans bloc', () => {
  const packet = JSON.parse(inputText);
  packet.articles = [packet.articles[1]];
  const doc = MailBuilder.SnumAdapter.convert(JSON.stringify(packet)).document;
  assert.deepEqual(doc.blocks.map(b => b.component), ['mail-02', 'mail-05', 'mail-19', 'mail-17', 'mail-31', 'mail-19', 'mail-50', 'mail-47']);
  assert.equal(doc.blocks[3].values.f0, '01. Intelligence artificielle (IA)');
  assert.equal(doc.blocks[2].values.f0, 'Édition du mardi 16 mars 2027\n\nVeille du 2 mars 2027 au 15 mars 2027 · 1 article sélectionné, dont 1 essentiel.');
  assert.equal(doc.blocks[4].values.f5, 'Essentiel · Gazette fictive de l’innovation · 12 mars 2027');
});
