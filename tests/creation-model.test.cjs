const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');

global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
vm.runInThisContext(fs.readFileSync('app/source/model.js', 'utf8'), {filename: 'app/source/model.js'});
const {Model: M} = MailBuilder;

test('hasDate : détecte les dates françaises, ignore les numéros et versions', () => {
  const dated = ['Lettre du 23 octobre 2026', 'Édition 2026', 'Point de mars', 'Bulletin du 3 janv.', 'Rendez-vous le 12/11', 'Envoi du 12.11.26', 'Envoi du 12-11-2026', 'Lettre 2026-10-23', 'Le 1er décembre'];
  const neutral = ['Lettre d’information', 'Invitation', 'Version 1.2', 'Bulletin n°3', 'Information de service (2)', '', 'Plan à 3 ans'];
  for (const text of dated) assert.equal(M.hasDate(text), true, text);
  for (const text of neutral) assert.equal(M.hasDate(text), false, text);
});

test('uniqueName : numérote les noms déjà pris sans toucher aux autres', () => {
  const docs = names => names.map(name => ({name}));
  assert.equal(M.uniqueName('Invitation', docs([])), 'Invitation');
  assert.equal(M.uniqueName('Invitation', docs(['Invitation'])), 'Invitation (2)');
  assert.equal(M.uniqueName('Invitation', docs(['Invitation', 'Invitation (2)'])), 'Invitation (3)');
  assert.equal(M.uniqueName('Invitation', docs(['Invitation (2)'])), 'Invitation');
  assert.equal(M.uniqueName('Invitation', docs([' Invitation '])), 'Invitation (2)');
});

test('derive : un objet daté est remplacé par le nom et signalé ; un objet sans date est conservé', () => {
  const source = M.create('Modèle', [2, 5]);
  source.subject = 'Lettre du 23 octobre 2026';
  const a = M.derive(source, 'Modèle · composition');
  assert.equal(a.doc.name, 'Modèle · composition'); assert.equal(a.doc.subject, 'Modèle · composition');
  assert.equal(a.replacedSubject, 'Lettre du 23 octobre 2026'); assert.notEqual(a.doc.id, source.id);
  assert.equal(source.subject, 'Lettre du 23 octobre 2026', 'la source est intacte');
  source.subject = 'Lettre d’information du service';
  const b = M.derive(source, 'Copie');
  assert.equal(b.doc.subject, 'Lettre d’information du service'); assert.equal(b.replacedSubject, null);
  source.subject = '';
  const c = M.derive(source, 'Copie');
  assert.equal(c.doc.subject, ''); assert.equal(c.replacedSubject, null);
});
