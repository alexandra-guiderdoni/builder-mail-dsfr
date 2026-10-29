const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app/source/remote-images.js', 'utf8');
const ticks = () => new Promise(resolve => setTimeout(resolve, 5));
function scenario(moduleSource = source) {
  const saved = 'https://images.example/saved.png', next = 'https://images.example/next.png';
  const listeners = {}, errors = [], images = [];
  let field = {id: 'remote-image-url-f0', value: next, isConnected: true};
  const A = {
    Model: {url() {}}, Render: {escape: value => value},
    doc: () => ({id: 'doc'}), selected: 'block', library: {}, pendingInputs: 0,
    drafts: new Map([['url', {value: next}]]),
    notice() {}, error: message => errors.push(message),
    State: {guardEdit() {}, noticeTicket: () => 1, setDraft(doc, block, input, value, message) { A.drafts.set('url', {value, message}); }},
    UI: {fieldError() {}}
  };
  const editor = {addEventListener(type, fn) { listeners[type] = fn; }};
  const document = {getElementById: id => id === 'block-editor' ? editor : field, addEventListener() {}, removeEventListener() {}};
  const scope = {document, navigator: {onLine: true}, setTimeout, clearTimeout, URL,
    Image: class { constructor() { this.naturalWidth = 10; this.naturalHeight = 10; images.push(this); } }};
  scope.window = {MailBuilder: A};
  vm.runInNewContext(moduleSource, scope);
  return {A, errors, images, next, saved,
    start() { listeners.click({target: {closest: selector => selector === '[data-remote-image-apply]' ? {dataset: {remoteImageApply: 'f0'}} : null}}); },
    cancel() { A.drafts.clear(); field.isConnected = false; field = {id: field.id, value: saved, isConnected: true}; },
    editAgain() { field.value = 'https://images.example/newer.png'; A.drafts.set('url', {value: field.value, message: 'Non appliquée'}); }
  };
}
for (const outcome of ['load', 'error']) test(`annulation pendant chargement distant : résultat ${outcome} ignoré`, async () => {
  const run = scenario(); run.start(); assert.equal(run.A.pendingInputs, 1);
  run.cancel(); run.images[0]['on' + outcome](); await ticks();
  assert.equal(run.A.pendingInputs, 0);
  assert.equal(run.A.drafts.size, 0, 'le brouillon annulé ne revient pas');
  assert.deepEqual(run.errors, [], 'aucune erreur tardive ne remplace le résultat de l’annulation');
});
test('un échec du champ courant conserve le brouillon et son diagnostic', async () => {
  const run = scenario(); run.start(); run.images[0].onerror(); await ticks();
  assert.equal(run.A.pendingInputs, 0);
  assert.equal(run.A.drafts.get('url').value, run.next);
  assert.match(run.A.drafts.get('url').message, /n’a pas pu être chargée/);
  assert.equal(run.errors.length, 1);
});
test('une nouvelle saisie pendant le chargement garde son propre brouillon', async () => {
  const run = scenario(); run.start(); run.editAgain(); run.images[0].onload(); await ticks();
  assert.equal(run.A.pendingInputs, 0);
  assert.equal(run.A.drafts.get('url').value, 'https://images.example/newer.png');
  assert.match(run.A.drafts.get('url').message, /devenue obsolète/);
  assert.equal(run.errors.length, 1);
});
