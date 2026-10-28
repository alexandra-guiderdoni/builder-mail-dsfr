const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');

// #35 : poids, en octets UTF-8, du HTML fourni au presse-papiers et repères prudents de 90 et 102 Kio.
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const name of ['model.js', 'render.js', 'files.js']) vm.runInThisContext(fs.readFileSync('app/source/' + name, 'utf8'), {filename: name});
const {Render: R, Files: F} = MailBuilder;
const NOTICE = 90 * 1024, ALERT = 102 * 1024;

test('le poids compte les octets UTF-8 et non les caractères', () => {
  for (const value of ['', 'a', 'é', '’', 'œ', '😀', 'Déjà l’été à Noël 😀', '\uD800', '<img src="data:image/png;base64,AAAA">']) {
    assert.equal(R.weight(value).bytes, Buffer.byteLength(value, 'utf8'), JSON.stringify(value));
  }
  assert.equal(R.weight('é').bytes, 2); assert.equal(R.weight('’').bytes, 3); assert.equal(R.weight('😀').bytes, 4);
  // 46 080 caractères accentués pèsent 92 160 octets : le seuil se juge sur les octets.
  const accented = 'é'.repeat(NOTICE / 2);
  assert.equal(accented.length, 46080);
  assert.deepEqual(R.weight(accented), {bytes: NOTICE, level: 'notice'});
});

test('les repères se déclenchent exactement à 90 Kio puis à 102 Kio', () => {
  for (const [bytes, level] of [[0, 'ok'], [NOTICE - 1, 'ok'], [NOTICE, 'notice'], [NOTICE + 1, 'notice'], [ALERT - 1, 'notice'], [ALERT, 'alert'], [ALERT + 1, 'alert'], [400 * 1024, 'alert']]) {
    assert.deepEqual(R.weight('a'.repeat(bytes)), {bytes, level}, String(bytes));
  }
  assert.equal(NOTICE, 92160); assert.equal(ALERT, 104448);
});

test('le texte affiché donne les octets, des Kio jamais arrondis vers le seuil, et des repères prudents', () => {
  const text = bytes => F.weightText(R.weight('a'.repeat(bytes)));
  const group = value => value.toLocaleString('fr-FR');
  const below = text(NOTICE - 1), notice = text(NOTICE), high = text(ALERT - 1), alert = text(ALERT);
  assert.ok(below.includes('89,9 Kio') && below.includes(group(NOTICE - 1) + ' octets'), below);
  assert.doesNotMatch(below, /Attention|Alerte/);
  assert.ok(notice.includes('90,0 Kio') && notice.includes(group(NOTICE) + ' octets'), notice);
  assert.match(notice, /^HTML préparé pour la copie : .*images comprises\. Attention : .*90 Kio.*Gmail/);
  assert.ok(high.includes('101,9 Kio') && /Attention/.test(high) && !/Alerte/.test(high), high);
  assert.ok(alert.includes('102,0 Kio') && /Alerte/.test(alert) && !/Attention/.test(alert), alert);
  for (const warning of [notice, high, alert]) assert.match(warning, /Repères prudents, sans garantie sur la taille reçue ni sur la troncature\./);
  assert.doesNotMatch(below + notice + alert, /bloqu|impossible|refus/i, 'aucun repère ne bloque la copie');
});

test('une image incorporée pèse exactement sa donnée, et seule une chaîne se pèse', () => {
  const M = MailBuilder.Model, doc = M.create('Poids', [5, 31]), article = doc.blocks[1];
  // Sans DOMParser, Node ne produit pas la copie : le test navigateur mesure clipboardHtml ; ici, le HTML dérivé.
  const before = R.html(doc), image = article.values.f0;
  const lighter = 'data:image/png;base64,' + fs.readFileSync('app/assets/icon-192.png').toString('base64');
  article.values.f0 = lighter;
  const after = R.html(doc), occurrences = before.split(image).length - 1;
  assert.ok(occurrences >= 1);
  assert.equal(after.split(lighter).length - 1, occurrences);
  assert.notEqual(lighter.length, image.length);
  assert.equal(R.weight(before).bytes - R.weight(after).bytes, occurrences * (image.length - lighter.length));
  for (const value of [undefined, null, 42, {}]) assert.throws(() => R.weight(value), TypeError);
});


test('#191 : partition UTF-8 exacte, répétitions et conseil conditionnel, sans changer les seuils', () => {
  const M = MailBuilder.Model, index = MailBuilder.catalog.components.findIndex(c => c.id === 'mail-26');
  const doc = M.create('Deux illustrations', [index, index]);
  const small = 'data:image/png;base64,' + fs.readFileSync('app/assets/icon-192.png').toString('base64');
  const large = 'data:image/png;base64,' + fs.readFileSync('app/assets/icon-512.png').toString('base64');
  const field = M.component('mail-26').fields.find(f => f.type === 'image');
  doc.blocks[0].values[field.key] = small; doc.blocks[1].values[field.key] = large;
  const html = `<style>é😀</style><img src="${small}"><img src="${large}"><img src="${large}">`;
  const measured = R.weightDetails(html, doc);
  assert.equal(measured.parts.styles, Buffer.byteLength('é😀'));
  assert.equal(measured.parts.images, Buffer.byteLength(small) + 2 * Buffer.byteLength(large));
  assert.equal(Object.values(measured.parts).reduce((a,b) => a+b), Buffer.byteLength(html));
  assert.equal(measured.occurrences, 3); assert.equal(measured.distinct, 2);
  assert.equal(measured.target.block, doc.blocks[1].id, 'image réellement la plus lourde, pas la première');
  assert.equal(measured.target.field, 'field-' + field.key);
  assert.match(F.weightAdvice(measured), /images incorporées dominent.*conservant les logos/);
  const text = R.weightDetails('<p>' + 'Texte 😀'.repeat(20000) + '</p>', doc);
  assert.equal(text.dominant, 'other'); assert.doesNotMatch(F.weightAdvice(text), /allége.*image/i);
  for (const summary of [F.weightSummary({...measured, level:'alert'}), F.weightText({...measured, level:'alert'})]) {
    assert.ok(summary.includes(field.label)); assert.match(summary, /bloc 2/);
  }
});
