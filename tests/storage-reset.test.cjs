const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');

// Classe les transactions du vrai Storage ; frontière IndexedDB substituée explicitement.
function storage(previous) {
  let writes = 0;
  const db = {close() {}, transaction() {
    let aborted = false;
    const tx = {objectStore() { return {get() {
      const request = {result: previous};
      queueMicrotask(() => { request.onsuccess?.(); if (!aborted) tx.oncomplete?.(); });
      return request;
    }, put() { writes++; }}; }, abort() { aborted = true; queueMicrotask(() => tx.onabort?.({})); }};
    return tx;
  }};
  const scope = {crypto: webcrypto, document: {querySelector: () => ({content: 'version-test'})},
    indexedDB: {open() { const request = {result: db}; queueMicrotask(() => request.onsuccess()); return request; }}};
  scope.window = scope; scope.MailBuilder = {Model: {copy: structuredClone, library: v => v}};
  vm.runInNewContext(fs.readFileSync('app/source/storage.js', 'utf8'), scope);
  return {Storage: scope.MailBuilder.Storage, writes: () => writes};
}

test('base disparue après un jeton connu : diagnostic de réinitialisation sans écriture', async () => {
  const h = storage(undefined);
  await assert.rejects(h.Storage.save({synthetic: true}, 'ancien-token'), e => {
    assert.equal(e.storage, 'réinitialisé');
    assert.match(e.message, /disparu|réinitialisé/); assert.doesNotMatch(e.message, /autre fenêtre/); return true;
  });
  assert.equal(h.writes(), 0);
});

test('première sauvegarde sans base : création autorisée', async () => {
  const h = storage(undefined), record = await h.Storage.save({synthetic: true}, null);
  assert(record.token); assert.equal(h.writes(), 1);
});

test('un autre jeton présent reste un conflit, et un jeton courant conserve previous', async () => {
  const h = storage({token: 'autre-token', library: {old: true}});
  await assert.rejects(h.Storage.save({synthetic: true}, 'ancien-token'), e => e.storage === 'conflit');
  assert.equal(h.writes(), 0);
  const current = storage({token: 'courant', library: {old: true}});
  await current.Storage.save({synthetic: true}, 'courant'); assert.equal(current.writes(), 2);
});
