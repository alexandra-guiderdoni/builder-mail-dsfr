/* Code réel SNUM/Files dans VM ; DOM, permission et écriture clipboard sont substitués.
 * Aucune preuve de presse-papiers système ou de restitution vocale native. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {webcrypto} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(execFileSync('python3', ['-B', '-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {cwd: root, encoding: 'utf8'}));
const fixture = fs.readFileSync(path.join(root, 'tests/fixtures/snum-46/entree-synthetique.json'), 'utf8');
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
async function setup(t) {
  const elements = new Map(), writes = [], objectURLs = new Set();
  function el(id) {
    if (!elements.has(id)) elements.set(id, {id, textContent: '', value: '', hidden: true, disabled: false, dataset: {}, attributes: {}, listeners: {},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      focus() { scope.document.activeElement = this; }});
    return elements.get(id);
  }
  class OwnedURL extends URL {
    static createObjectURL(blob) { const url = URL.createObjectURL(blob); objectURLs.add(url); return url; }
    static revokeObjectURL(url) { objectURLs.delete(url); URL.revokeObjectURL(url); }
  }
  const scope = {console, URL: OwnedURL, URLSearchParams, Blob, TextEncoder, crypto: webcrypto, atob, btoa, performance,
    setTimeout, clearTimeout, document: {getElementById: el}, navigator: {clipboard: {write(items) { const gate = deferred(); writes.push({items, ...gate}); return gate.promise; }}}};
  scope.window = scope;
  scope.ClipboardItem = class { constructor(parts) { this.parts = parts; this.types = Object.keys(parts); } };
  scope.MailBuilder = {catalog};
  const context = vm.createContext(scope);
  for (const file of ['app/source/model.js', 'app/source/render.js', 'prototype/reference/snum-packet.js', 'app/snum/adapter.js', 'app/source/files.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
  }
  const A = scope.MailBuilder;
  // DOMParser n'est pas disponible en VM : seul le HTML intermédiaire est substitué.
  // Le flux de copie réel conserve son calcul de blobs et son ordre asynchrone.
  A.Render = {...A.Render, clipboardHtml: A.Render.html};
  vm.runInContext(fs.readFileSync(path.join(root, 'app/snum/page.js'), 'utf8'), context, {filename: 'app/snum/page.js'});
  t.after(() => { for (const url of objectURLs) URL.revokeObjectURL(url); });
  const change = text => { el('snum-input').value = text; el('snum-input').listeners.input(); };
  const convert = async (text = fixture) => { change(text); await el('convert').listeners.click(); };
  const copy = () => { assert.equal(el('copy').disabled, false, 'le contrôle doit être activable'); return el('copy').listeners.click(); };
  await convert();
  assert(A.doc(), `conversion initiale : ${el('error-text').textContent}`);
  assert.equal(el('error').hidden, true);
  return {A, el, writes, change, convert, copy};
}
const secondFixture = () => { const packet = JSON.parse(fixture); packet.articles[0].title = 'Article B, nouvelle conversion'; return JSON.stringify(packet); };
async function assertWritten(write, html, plain) {
  assert.equal(write.items.length, 1);
  assert.deepEqual([...write.items[0].types], ['text/html', 'text/plain']);
  assert.equal(await write.items[0].parts['text/html'].text(), html);
  assert.equal(await write.items[0].parts['text/plain'].text(), plain);
}

test('SNUM : copie sans modification, succès et blobs HTML/texte exacts', async t => {
  const h = await setup(t), html = h.A.Render.clipboardHtml(h.A.doc()), plain = h.A.Render.plain(h.A.doc());
  const copying = h.copy();
  assert.equal(h.writes.length, 1);
  h.writes[0].resolve(); await copying;
  await assertWritten(h.writes[0], html, plain);
  assert.match(h.el('notice').textContent, /^Courriel copié en HTML et texte\./);
  assert.equal(h.el('error').hidden, true);
  assert.equal(h.el('copy').disabled, false);
});

test('SNUM : la fin de copie A ne masque pas la saisie devenue sale', async t => {
  const h = await setup(t), html = h.A.Render.clipboardHtml(h.A.doc()), plain = h.A.Render.plain(h.A.doc());
  const copying = h.copy(); h.change(fixture + ' ');
  const notice = h.el('notice').textContent;
  assert.match(notice, /reconvertissez/);
  assert.equal(h.el('copy').disabled, true);
  h.writes[0].resolve(); await copying;
  assert.equal(h.el('notice').textContent, notice);
  assert.equal(h.el('copy').disabled, true);
  assert.throws(() => h.A.State.guard(), /Convertissez la collecte actuelle/);
  await assertWritten(h.writes[0], html, plain);
});

test('SNUM : la fin de copie A ne masque pas une conversion B prête', async t => {
  const h = await setup(t), html = h.A.Render.clipboardHtml(h.A.doc()), plain = h.A.Render.plain(h.A.doc());
  const copying = h.copy(); await h.convert(secondFixture());
  const notice = h.el('notice').textContent;
  assert(h.A.Render.plain(h.A.doc()).includes('Article B, nouvelle conversion'));
  h.writes[0].resolve(); await copying;
  assert.equal(h.el('notice').textContent, notice);
  assert.equal(h.el('copy').disabled, false);
  assert.doesNotThrow(() => h.A.State.guard());
  await assertWritten(h.writes[0], html, plain);
});

test('SNUM : le refus tardif de copie A ne pollue pas la conversion B', async t => {
  const h = await setup(t), copying = h.copy();
  await h.convert(secondFixture()); const notice = h.el('notice').textContent;
  h.writes[0].reject(new Error('Ancien refus A')); await copying;
  assert.equal(h.el('error').hidden, true);
  assert.equal(h.el('notice').textContent, notice);
});

test('SNUM : refus puis succès sans reconversion retire seulement l’erreur précédente', async t => {
  const h = await setup(t), html = h.A.Render.clipboardHtml(h.A.doc()), plain = h.A.Render.plain(h.A.doc());
  let copying = h.copy(); h.writes[0].reject(new Error('Premier refus')); await copying;
  assert.equal(h.el('error').hidden, false); assert.equal(h.el('error-text').textContent, 'Premier refus');
  copying = h.copy(); h.writes[1].resolve(); await copying;
  assert.equal(h.el('error').hidden, true); assert.equal(h.el('error-text').textContent, '');
  assert.match(h.el('notice').textContent, /^Courriel copié/);
  await assertWritten(h.writes[1], html, plain);
});

test('SNUM : un nouveau refus reste explicite après le premier', async t => {
  const h = await setup(t);
  for (const [index, message] of ['Premier refus', 'Deuxième refus'].entries()) {
    const copying = h.copy(); h.writes[index].reject(new Error(message)); await copying;
    assert.equal(h.el('error').hidden, false); assert.equal(h.el('error-text').textContent, message);
    assert.equal(h.el('notice').textContent, '');
  }
});

test('SNUM : succès A tardif ne retire pas une erreur de conversion plus récente', async t => {
  const h = await setup(t), copying = h.copy();
  await h.convert('texte invalide');
  const error = h.el('error-text').textContent;
  assert(error); assert.equal(h.el('error').hidden, false);
  assert.equal(h.el('snum-input').attributes['aria-invalid'], 'true');
  h.writes[0].resolve(); await copying;
  assert.equal(h.el('error').hidden, false); assert.equal(h.el('error-text').textContent, error);
  assert.doesNotMatch(h.el('notice').textContent, /^Courriel copié/);
});

test('SNUM : succès A tardif ne retire pas le refus d’une copie B plus récente', async t => {
  const h = await setup(t), copyingA = h.copy(), copyingB = h.copy();
  h.writes[1].reject(new Error('Refus B plus récent')); await copyingB;
  h.writes[0].resolve(); await copyingA;
  assert.equal(h.el('error').hidden, false); assert.equal(h.el('error-text').textContent, 'Refus B plus récent');
  assert.doesNotMatch(h.el('notice').textContent, /^Courriel copié/);
});

test('SNUM : refus A tardif ne pollue pas le succès de copie B', async t => {
  const h = await setup(t), copyingA = h.copy(), copyingB = h.copy();
  h.writes[1].resolve(); await copyingB;
  const notice = h.el('notice').textContent;
  h.writes[0].reject(new Error('Ancien refus A')); await copyingA;
  assert.equal(h.el('error').hidden, true); assert.equal(h.el('notice').textContent, notice);
});

test('SNUM/Files : confirmation refusée simulée ne produit ni copie ni succès', async t => {
  const h = await setup(t);
  let copying = h.copy(); h.writes[0].reject(new Error('Refus précédent')); await copying;
  h.A.Checks = {warnings: () => ['avertissement synthétique'], confirm: async () => false};
  copying = h.copy(); await copying;
  assert.equal(h.writes.length, 1, 'aucune nouvelle écriture');
  assert.equal(h.el('notice').textContent, '');
  assert.equal(h.el('error-text').textContent, 'Refus précédent', 'aucune réussite ne remplace l’ancien résultat');
});
