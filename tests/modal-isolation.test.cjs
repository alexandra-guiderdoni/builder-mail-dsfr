const test = require('node:test');
const assert = require('node:assert/strict');
const {fixture} = require('./modal-dom.cjs');
const warning = f => [{block: f.doc.blocks[0].id, field: 'field-f0', message: 'À vérifier.'}];

test('la confirmation retire les deux documents de fond et les reconstruit après annulation', async () => {
  const f = fixture();
  f.A.Preview.show(f.doc);
  const old = f.element('preview'), oldCatalogue = f.element('catalogue-preview');
  const origin = f.document.activeElement = f.element('document-name');
  const confirmation = f.A.Checks.confirm('export', warning(f));
  assert.equal(f.element('check-dialog').open, true);
  assert.equal(f.element('preview'), undefined);
  assert.equal(f.element('catalogue-preview'), undefined);
  assert.equal(old.isConnected, false); assert.equal(oldCatalogue.isConnected, false);
  f.element('check-cancel').emit('click');
  f.drainClose();
  assert.equal(await confirmation, false);
  assert.notEqual(f.element('preview'), old);
  assert.notEqual(f.element('catalogue-preview'), oldCatalogue);
  assert.equal(f.document.activeElement, origin);
});

test('une navigation interrompue reprend seulement le dernier rendu et ignore load/message anciens', async () => {
  const f = fixture(), costs = [];
  f.A.Preview.show(f.doc);
  const old = f.element('preview'), oldWindow = old.contentWindow, oldToken = old.src.split('#')[1];
  const confirmation = f.A.Checks.confirm('export', warning(f));
  const count = f.blobs.size;
  for (let index = 0; index < 40; index++) {
    const doc = f.A.Model.create(`Rafale ${index}`, [19]);
    f.A.Preview.show(doc, cost => costs.push([index, cost]));
  }
  assert.throws(() => f.A.Preview.show(null));
  assert.equal(f.blobs.size, count, 'aucun Blob créé pendant la suspension');
  f.tick(10000); f.element('check-cancel').emit('click'); f.drainClose(); await confirmation;
  const current = f.element('preview'), url = current.src;
  old.emit('load');
  assert.equal(current.src, url); assert.deepEqual(costs, []);
  f.message({source: oldWindow, origin: 'null', data: {type: 'mail-preview-size', token: oldToken, height: 9999, width: 640}});
  assert.notEqual(current.style.height, '10002px');
  f.tick(7); current.emit('load');
  assert.deepEqual(costs, [[39, 7]], 'le coût exclut les dix secondes de suspension');
  assert.ok((await f.blobs.get(url.split('#')[0]).text()).includes('<title>Rafale 39</title>'));
  assert.equal(f.blobs.size, 1, 'un seul Blob vivant après reprise');
  const freshToken = current.src.split('#')[1];
  f.message({source: current.contentWindow, origin: 'null', data: {type: 'mail-preview-size', token: freshToken, height: 700, width: 640}});
  assert.equal(current.style.height, '703px');
});

test('une confirmation remplace la précédente sans remonter le fond ; close tardif et double submit sont sans effet', async () => {
  const f = fixture(); f.A.Preview.show(f.doc);
  const first = f.A.Checks.confirm('copy', warning(f));
  const replacements = f.replacements.length;
  const second = f.A.Checks.confirm('export', warning(f));
  assert.equal(f.replacements.length, replacements, 'aucune insertion entre confirmations');
  f.drain(); // close de la première alors que la seconde est ouverte
  assert.equal(await first, false);
  assert.equal(f.element('check-dialog').open, true); assert.equal(f.element('preview'), undefined);
  let outputs = 0; second.then(go => { if (go) outputs++; });
  f.element('check-form').emit('submit'); f.element('check-form').emit('submit');
  f.drainClose();
  assert.equal(await second, true); await Promise.resolve(); assert.equal(outputs, 1);
  f.drain(); assert.ok(f.element('preview')); assert.equal(f.replacements.length, replacements + 2);
});

for (const phase of ['showModal', 'focus']) test(`l’échec de ${phase} restaure les aperçus et garde la primaire`, async () => {
  const f = fixture(); f.A.Preview.show(f.doc);
  const primary = new Error('primary-' + phase);
  if (phase === 'showModal') f.element('check-dialog').showError = primary;
  else f.element('check-dialog-title').focusError = primary;
  const confirmation = f.A.Checks.confirm('copy', warning(f));
  const rejected = assert.rejects(confirmation, error => error === primary);
  if (phase === 'focus') f.drainClose();
  await rejected;
  assert.equal(f.element('check-dialog').open, false); assert.ok(f.element('preview')); assert.ok(f.element('catalogue-preview'));
});

test('sans avertissement aucun aperçu n’est retiré ; Escape ferme une confirmation sans autoriser la sortie', async () => {
  const f = fixture(), old = f.element('preview');
  assert.equal(await f.A.Checks.confirm('copy', []), true); assert.equal(f.element('preview'), old);
  const confirmation = f.A.Checks.confirm('copy', warning(f));
  f.element('check-dialog').close(); f.drain();
  assert.equal(await confirmation, false); assert.ok(f.element('preview'));
});

test('une fermeture refusée ne réinsère pas le fond et la fermeture ultérieure libère sa suspension', async () => {
  const f = fixture(), dialog = f.element('check-dialog'), close = dialog.close.bind(dialog);
  f.A.Preview.show(f.doc);
  const primary = new Error('close refused'), confirmation = f.A.Checks.confirm('copy', warning(f));
  dialog.close = () => { throw primary; };
  f.element('check-form').emit('submit');
  await assert.rejects(confirmation, error => error === primary);
  assert.equal(dialog.open, true); assert.equal(f.element('preview'), undefined);
  dialog.close = close; close(); f.drain();
  assert.ok(f.element('preview')); assert.ok(f.element('catalogue-preview'));
});

test('le coût d’un rendu terminé n’est pas notifié de nouveau après une confirmation', async () => {
  const f = fixture(), costs = [];
  f.A.Preview.show(f.doc, cost => costs.push(cost)); f.tick(8); f.element('preview').emit('load');
  assert.deepEqual(costs, [8]);
  const confirmation = f.A.Checks.confirm('copy', warning(f)); f.tick(20000);
  f.element('check-cancel').emit('click'); f.drainClose(); await confirmation;
  f.tick(4); f.element('preview').emit('load');
  assert.deepEqual(costs, [8]);
});

test('la frappe différée et le dernier choix catalogue survivent au retrait des aperçus', async () => {
  const f = fixture();
  f.A.Storage = {save: async () => ({token: 'saved'})}; // frontière de persistance, sans IndexedDB
  f.load('state.js'); f.load('files.js'); f.load('view.js');
  f.doc.subject = ''; f.A.library.documents = [f.doc]; f.A.library.activeId = f.doc.id;
  f.A.UI.preview();
  const confirmation = f.A.Checks.confirm('export', [{block: f.A.doc().blocks[0].id, message: 'À vérifier.'}]);
  await f.A.State.change(lib => { lib.documents[0].name = 'Dernière frappe'; }, false, true);
  assert.doesNotThrow(() => f.drain());
  f.element('catalogue').value = 'mail-19';
  assert.doesNotThrow(() => f.element('catalogue').emit('change'));
  assert.equal(f.element('preview'), undefined);
  f.element('check-cancel').emit('click'); f.drainClose(); assert.equal(await confirmation, false);
  const current = f.element('preview');
  const html = await f.blobs.get(current.src.split('#')[0]).text();
  assert.ok(html.includes('Dernière frappe'));
  assert.equal(f.element('catalogue-preview').dataset.component, 'mail-19');
  assert.ok(f.element('catalogue-preview').srcdoc.includes('Aperçu du composant'));
});
