const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {domainToUnicode} = require('node:url');
const {execFileSync} = require('node:child_process');

// #36 : contrôle avant copie. Blocages : composition vide et refus existants. Avertissements : liste fermée de six règles.
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['model.js', 'render.js', 'checks.js']) vm.runInThisContext(fs.readFileSync('app/source/' + name, 'utf8'), {filename: name});
const {Model: M, Render: R, Checks: C} = MailBuilder;
const RULES = ['demo-domain', 'demo-text', 'weight', 'label-domain', 'bidi', 'mixed-script'];
const index = id => MailBuilder.catalog.components.findIndex(c => c.id === id);
const ok = {bytes: 1000, level: 'ok'};
// Pied mail-50 aux textes modifiés : seul le lien testé peut produire un avertissement.
function footer(url, label = 'Gérer mon abonnement') {
  const doc = M.create('Contrôle', [index('mail-50')]), block = doc.blocks[0];
  Object.assign(block.values, {f0: 'Pour vos abonnements,', f1: url, f2: label});
  return doc;
}
const rules = (doc, weight = ok) => C.warnings(doc, weight).map(w => w.rule);

test('la liste des règles est fermée et chaque avertissement désigne un bloc et un champ', () => {
  assert.deepEqual(C.rules, RULES);
  const doc = M.create('Défaut');
  const warnings = C.warnings(doc, {bytes: 95000, level: 'notice'});
  assert.ok(warnings.length > 0);
  for (const warning of warnings) {
    assert.ok(RULES.includes(warning.rule), warning.rule);
    assert.ok(doc.blocks.some(b => b.id === warning.block), 'bloc existant');
    assert.match(warning.field, /^(field-[\w-]+|article-source(-label)?)$/);
    assert.match(warning.message, /^Bloc \d+ « .+ » : |^Courriel de /);
  }
});

test('(1) domaines de démonstration : .invalid, .example, .test et example.*', () => {
  for (const url of ['https://exemple.invalid/', 'https://www.example.com/page', 'https://example.org/', 'https://example.gouv.fr/', 'https://docs.example.net/a', 'https://site.test/', 'https://demo.example/', 'mailto:contact@service.invalid', 'mailto:contact@example.com?subject=Bonjour']) {
    assert.deepEqual(rules(footer(url)), ['demo-domain'], url);
  }
  for (const url of ['https://www.info.gouv.fr/partenaires-de-letat', 'https://exemple.fr/', 'https://test.gouv.fr/', 'https://invalid.gouv.fr/', 'https://examples.com/', 'https://example-site.fr/', 'https://www.economie.gouv.fr/test', 'mailto:contact@service.gouv.fr']) {
    assert.deepEqual(rules(footer(url)), [], url);
  }
  const source = footer('https://www.info.gouv.fr/');
  source.blocks[0].source = 'https://exemple.invalid/source'; source.blocks[0].sourceLabel = 'Source';
  assert.deepEqual(C.warnings(source, ok).map(w => [w.rule, w.field]), [['demo-domain', 'article-source']]);
  const extra = footer('https://www.info.gouv.fr/');
  extra.blocks[0].additionalLinks = [{url: 'https://www.info.gouv.fr/contact', label: 'Contact'}, {url: 'https://site.test/fin', label: 'Fin'}];
  assert.deepEqual(C.warnings(extra, ok).map(w => [w.rule, w.field]), [['demo-domain', 'field-footer-url-1']]);
});

test('(2) texte de démonstration du catalogue resté inchangé', () => {
  const doc = M.create('Défaut', [index('mail-50')]);
  doc.blocks[0].values.f1 = 'https://www.info.gouv.fr/';
  const warnings = C.warnings(doc, ok);
  assert.deepEqual(warnings.map(w => [w.rule, w.field]), [['demo-text', 'field-f0']]);
  assert.match(warnings[0].message, /Texte 1.*Texte 2/);
  doc.blocks[0].values.f0 = 'Pour vos abonnements,';
  assert.deepEqual(C.warnings(doc, ok).map(w => [w.rule, w.field]), [['demo-text', 'field-f2']]);
  doc.blocks[0].values.f2 = 'Gérer mon abonnement';
  assert.deepEqual(rules(doc), []);
  // Un champ dont la valeur par défaut est vide n’est jamais du texte de démonstration.
  const article = M.create('Article', [index('mail-31')]), block = article.blocks[0], definition = M.component(block.component);
  for (const field of definition.fields) if (field.type === 'text') block.values[field.key] = field.default.trim() ? 'Texte rédigé ' + field.key : '';
  block.values.f3 = 'https://www.info.gouv.fr/article';
  assert.deepEqual(rules(article), []);
  // Un texte qui ne diffère que par un espace final reste différent de la démonstration.
  block.values.f4 = definition.fields.find(f => f.key === 'f4').default + ' ';
  assert.deepEqual(rules(article), []);
});

test('(3) poids au-delà de 90 Kio, vers le bloc le plus lourd', () => {
  const doc = footer('https://www.info.gouv.fr/');
  const heavy = M.create('Lourd', [index('mail-31')]).blocks[0];
  Object.assign(heavy.values, {f2: 'Avant-titre rédigé', f3: 'https://www.info.gouv.fr/a', f4: 'Titre rédigé', f5: 'Détail rédigé', f6: 'Fin rédigée', f1: 'Alternative rédigée'});
  doc.blocks.push(heavy);
  assert.deepEqual(rules(doc, {bytes: 92159, level: 'ok'}), []);
  const warnings = C.warnings(doc, {bytes: 92160, level: 'notice'});
  assert.deepEqual(warnings.map(w => [w.rule, w.block]), [['weight', heavy.id]]);
  assert.match(warnings[0].message, /^Courriel de 90,0 Kio.*repère prudent de 90 Kio.*bloc 2/);
  assert.deepEqual(rules(doc, {bytes: 104448, level: 'alert'}), ['weight']);
});

test('(4) intitulé affichant un domaine différent de l’hôte réel', () => {
  for (const [url, label] of [
    ['https://paiement-amendes.fr/', 'impots.gouv.fr'],
    ['https://impots.gouv.fr.paiement.fr/', 'www.impots.gouv.fr'],
    ['https://collecte.fr/aide', 'Voir https://economie.gouv.fr/aide'],
    ['mailto:autre@collecte.fr', 'Écrire à contact@economie.gouv.fr'],
    ['https://societe.fr/', 'société.fr'],
    ['https://economie.gouv.fr/', 'Portail economie.gouv.fr et impots.gouv.fr'],
  ]) assert.deepEqual(rules(footer(url, label)), ['label-domain'], label);
  for (const [url, label] of [
    ['https://www.impots.gouv.fr/accueil', 'impots.gouv.fr'],
    ['https://economie.gouv.fr/', 'www.economie.gouv.fr'],
    ['https://impots.gouv.fr/', 'Portail gouv.fr'],
    ['https://www.info.gouv.fr/rapport-annuel.pdf', 'rapport-annuel.pdf'],
    ['https://www.info.gouv.fr/', 'Version 2.0 du guide, art. L. 123'],
    ['mailto:contact@economie.gouv.fr', 'contact@economie.gouv.fr'],
    ['https://xn--socit-esab.fr/', 'société.fr'],
    ['https://www.info.gouv.fr/', 'Lire l’article'],
  ]) assert.deepEqual(rules(footer(url, label)), [], label);
  const extra = footer('https://www.info.gouv.fr/');
  extra.blocks[0].additionalLinks = [{url: 'https://collecte.fr/', label: 'impots.gouv.fr'}];
  assert.deepEqual(C.warnings(extra, ok).map(w => [w.rule, w.field]), [['label-domain', 'field-footer-label-0']]);
  const source = footer('https://www.info.gouv.fr/');
  source.blocks[0].source = 'https://collecte.fr/'; source.blocks[0].sourceLabel = 'Source : impots.gouv.fr';
  assert.deepEqual(C.warnings(source, ok).map(w => [w.rule, w.field]), [['label-domain', 'article-source-label']]);
});

test('(5) caractères de contrôle bidirectionnels dans l’URL', () => {
  for (const url of ['https://www.info.gouv.fr/‮fdp.exe', 'https://www.info.gouv.fr/a⁦b', 'https://www.info.gouv.fr/a‏b', 'https://www.info.gouv.fr/a؜b', 'https://www.info.gouv.fr/a‪b', 'https://www.info.gouv.fr/a⁩b', 'https://www.info.gouv.fr/a%E2%80%AEb', 'https://www.info.gouv.fr/a%e2%81%a6b', 'mailto:contact@economie.gouv.fr?subject=Avis%E2%80%8F']) {
    assert.deepEqual(rules(footer(url)), ['bidi'], JSON.stringify(url));
  }
  for (const url of ['https://www.info.gouv.fr/', 'https://www.info.gouv.fr/فارسی', 'https://www.info.gouv.fr/a%20b', 'https://www.info.gouv.fr/%E2%80%93', 'https://www.info.gouv.fr/été']) {
    assert.deepEqual(rules(footer(url)), [], JSON.stringify(url));
  }
});

test('(6) domaine IDN mélangeant plusieurs alphabets', () => {
  assert.equal(C.decodeHost('xn--80ak6aa92e.com'), domainToUnicode('xn--80ak6aa92e.com'));
  for (const host of ['xn--strae-oqa.de', 'xn--socit-esab.fr', 'xn--e1afmkfd.xn--p1ai', 'xn--r8jz45g.xn--zckzah', 'www.info.gouv.fr']) assert.equal(C.decodeHost(host), domainToUnicode(host), host);
  for (const url of ['https://аррӏе.com/', 'https://xn--80ak6aa92e.com/', 'https://pаypal.fr/', 'https://ελληνικά.com/', 'https://impots.gоuv.fr/']) {
    assert.deepEqual(rules(footer(url)), ['mixed-script'], url);
  }
  for (const url of ['https://пример.рф/', 'https://ελληνικά.ελ/', 'https://例え.テスト/', 'https://www.info.gouv.fr/', 'https://xn--e1afmkfd.xn--p1ai/']) {
    assert.deepEqual(rules(footer(url)), [], url);
  }
});

test('un domaine accentué dans un seul alphabet n’est jamais signalé', () => {
  for (const url of ['https://société-générale.fr/', 'https://www.économie.gouv.fr/', 'https://ærøskøbing.dk/', 'https://straße.de/', 'https://xn--socit-esab.fr/', 'mailto:contact@xn--conomie-9xa.fr']) {
    const doc = footer(url, 'Gérer mon abonnement');
    assert.deepEqual(C.warnings(doc, ok), [], url);
    doc.blocks[0].additionalLinks = [{url, label: 'Autre lien'}]; doc.blocks[0].source = url.startsWith('https') ? url : ''; doc.blocks[0].sourceLabel = 'Source';
    assert.deepEqual(C.warnings(doc, ok), [], url + ' (liens supplémentaire et source)');
  }
});

test('une composition saine ne produit aucun avertissement ; une composition vide est bloquée', () => {
  assert.deepEqual(C.warnings(footer('https://www.info.gouv.fr/'), ok), []);
  const empty = M.create('Vide', []);
  assert.doesNotThrow(() => M.document(empty));
  assert.throws(() => R.assertOutput(empty), /Ajoutez au moins un composant/);
  assert.throws(() => R.html(empty), /Ajoutez au moins un composant/);
  assert.doesNotThrow(() => R.html(empty, true), 'l’aperçu reste possible');
  assert.deepEqual(C.warnings(empty, ok), []);
  // Les refus existants restent prioritaires : un intitulé manquant bloque toujours.
  const missing = footer('https://exemple.invalid/', ' ');
  assert.throws(() => R.assertOutput(missing), error => Boolean(error.linkIssue));
});

test('aucun contrôle réseau : le module ne contient aucune API de requête', () => {
  const source = fs.readFileSync('app/source/checks.js', 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|\bimport\s*\(|new\s+Image\b|\.src\s*=/);
});
