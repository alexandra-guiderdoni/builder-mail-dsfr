#!/usr/bin/env node
'use strict';
// Composition native, inventaire et squelettes ; aucun HTML embarqué.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {loadBuilder, writeDocument} = require('./builder-document.cjs');
const {capabilities} = require('./editorial.cjs');
const {verify, assertVerified} = require('./builder-contract.cjs');
const families = require('../assets/layout-families.json');
const id = index => `mail-${String(index).padStart(2, '0')}`;

function audit(A) {
  const declared = new Map();
  for (const group of families) for (const index of group.components) {
    const key = id(index);
    if (declared.has(key)) throw new Error(`Composant déclaré deux fois : ${key}`);
    declared.set(key, group.family);
  }
  const actual = new Map(A.catalog.components.map(c => [c.id, c]));
  const unknown = [...actual.keys()].filter(key => !declared.has(key));
  const missing = [...declared.keys()].filter(key => !actual.has(key));
  const mismatched = [...actual.values()].filter(c => declared.has(c.id) && declared.get(c.id) !== c.family).map(c => c.id);
  const inventoryComplete = !unknown.length && !missing.length && !mismatched.length;
  const contract = verify(A);
  return {catalogue: A.catalog.id, complete: inventoryComplete && contract.unchanged, inventoryComplete, contract,
    total: actual.size, covered: [...actual.keys()].filter(key => declared.has(key)).length,
    unknown, missing, mismatched,
    families: families.map(group => ({family: group.family,
      components: group.components.map(index => actual.get(id(index))).filter(Boolean).map(c => ({id: c.id, label: c.label}))}))};
}

function starters(root) {
  const source = fs.readFileSync(path.join(root, 'app/source/library-actions.js'), 'utf8');
  const match = /const starters\s*=\s*(\{[^;]+\});/.exec(source);
  if (!match) throw new Error('PRÉREQUIS TECHNIQUE : compositions de départ natives non détectées.');
  // Même checkout de confiance que le modèle ; aucune action de bibliothèque exécutée.
  const value = vm.runInNewContext(`(${match[1]})`, {}, {timeout: 1000});
  if (!value || Object.values(value).some(list => !Array.isArray(list) || !list.length || list.some(n => !Number.isInteger(n)))) {
    throw new Error('Compositions de départ natives non reconnues.');
  }
  return JSON.parse(JSON.stringify(value));
}

function selection(A, root, selector) {
  let selected;
  if (selector.startsWith('@')) {
    const value = starters(root)[selector.slice(1)];
    if (!value) throw new Error('Composition de départ inconnue ; utiliser la commande presets.');
    selected = value.map(id);
  } else selected = selector.split(',').map(value => value.trim());
  const declared = new Set(families.flatMap(group => group.components.map(id)));
  for (const key of selected) {
    A.Model.component(key);
    if (!declared.has(key)) throw new Error(`PRÉREQUIS TECHNIQUE : famille non documentée pour ${key}.`);
  }
  return selected;
}

function seed(A, root, selector, name) {
  assertVerified(A);
  if (typeof name !== 'string' || !name.trim()) throw new Error('Nom de composition requis.');
  const doc = A.Model.create(name, selection(A, root, selector));
  // Comme les départs de l'atelier (#202) : la vignette d'article reste à fournir, sous le repère de poids.
  if (selector.startsWith('@')) for (const block of doc.blocks) if (block.component === 'mail-31') block.values.f0 = '';
  return A.Model.document(doc);
}

function personalize(A, doc) {
  return doc.blocks.flatMap((block, index) => A.Model.component(block.component).fields.map(field =>
    ({block: index + 1, component: block.component, field: field.key, type: field.type, label: field.label})));
}

function main(args) {
  const [command, root, selector, name, output] = args;
  if (!['audit', 'presets', 'seed'].includes(command) || !root ||
      (command === 'seed' && (!selector || !name || !output))) {
    throw new Error('Usage : layouts.cjs audit CHECKOUT | presets CHECKOUT | seed CHECKOUT @NOM_OU_IDS TITRE NOUVEAU_DOSSIER');
  }
  const A = loadBuilder(root);
  if (command === 'audit') {
    const result = {...audit(A), optional: capabilities(A).checks};
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (!result.complete) process.exitCode = 2;
    return;
  }
  if (command === 'presets') {
    const presets = Object.entries(starters(root)).map(([key, components]) => {
      const ids = selection(A, root, '@' + key);
      return {key: '@' + key, components: ids, labels: ids.map(key => A.Model.component(key).label)};
    });
    process.stdout.write(JSON.stringify({catalogue: A.catalog.id, presets}, null, 2) + '\n'); return;
  }
  const doc = seed(A, root, selector, name);
  writeDocument(A, doc, output);
  process.stdout.write(JSON.stringify({status: 'SQUELETTE', output: path.resolve(output), blocks: doc.blocks.length,
    warning: 'Personnaliser les textes, liens, images et alternatives avant livraison.', fields: personalize(A, doc)}, null, 2) + '\n');
}
module.exports = {audit, starters, selection, seed, personalize};
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
