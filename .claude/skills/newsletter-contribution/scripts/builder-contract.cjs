'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const contractFile = path.join(__dirname, '../assets/builder-contract.json');

// Contrat du consommateur (#197) : seulement ce dont le skill dépend. Libellés et valeurs par défaut des champs, et styles,
// en sont exclus : les changer ne modifie ni le format ni les gabarits que le skill remplit, et les valeurs par défaut sont
// des exemples à remplacer. Les noms de composants restent, car les références les citent. Les fonctions sont éprouvées par leur comportement, pas par l'empreinte des fichiers sources.
const API = {Model: ['create', 'createBlock', 'component', 'document', 'versions', 'setTexts'],
  Render: ['html', 'plain', 'assertOutput', 'block', 'clipboardHtml', 'exportHtml']};
const REMOTE_IMAGE = 'https://example.org/image.png';

const structure = c => ({id: c.id, family: c.family, label: c.label, fields: c.fields.map(({key, type}) => ({key, type})),
  headings: c.headings, links: c.links, template: c.semanticTemplate});

// Versions de composition acceptées et attribuées, observées sur un document sans image distante et un avec.
function formats(A) {
  const M = A.Model, accepts = doc => { try { M.document(doc); return true; } catch { return false; } };
  const index = A.catalog.components.findIndex(c => c.fields.some(f => f.type === 'image'));
  const key = A.catalog.components[index].fields.find(f => f.type === 'image').key;
  const local = M.create('Contrat', [index]), remote = M.create('Contrat', [index]);
  remote.blocks[0].remoteImages = {[key]: REMOTE_IMAGE};
  const accepted = doc => [1, 2, 3].filter(version => accepts({...doc, version}));
  const assigned = doc => { const copy = JSON.parse(JSON.stringify(doc)); M.versions(copy); return copy.version; };
  return {local: accepted(local), remote: accepted(remote), assigned: [assigned(local), assigned(remote)]};
}

function current(A) {
  const api = Object.fromEntries(Object.entries(API).map(([name, keys]) => [name, keys.filter(key => typeof A[name]?.[key] === 'function')]));
  const missingApi = Object.entries(API).flatMap(([name, keys]) => keys.filter(key => !api[name].includes(key)).map(key => `${name}.${key}`));
  return {catalogue: A.catalog.id, components: Object.fromEntries(A.catalog.components.map(c => [c.id, digest(structure(c))])),
    missingApi, formats: missingApi.length ? null : formats(A)};
}

function verify(A) {
  const expected = JSON.parse(fs.readFileSync(contractFile, 'utf8')), found = current(A);
  const components = [...new Set([...Object.keys(found.components), ...Object.keys(expected.components)])]
    .filter(id => found.components[id] !== expected.components[id]);
  const formatsChanged = JSON.stringify(found.formats) !== JSON.stringify(expected.formats);
  const catalogueChanged = found.catalogue !== expected.catalogue;
  return {unchanged: !catalogueChanged && !components.length && !found.missingApi.length && !formatsChanged,
    components, catalogueChanged, missingApi: found.missingApi, formatsChanged, formats: found.formats};
}

function assertVerified(A) {
  const result = verify(A);
  if (!result.unchanged) throw new Error('PRÉREQUIS TECHNIQUE : contrat du builder modifié. Examiner les composants, fonctions et formats signalés, mettre à jour les références du skill, puis le contrat dans le même commit ; ne pas l’actualiser automatiquement.');
  return result;
}
module.exports = {digest, API, structure, current, verify, assertVerified};

// Maintenance : `node builder-contract.cjs current CHECKOUT` affiche le contrat observé, à relire avant toute mise à jour.
if (require.main === module) {
  const [command, root] = process.argv.slice(2);
  if (command !== 'current' || !root) { process.stderr.write('Usage : builder-contract.cjs current CHECKOUT\n'); process.exitCode = 1; }
  else {
    const {catalogue, components, formats: observed} = current(require('./builder-document.cjs').loadBuilder(root));
    process.stdout.write(JSON.stringify({catalogue, components, formats: observed}, null, 2) + '\n');
  }
}
