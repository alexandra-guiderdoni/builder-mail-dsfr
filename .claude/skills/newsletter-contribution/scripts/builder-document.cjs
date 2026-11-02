#!/usr/bin/env node
'use strict';
// Adaptateur de fichiers : les règles et le rendu restent ceux du checkout.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {webcrypto} = require('node:crypto');
const {assertVerified} = require('./builder-contract.cjs');

function loadBuilder(root) {
  if (!root) throw new Error('Checkout du builder requis.');
  root = fs.realpathSync(root);
  const catalogue = JSON.parse(execFileSync('python3', ['-B', '-c',
    'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'],
  {cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}));
  const scope = {URL, URLSearchParams, atob, btoa, crypto: webcrypto, MailBuilder: {catalog: catalogue}};
  scope.window = scope;
  vm.createContext(scope);
  // Les exemples embarqués (#202) sont chargés quand le checkout les fournit ; une version antérieure s’en passe.
  for (const name of ['model.js', 'render.js', 'examples.js']) {
    if (name === 'examples.js' && !fs.existsSync(path.join(root, 'app/source', name))) continue;
    const source = fs.readFileSync(path.join(root, 'app/source', name), 'utf8');
    vm.runInContext(source, scope, {filename: name, timeout: 10000});
  }
  return scope.MailBuilder;
}

function readDocument(A, file) {
  assertVerified(A);
  const raw = fs.readFileSync(file, 'utf8');
  if (/X-OWA-CANARY|GetFileAttachment|"cid:|[?&](?:access_token|token|sig)=/i.test(raw)) {
    throw new Error('Référence de session ou de pièce jointe détectée ; nettoyer la source.');
  }
  const doc = A.Model.document(JSON.parse(raw));
  A.Render.assertOutput(doc);
  return doc;
}

function writeDocument(A, doc, output) {
  assertVerified(A);
  A.Model.document(doc); A.Render.assertOutput(doc);
  const files = {'composition.json': JSON.stringify(doc, null, 2),
    'newsletter.html': A.Render.html(doc), 'newsletter.txt': A.Render.plain(doc)};
  fs.mkdirSync(output, {mode: 0o700});
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(output, name), content, {flag: 'wx', mode: 0o600});
  }
}

function main(args) {
  const [command, root, input, output] = args;
  if (!['catalogue', 'validate', 'render'].includes(command) || !root ||
      (command !== 'catalogue' && !input) || (command === 'render' && !output)) {
    throw new Error('Usage : builder-document.cjs catalogue CHECKOUT [COMPOSANT] | validate CHECKOUT JSON | render CHECKOUT JSON NOUVEAU_DOSSIER');
  }
  const A = loadBuilder(root);
  if (command === 'catalogue') {
    const found = input ? [A.Model.component(input)] : A.catalog.components;
    const components = found.map(c => ({id: c.id, family: c.family, label: c.label,
      ...(input ? {fields: c.fields.map(f => ({...f, default: f.type === 'image' ? '[image incorporée]' : f.default})), headings: c.headings, links: c.links} : {})}));
    process.stdout.write(JSON.stringify({catalogue: A.catalog.id, components}, null, 2) + '\n');
    return;
  }
  const doc = readDocument(A, input);
  if (command === 'render') writeDocument(A, doc, output);
  else { A.Render.html(doc); A.Render.plain(doc); }
  process.stdout.write(JSON.stringify({status: 'PASS', blocks: doc.blocks.length, catalogue: doc.catalogue, ...(output ? {output: path.resolve(output)} : {})}) + '\n');
}

module.exports = {loadBuilder, readDocument, writeDocument};
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
