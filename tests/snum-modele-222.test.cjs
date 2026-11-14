/* Modèle SNUM au format de la revue de presse (#222) : onze rubriques dans un ordre fixe, article court, pied de l’équipe. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');

global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-B', '-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['prototype/reference/snum-packet.js', 'app/source/model.js', 'app/source/render.js', 'app/snum/adapter.js']) vm.runInThisContext(fs.readFileSync(name, 'utf8'), {filename: name});
const {Render: R} = MailBuilder;
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/snum-46/entree-synthetique.json'), 'utf8'));
const ELEVEN = [
  ['ia', 'Intelligence artificielle (IA)'], ['administration', 'Administration électronique'], ['dsi', 'DSI, méthode, métier'],
  ['economie', 'Économie numérique'], ['infrastructure', 'Infrastructure, réseaux'], ['securite', 'Sécurité informatique'],
  ['applications', 'Applications et développement'], ['droit', 'Droit, informatique et libertés'], ['commande', 'Achat public'],
  ['rh', 'Ressources humaines et nominations'], ['bercy', 'Vie de Bercy']
];
// Paquet synthétique dont les articles portent les rubriques données, dans cet ordre.
function packet(rubrics, overrides = {}) {
  const base = fixture.articles[0];
  const articles = rubrics.map((rubric, i) => ({...base, id: `fictif-${i + 1}`, rubric, url: `https://exemple.invalid/article-${i + 1}`, title: `Titre ${i + 1}`, essential: i < 2}));
  return JSON.stringify({...fixture, ...overrides, articles});
}
const convert = text => MailBuilder.SnumAdapter.convert(text).document;
const headingsOf = doc => doc.blocks.filter(b => b.component === 'mail-17').map(b => b.values.f0);

test('#222 : le parseur expose les onze rubriques dans l’ordre du courriel, puis l’ancienne valeur numerique', () => {
  assert.deepEqual(window.SnumMail.rubrics.map(r => [...r]), [...ELEVEN, ['numerique', 'Numérique']]);
});

test('#222 : ordre et numérotation fixes, quel que soit l’ordre des articles ; rubriques vides absentes', () => {
  const doc = convert(packet(['securite', 'bercy', 'ia', 'administration', 'securite', 'ia']));
  assert.deepEqual(headingsOf(doc), ['01. Intelligence artificielle (IA)', '02. Administration électronique', '03. Sécurité informatique', '04. Vie de Bercy']);
  // Dans une rubrique, les articles gardent l’ordre du paquet.
  const order = doc.blocks.filter(b => b.component === 'mail-31').map(b => b.values.f4);
  assert.deepEqual(order, ['Titre 3', 'Titre 6', 'Titre 4', 'Titre 1', 'Titre 5', 'Titre 2']);
});

test('#222 : chacune des onze rubriques est acceptée et libellée', () => {
  const doc = convert(packet(ELEVEN.map(([id]) => id).reverse()));
  assert.deepEqual(headingsOf(doc), ELEVEN.map(([, label], i) => `${String(i + 1).padStart(2, '0')}. ${label}`));
});

test('#222 : une archive à cinq thématiques se convertit encore, Numérique après les onze', () => {
  const doc = convert(JSON.stringify(fixture));
  assert.deepEqual(headingsOf(doc), ['01. Intelligence artificielle (IA)', '02. Achat public', '03. Ressources humaines et nominations', '04. Vie de Bercy', '05. Numérique']);
});

test('#222 : une rubrique inconnue est refusée avec un message clair', () => {
  assert.throws(() => convert(packet(['ia', 'culture'])), /Article 2 : rubrique inconnue/);
});

test('#222 : article court, titre lié, « source, JJ/MM/AAAA », puis la seule ligne à retenir', () => {
  const source = JSON.parse(packet(['ia', 'droit']));
  const doc = convert(JSON.stringify(source)), html = R.html(doc), plain = R.plain(doc);
  const blocks = doc.blocks.filter(b => b.component === 'mail-31');
  blocks.forEach((block, i) => {
    const article = source.articles[i];
    const [y, m, d] = article.publication_date_iso.split('-');
    assert.deepEqual([block.values.f0, block.values.f1, block.values.f2], ['', '', '']);
    assert.equal(block.values.f3, article.url); assert.equal(block.values.f4, article.title);
    assert.equal(block.values.f5, `${article.source}, ${d}/${m}/${y}`);
    assert.equal(block.values.f6, article.takeaway);
  });
  for (const article of source.articles) {
    assert(!plain.includes(article.fact)); assert(!plain.includes(article.snum_interest));
    for (const keyword of article.keywords) assert(!plain.includes(`Mots-clés`), keyword);
  }
  assert(!html.includes('Essentiel')); assert(!html.includes('Pour le SNUM'));
});

test('#222 : objet avec le jour de semaine, sans zéro initial, même sans jour dans le paquet', () => {
  assert.equal(convert(JSON.stringify(fixture)).subject, 'Revue de presse du SNUM - Mardi 16 mars 2027');
  const friday = packet(['ia'], {edition_date: '2027-03-05', edition_date_long: '5 mars 2027', window_start: '2027-03-02', window_end: '2027-03-05'});
  const doc = convert(friday.replace(/"publication_date_iso":"2027-03-09","publication_date_long":"9 mars 2027"/g, '"publication_date_iso":"2027-03-04","publication_date_long":"4 mars 2027"'));
  assert.equal(doc.subject, 'Revue de presse du SNUM - Vendredi 5 mars 2027');
  assert.equal(doc.blocks[2].values.f0.split('\n')[0], 'L’essentiel de l’actualité · 5 mars 2027');
});

// Identité réelle de la revue de presse (#223), identique dans les seize envois relevés : signature et liens mailto.
const SIGNATURE = ['Équipe Communication / Événementiel du SNUM', 'Secteur relations bénéficiaires, gouvernance interne, communication',
  'Bureau aide à la gouvernance et fonctions support (BGS)', 'Service du numérique (SNUM) du SG'];
const LINKS = [
  ['→ S’abonner', 'agents-snum-subscribe@listes.finances.gouv.fr', 'Je souhaite m\'abonner à la revue de presse du SNUM'],
  ['→ Se désabonner', 'agents-snum-unsubscribe@listes.finances.gouv.fr', 'Je souhaite me désabonner de la revue de presse du SNUM'],
  ['→ Nous contacter', 'gouvernance.sg-snum@finances.gouv.fr', 'Des questions sur la revue de presse du SNUM ?']
];

test('#223 : en-tête, introduction fixe, articles, signature, pied Marianne avec la mention, puis abonnements', () => {
  const doc = convert(packet(['ia', 'securite']));
  assert.deepEqual(doc.blocks.map(b => b.component), ['mail-02', 'mail-05', 'mail-19', 'mail-17', 'mail-31', 'mail-17', 'mail-31', 'mail-39', 'mail-47', 'mail-50']);
  assert.equal(doc.blocks[0].values.f4, 'Service du numérique (SNUM)');
  assert.equal(doc.blocks[1].values.f0, 'Revue de presse');
  assert.equal(doc.blocks[2].values.f0, 'L’essentiel de l’actualité · 16 mars 2027\n\nCi-dessous les principales informations à retenir de ces derniers jours.\n\nBonne lecture !');
  const [signature, footer, links] = doc.blocks.slice(-3);
  assert.deepEqual(['f0', 'f1', 'f2', 'f3'].map(key => signature.values[key]), SIGNATURE);
  assert.equal(footer.values.f0, 'Revue de presse · Diffusion deux fois par semaine\nDocument à usage interne\n');
  assert.equal(footer.values.f7, 'Service du numérique (SNUM)');
  assert.equal(links.values.f0, 'Vous souhaitez gérer votre abonnement ? Vous avez des questions ?');
  const actual = [{label: links.values.f2, url: links.values.f1}, ...links.additionalLinks].map(({label, url}) => {
    const mail = new URL(url); return [label, mail.pathname, mail.searchParams.get('subject')];
  });
  assert.deepEqual(actual, LINKS);
});

test('#223 : cadre bordé continu jusqu’au pied Marianne, mention dans la colonne de texte, abonnements sous le cadre', () => {
  const doc = convert(packet(['ia', 'securite'])), html = R.html(doc);
  const template = id => MailBuilder.catalog.components.find(c => c.id === id).template;
  const framed = id => /border-left:\s*1px #e5e5e5 solid/.test(template(id));
  const inside = doc.blocks.slice(2, -1).map(b => b.component);
  assert.deepEqual(inside.filter(id => !framed(id)), [], 'chaque bloc du corps porte les bordures latérales du cadre');
  assert.equal(inside.at(-1), 'mail-47'); assert.match(template('mail-47'), /border-bottom:1px #e5e5e5 solid/);
  assert.equal(doc.blocks.at(-1).component, 'mail-50'); assert(!framed('mail-50'));
  // La mention suit la colonne de texte de 496 px des articles, et non le bord du cadre de 600 px.
  const at = html.indexOf('Revue de presse · Diffusion deux fois par semaine');
  assert(at > 0); assert.match(html.slice(html.lastIndexOf('<table', at), at), /width:496px/);
});
