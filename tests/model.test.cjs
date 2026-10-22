const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');

global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['prototype/reference/snum-packet.js', 'app/source/model.js', 'app/source/render.js', 'app/source/imports.js', 'app/snum/adapter.js']) vm.runInThisContext(fs.readFileSync(name, 'utf8'), {filename: name});
const {Model: M, Imports: I, Render: R} = MailBuilder;
const payload = require('./fixtures/snum.cjs');
test('SNUM : le jour de semaine doit correspondre à la date, dans les deux moteurs', () => {
  const scope = {URL, atob, btoa, crypto, SnumMail}; scope.window = scope;
  vm.runInNewContext(fs.readFileSync('prototype/source/model.js', 'utf8').replaceAll('@@DEMO_IMAGE@@', M.createBlock(2).values.f0).replaceAll('@@LOGO@@', M.createBlock(2).values.f0), scope);
  for (const convert of [s => MailBuilder.SnumAdapter.convert(s), s => scope.MailDocument.fromSnum(s)]) {
    for (const date of ['mercredi 14 octobre 2026', '14 octobre 2026']) { const p = payload(); p.edition_date_long = date; assert.doesNotThrow(() => convert(JSON.stringify(p))); }
    for (const date of ['lundi 14 octobre 2026', '31 février 2026', '15 octobre 2026']) { const p = payload(); p.edition_date_long = date; assert.throws(() => convert(JSON.stringify(p))); }
  }
});

test('le catalogue complet produit 52 blocs rendables avec leurs ressources incorporées', () => {
  assert.equal(MailBuilder.catalog.components.length, 52);
  const doc = M.create('Catalogue', Array.from({length: 52}, (_, i) => i));
  assert.equal(M.document(doc).blocks.length, 52);
  const html = R.html(doc);
  assert(!html.includes('{{f'));
  assert(!/<img[^>]+src="(?!data:image\/)/i.test(html));
  assert(html.includes('@media (prefers-color-scheme: dark)'));
  assert.equal(MailBuilder.catalog.components.reduce((n, c) => n + c.fields.length, 0), 178);
});

test('la bibliothèque de recette comporte chaque section du catalogue une seule fois', () => {
  const lib = I.parse(fs.readFileSync('app/distribution/qualification.courriels.json', 'utf8')).value;
  assert.equal(lib.documents.length, 9);
  const ids = lib.documents.flatMap(d => d.blocks.map(b => b.component));
  assert.equal(ids.length, 52); assert.equal(new Set(ids).size, 52);
  assert.deepEqual([...ids].sort(), MailBuilder.catalog.components.map(c => c.id).sort());
});

test('un fichier de bibliothèque transporte compositions, modèles, identités et images', () => {
  const lib = M.initial();
  lib.templates.push(M.clone(lib.documents[0], 'Mon modèle'));
  lib.identities.push({id: M.id(), name: 'Identité de recette', blocks: [M.createBlock(2), M.createBlock(47)]});
  const decoded = I.parse(JSON.stringify(lib));
  assert.deepEqual(decoded.value, lib);
  const merged = I.merge(lib, decoded);
  assert.equal(merged.documents.length, 2); assert.equal(merged.templates.length, 2); assert.equal(merged.identities.length, 2);
  assert.deepEqual(merged.documents[0], lib.documents[0]);
  assert.notEqual(merged.documents[1].id, lib.documents[0].id);
  assert.equal(merged.documents[1].blocks[0].values.f0, lib.documents[0].blocks[0].values.f0);
});

test('le parseur refuse les formats inconnus, les JSON incomplets et les versions futures', () => {
  const lib = M.initial();
  for (const value of ['{"schema":"inconnu"}', '{', JSON.stringify({...lib, version: 2})]) assert.throws(() => I.parse(value));
});

test('une bibliothèque importée conserve sa composition active après attribution des nouveaux identifiants', () => {
  const incoming = M.initial(); incoming.documents.push(M.create('Composition active importée'));
  incoming.activeId = incoming.documents[1].id;
  const current = M.initial(), merged = I.merge(current, I.parse(JSON.stringify(incoming)));
  assert.equal(merged.documents.find(d => d.id === merged.activeId).name, 'Composition active importée');
  assert.notEqual(merged.activeId, incoming.activeId); assert.deepEqual(merged.documents[0], current.documents[0]);
});

test('les données ne peuvent fournir de script, de gabarit ou de ressource distante', () => {
  const doc = M.create('Sécurité', [25]);
  M.setTexts(doc.blocks[0], ['<script>globalThis.injected=1</script>', 'Texte {{f0}} & fin']);
  const html = R.html(doc);
  assert(html.includes('&lt;script&gt;')); assert(!/<script[\s>]/i.test(html)); assert(html.includes('Texte {{f0}} &amp; fin'));
  const bad = M.copy(doc); bad.blocks[0].template = '<script></script>'; assert.throws(() => M.document(bad));
  bad.blocks[0] = M.createBlock(27); bad.blocks[0].values.f0 = 'https://exemple.invalid/pixel.png'; assert.throws(() => M.document(bad));
});

test('tous les liens sont validés indépendamment des identifiants de blocs', () => {
  const doc = M.create('Liens', [25, 40]);
  for (const bad of ['javascript:alert(1)', 'http://exemple.invalid/', 'https://user:pass@exemple.invalid/', 'https://exemple.invalid/ espace']) {
    doc.blocks[0].source = bad; assert.throws(() => M.document(doc));
    doc.blocks[0].source = ''; const field = M.component(doc.blocks[1].component).fields.find(f => f.type === 'url'); doc.blocks[1].values[field.key] = bad; assert.throws(() => M.document(doc));
  }
});

test('le convertisseur SNUM crée les rubriques et des blocs distincts sans perdre les sources à la duplication', () => {
  const packet = payload(), result = MailBuilder.SnumAdapter.convert(JSON.stringify(packet)), doc = result.document;
  assert.equal(doc.blocks.filter(b => b.component === 'mail-12').length, 5);
  assert.equal(doc.blocks.filter(b => b.component === 'mail-15').length, 5);
  const article = doc.blocks.find(b => b.source === packet.articles[0].url);
  assert.equal(article.values.f0, packet.articles[0].title); assert(!Object.values(article.values).includes(packet.articles[0].takeaway));
  doc.blocks.push({...M.copy(article), id: M.id()});
  assert.equal(R.plain(doc).split(packet.articles[0].url).length - 1, 2);
  assert.equal(R.html(doc).split(packet.articles[0].url).length - 1, 2);
  assert(!R.plain(doc).includes(packet.watch[0].title)); assert(!R.html(doc).includes(packet.watch[0].summary));
  for (const item of packet.articles) for (const key of ['fact', 'takeaway', 'snum_interest']) assert(R.plain(doc).includes(item[key]));
});

test('le schéma JSON documente les 52 composants et l’exemple est importable dans le builder générique', () => {
  const schema = JSON.parse(fs.readFileSync('app/distribution/courriels.schema.json', 'utf8'));
  for (const c of MailBuilder.catalog.components) {
    const definition = schema.$defs[c.id]; assert.equal(definition.properties.component.const, c.id);
    assert.deepEqual(Object.keys(definition.properties.values.properties), c.fields.map(f => f.key));
    assert.equal(definition.additionalProperties, false);
  }
  const example = I.parse(fs.readFileSync('app/distribution/exemple.courriel.json', 'utf8')).value;
  assert.equal(example.blocks.length, 3); assert.equal(schema.$defs.document.properties.catalogue.const, example.catalogue);
  const html = fs.readFileSync('app/distribution/portable.html', 'utf8');
  assert(!html.includes('SNUM_PAQUET_RENDU_V519')); assert(!html.includes('snum-input')); assert(html.includes('json-input'));
});

test('une composition v1 antérieure reste lisible avec son catalogue et ses valeurs inchangés', () => {
  const original = {schema: 'dsfr-mail/document', version: 1, catalogue: '6ca8ea12a0dcbdd6e59f287b6435b06367b8a44c4278f74858e8cddd6e72af8b', id: 'ancien-document', name: 'Composition conservée', subject: 'Objet conservé', blocks: [{id: 'ancien-bloc', component: 'mail-25', values: {f0: 'Titre conservé', f1: 'Contenu conservé'}, source: 'https://exemple.invalid/source'}]};
  assert.deepEqual(I.parse(JSON.stringify(original)).value, original);
});

test('les identifiants dupliqués et les champs inconnus sont refusés', () => {
  const doc = M.create('Duplicats', [19, 19]); doc.blocks[1].id = doc.blocks[0].id; assert.throws(() => M.document(doc));
  doc.blocks[1].id = M.id(); doc.blocks[0].values.inconnu = 'texte'; assert.throws(() => M.document(doc));
});

test('un autre catalogue ne peut pas réinterpréter silencieusement une composition ou une bibliothèque', () => {
  const doc = M.create('Autre catalogue'); doc.catalogue = 'catalogue-inconnu'; assert.throws(() => M.document(doc), /autre catalogue/);
  const lib = M.initial(); lib.catalogue = 'catalogue-inconnu'; assert.throws(() => I.parse(JSON.stringify(lib)), /autre catalogue/);
});

test('un fichier du prototype est converti sans perdre titre, contenu, logo et source', () => {
  const logo = M.createBlock(2).values.f0;
  const old = {schema: 'builder-mail-prototype/1', service: 'Service de recette', subject: 'Ancienne composition', footer: 'Pied conservé', logo, blocks: [{id: 'ancien', type: 'text', title: 'Titre conservé', body: 'Texte conservé', url: 'https://exemple.invalid/source', image: logo, alt: ''}]};
  const result = I.parse(JSON.stringify(old));
  assert.equal(result.value.subject, old.subject);
  for (const text of [old.service, old.subject, old.footer, old.blocks[0].title, old.blocks[0].body, old.blocks[0].url]) assert(R.plain(result.value).includes(text));
  const images = M.component(result.value.blocks[0].component).fields.filter(f => f.type === 'image');
  assert(images.every(f => result.value.blocks[0].values[f.key] === logo));
});
test('la migration du prototype conserve l’objet vide et n’invente aucune légende d’image', () => {
  const image = M.createBlock(2).values.f0;
  const old = {schema: 'builder-mail-prototype/1', service: 'Service', subject: '', footer: 'Fin', logo: image, blocks: [{id: 'image', type: 'image', title: '', body: '', url: '', image, alt: 'Alternative conservée'}]};
  const doc = I.parse(JSON.stringify(old)).value;
  assert.equal(doc.subject, ''); assert(!R.plain(doc).includes('Description / Source'));
  assert(R.html(doc).includes('Alternative conservée')); assert.deepEqual(I.parse(JSON.stringify(doc)).value, doc);
});
