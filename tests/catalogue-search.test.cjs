const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');

global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-B', '-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8', maxBuffer: 20 * 1024 * 1024}))};
vm.runInThisContext(fs.readFileSync('app/source/catalogue-search.js', 'utf8'), {filename: 'app/source/catalogue-search.js'});
const {fold, filter, synonyms} = MailBuilder.CatalogueSearch, components = MailBuilder.catalog.components;
const ids = query => filter(components, query).map(c => c.id);

test('le repli ignore accents, casse, ligatures, tirets et apostrophes', () => {
  assert.equal(fold('Pré-en-tête MASQUÉ'), 'preentete masque');
  assert.equal(fold('Lien d’action'), fold("lien d'action"));
  assert.equal(fold('Cœur'), 'coeur');
});

test('chaque synonyme proposé désigne un composant existant, et les cas d’acceptation sont listés', () => {
  const known = new Set(components.map(c => c.id));
  assert.deepEqual(Object.keys(synonyms).filter(id => !known.has(id)), []);
  const accepted = {photo: ['mail-04', 'mail-26', 'mail-30'], préheader: ['mail-00', 'mail-07'], footer: ['mail-47', 'mail-48'], signature: ['mail-08', 'mail-39', 'mail-47', 'mail-51'], 'appel à l’action': ['mail-40', 'mail-43']};
  for (const [word, expected] of Object.entries(accepted)) for (const id of expected) assert(ids(word).includes(id), `${word} -> ${id}`);
});

test('les mots sans composant correspondant ne renvoient rien au lieu d’un faux résultat', () => {
  for (const word of ['agenda', 'tableau', 'vidéo', 'réseaux', 'événement']) assert.deepEqual(ids(word), [], word);
});

test('une requête vide garde les 52 composants et plusieurs mots se cumulent', () => {
  assert.equal(ids('  ').length, 52);
  assert.deepEqual(ids('BOUTON  secondaire'), ['mail-41']);
  assert.deepEqual(ids('photos').sort(), ids('photo').sort());
});
