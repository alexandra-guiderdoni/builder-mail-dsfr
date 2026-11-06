const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const catalog = JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}));

function ui(documents, activeId = documents[0].id) {
  const nodes = new Map();
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, {id, value: '', innerHTML: '', textContent: '', hidden: false,
      addEventListener() {}, setAttribute() {}, removeAttribute() {}, focus() {}, select() {}, showModal() { this.open = true; }, querySelectorAll: () => []});
    return nodes.get(id);
  };
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const A = {library: {documents, activeId, templates: [], identities: []},
    doc: () => documents.find(d => d.id === activeId), Render: {escape}, catalog, State: {guard() {}}, error() {}};
  const scope = {MailBuilder: A, document: {getElementById: get, fonts: {ready: {then() {}}}}, ResizeObserver: class {observe() {}}, matchMedia: () => ({matches: false, addEventListener() {}}), setTimeout, clearTimeout};
  scope.window = scope;
  // Le vrai modèle fournit les libellés et accords ; le reste de l’interface est simulé.
  for (const f of ['app/source/model.js', 'app/source/view.js', 'app/source/library.js']) vm.runInNewContext(fs.readFileSync(f, 'utf8'), scope, {filename: f});
  return {A, get};
}
const doc = (id, name) => ({id, name, subject: 'Même objet', blocks: []});

test('homonymes : même distinction dans le sélecteur, les cartes et leurs actions, sans changer les données', () => {
  const documents = [doc('a', 'Sonde <&>'), doc('b', 'Sonde <&>'), doc('c', 'Unique')];
  const before = JSON.stringify(documents), h = ui(documents, 'b'); h.A.UI.selections();
  assert.match(h.get('documents').innerHTML, /Sonde &lt;&amp;&gt; \(n° 1\)/);
  assert.match(h.get('documents').innerHTML, /Sonde &lt;&amp;&gt; \(n° 2\)/);
  assert.match(h.get('documents').innerHTML, /value="b" selected/);
  for (const action of ['Ouvrir', 'Renommer la newsletter', 'Dupliquer la newsletter', 'Exporter la newsletter', 'Supprimer la newsletter']) {
    for (const rank of [1, 2]) assert(h.get('newsletter-list').innerHTML.includes(`aria-label="${action} Sonde &lt;&amp;&gt; (n° ${rank})"`), action);
  }
  assert.match(h.get('resume-document').textContent, /n° 2/);
  h.A.Library.ask('remove', 'b'); assert.match(h.get('library-dialog-title').textContent, /n° 2/);
  assert.equal(JSON.stringify(documents), before);
});

test('homonymes : valeur de sélection en attente conservée et distinction recalculée après renommage', () => {
  const documents = [doc('a', 'Même nom'), doc('b', 'Même nom')], h = ui(documents);
  h.A.UI.selections(); h.get('documents').value = 'b'; h.A.UI.selections();
  assert.match(h.get('documents').innerHTML, /value="b" selected/); assert.equal(h.get('open-document').hidden, false);
  documents[1].name = 'Nouveau nom'; h.A.UI.selections();
  assert.doesNotMatch(h.get('documents').innerHTML, /n°/);
  assert.match(h.get('newsletter-list').innerHTML, /Ouvrir Nouveau nom/);
});


test('homonymes : les suffixes déjà présents et imbriqués ne créent aucune collision globale', () => {
  for (const names of [
    ['Édition', 'Édition', 'Édition (n° 1)'],
    ['Édition', 'Édition', 'Édition (n° 1)', 'Édition (n° 1)', 'Édition (n° 1) (n° 1)'],
    ['[1] Édition', '[1] Édition', '[1] Édition (n° 1)', '[2] [1] Édition (n° 1)']
  ]) {
    const documents = names.map((name, index) => doc(String(index), name));
    const before = JSON.stringify(documents), h = ui(documents);
    const labels = h.A.UI.documentLabels().map(([, label]) => label);
    assert.equal(new Set(labels).size, names.length, JSON.stringify(names));
    h.A.UI.selections();
    for (const label of labels) assert(h.get('newsletter-list').innerHTML.includes(`aria-label="Ouvrir ${label}"`));
    assert.equal(JSON.stringify(documents), before);
  }
});

test('homonymes : les libellés ordinaires restent inchangés hors collision résiduelle', () => {
  const documents = [doc('a', 'Édition'), doc('b', 'Édition'), doc('c', 'Autre (n° 1)')];
  const labels = ui(documents).A.UI.documentLabels().map(([, label]) => label);
  assert.equal(JSON.stringify(labels), JSON.stringify(['Édition (n° 1)', 'Édition (n° 2)', 'Autre (n° 1)']));
});

test('compteur : singulier pour un seul élément, pluriel au-delà', () => {
  const count = (documents, extra = {}) => { const h = ui(documents); Object.assign(h.A.library, extra); h.A.UI.selections(); return h.get('library-count').textContent; };
  assert.equal(count([doc('a', 'Une')]), '1 newsletter · 0 modèles · 0 identités');
  assert.equal(count([doc('a', 'Une')], {templates: [doc('t', 'Modèle')], identities: [doc('i', 'Identité')]}), '1 newsletter · 1 modèle · 1 identité');
  assert.equal(count([doc('a', 'Une'), doc('b', 'Deux')], {templates: [doc('t', 'A'), doc('u', 'B')], identities: [doc('i', 'A'), doc('j', 'B')]}), '2 newsletters · 2 modèles · 2 identités');
});

test('nombre de blocs au singulier dans le résumé et sur la carte de la newsletter', () => {
  const one = {...doc('a', 'Courte'), blocks: [{id: 'b1', component: 'mail-02', values: {}}]};
  const h = ui([one]); h.A.Files = {staleWeight() {}};
  h.A.UI.summary(); assert.equal(h.get('composition-summary').textContent, '1 bloc dans « Courte »');
  h.A.UI.selections(); assert.match(h.get('newsletter-list').innerHTML, / · 1 bloc(?!s)/);
});
