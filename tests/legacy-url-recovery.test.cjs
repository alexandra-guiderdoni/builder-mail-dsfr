const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
for (const file of ['model.js', 'legacy-recovery.js', 'imports.js']) vm.runInThisContext(fs.readFileSync('app/source/' + file, 'utf8'), {filename: file});
const {Model: M, LegacyRecovery: R, Imports: I} = MailBuilder;
const RAW = 'https:exemple.invalid/ancienne';
const field = block => M.component(block.component).fields.find(f => f.type === 'url').key;
function library() { const value = M.initial(); value.documents = [M.create('Composition ancienne', [40])]; value.activeId = value.documents[0].id; return value; }

test('#193 : inventaire des URL de compositions, modèles, identités, sources et liens supplémentaires, sans normalisation des données', () => {
  const value = library(), block = value.documents[0].blocks[0];
  block.values[field(block)] = RAW; block.source = 'https:/exemple.invalid/source';
  const template = M.create('Modèle ancien', [40]); template.blocks[0].values[field(template.blocks[0])] = RAW;
  value.templates.push(template);
  const footer = M.createBlock(50); footer.values[field(footer)] = RAW; footer.additionalLinks = [{url: RAW, label: 'Lien conservé'}];
  value.identities.push({id: M.id(), name: 'Identité ancienne', blocks: [footer]});
  const before = structuredClone(value), plan = R.inspect(value);
  assert(plan); assert.equal(plan.links.length, 5);
  assert.deepEqual(plan.library, before); assert.deepEqual(value, before);
  assert(plan.links.some(link => link.path[0] === 'templates'));
  assert(plan.links.some(link => link.path.includes('additionalLinks')));
  assert.throws(() => M.library(plan.library), /commençant par https:\/\//, 'la lecture de récupération ne change jamais le validateur strict');
});

test('#193 : une URL ancienne ne masque pas une autre donnée invalide ou un protocole interdit', () => {
  const mutations = [
    value => { value.documents[0].blocks[0].source = 'javascript:alert(1)'; },
    value => { value.documents[0].blocks[0].source = 'http://exemple.invalid/'; },
    value => { value.documents[0].blocks[0].source = 'https:identifiant:secret@exemple.invalid/'; },
    value => { value.documents[0].blocks[0].source = 'https:exemple.invalid/ espace'; },
    value => { value.documents[0].blocks.push(structuredClone(value.documents[0].blocks[0])); },
    value => { value.catalogue = 'catalogue-étranger'; },
    value => { value.version = 2; },
    value => { value.documents[0].unexpected = true; },
    value => { value.documents[0].blocks.push(M.createBlock(27)); const block = value.documents[0].blocks.at(-1); block.values[M.component(block.component).fields.find(f => f.type === 'image').key] = 'data:image/png;base64,AAAA'; }
  ];
  for (const mutate of mutations) {
    const value = library(), block = value.documents[0].blocks[0]; block.values[field(block)] = RAW; mutate(value);
    assert.equal(R.inspect(value), null, mutate.toString());
  }
  assert.equal(R.inspect(library()), null, 'aucun changement pour les données valides');
});

test('#193 : ancien export refusé avec les emplacements à corriger, sans réinterpréter les adresses', () => {
  const value = library(), block = value.documents[0].blocks[0]; block.values[field(block)] = RAW;
  const before = JSON.stringify(value);
  assert.throws(() => I.parse(before), error => /copie du fichier JSON/.test(error.message) && error.message.includes('documents.0.blocks.0.values.') && /restent inchangés/.test(error.message));
  assert.equal(JSON.stringify(value), before);
  block.values[field(block)] = 'https://exemple.invalid/destination-choisie';
  assert.deepEqual(I.parse(JSON.stringify(value)).value, value);
});
