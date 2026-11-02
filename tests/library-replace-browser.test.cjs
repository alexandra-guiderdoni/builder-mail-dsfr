const test = require('node:test');
const {portable, open, enterEditor, saved, state, store, chromium, assert} = require('./browser-support.cjs');

// #208 : un seul point d'entrée remplace ou efface toute la bibliothèque. L'écriture précède l'affichage ; les autres
// fenêtres sont verrouillées avec le motif, jamais « disparu » ; les mémoires d'annulation et brouillons sont vidés.
// Données synthétiques ; chaque test constate séparément la mémoire et le stockage.
const banner = '#read-only';
async function second(context, init) {
  const page = await context.newPage(); if (init) await page.addInitScript(init);
  await page.goto(portable); await page.waitForFunction(() => window.MailBuilder?.ready); await enterEditor(page); return page;
}
async function prepare(page) {
  await page.locator('#document-name').fill('Avant'); await saved(page);
  await page.evaluate(() => { const A = MailBuilder; A.removed.set(A.library.activeId, {block: A.doc().blocks[0], index: 0}); });
}
const replace = (page, name, options) => page.evaluate(async ({name, options}) => {
  const lib = MailBuilder.Model.initial(); lib.documents[0].name = name;
  try { await MailBuilder.State.replaceLibrary(lib, options); return {ok: true}; } catch (cause) { return {ok: false, message: cause.message, storage: cause.storage}; }
}, {name, options});
const previous = page => page.evaluate(() => MailBuilder.Storage.load('previous'));
async function lockedWith(page, motif) {
  await page.locator(banner).waitFor({state: 'visible', timeout: 5000});
  const text = await page.locator('#read-only-message').textContent();
  assert.match(text, motif); assert.doesNotMatch(text, /disparu/);
  assert.equal(await page.locator('#document-name').isDisabled(), true);
}

test('#208 remplacer : écriture puis affichage, état précédent gardé, mémoires vidées, autre fenêtre verrouillée avec son motif', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser); await prepare(page);
    const other = await second(context);
    const result = await replace(page, 'Restaurée', {reason: 'remplacement', keepPrevious: true});
    assert.deepEqual(result, {ok: true});
    assert.deepEqual((await state(page)).documents.map(d => d.name), ['Restaurée']);
    const current = await store(page); assert.equal(current.reason, 'remplacement'); assert.deepEqual(current.library.documents.map(d => d.name), ['Restaurée']);
    assert.deepEqual((await previous(page)).library.documents.map(d => d.name), ['Avant']);
    assert.equal(await page.evaluate(() => MailBuilder.removed.size + MailBuilder.drafts.size + MailBuilder.invalid.size), 0);
    await lockedWith(other, /remplacée/);
  } finally { await browser.close(); }
});

test('#208 échec d’écriture ou jeton périmé : mémoire et stockage strictement inchangés', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser); await prepare(page);
    const before = await state(page), stored = await store(page);
    await page.evaluate(() => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function(...args) { if (this.name === 'library') throw new DOMException('Quota de recette', 'QuotaExceededError'); return put.apply(this, args); }; });
    const quota = await replace(page, 'Jamais', {reason: 'remplacement', keepPrevious: true});
    assert.equal(quota.ok, false); assert.equal(quota.storage, 'saturé');
    assert.deepEqual(await state(page), before); assert.equal(await page.evaluate(() => MailBuilder.removed.size), 1);
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready); await enterEditor(page);
    assert.deepEqual((await store(page)).token, stored.token);
    const other = await second(context);
    await other.locator('#document-name').fill('Autre fenêtre'); await saved(other);
    const memory = await state(page), stale = await replace(page, 'Périmée', {reason: 'remplacement', keepPrevious: true});
    assert.equal(stale.ok, false); assert.equal(stale.storage, 'conflit');
    assert.deepEqual(await state(page), memory);
    assert.deepEqual((await store(other)).library.documents.map(d => d.name), ['Autre fenêtre']);
  } finally { await browser.close(); }
});

test('#208 effacer : état précédent supprimé, récupération vide, fenêtre sans diffusion verrouillée au plus tard à sa modification', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser); await prepare(page);
    const other = await second(context, () => { delete window.BroadcastChannel; });
    assert.deepEqual(await replace(page, 'Mon premier courriel', {reason: 'effacement', keepPrevious: false}), {ok: true});
    assert.equal(await previous(page), undefined);
    assert.equal((await store(page)).reason, 'effacement');
    const recover = await page.evaluate(() => MailBuilder.State.recover().then(() => 'relu', cause => cause.message));
    assert.match(recover, /Aucun état précédent/);
    assert.equal(await other.locator(banner).isHidden(), true, 'sans diffusion, la fenêtre ne le sait qu’à sa prochaine écriture');
    await other.locator('#document-name').fill('Ancien travail'); await other.locator('#document-name').press('Tab');
    await lockedWith(other, /effacée/);
    assert.deepEqual((await store(page)).library.documents.map(d => d.name), ['Mon premier courriel']);
  } finally { await browser.close(); }
});

test('#208 bibliothèque enregistrée illisible : remplacement et effacement refusés, export brut proposé', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await prepare(page);
    await page.evaluate(() => { MailBuilder.recoveryOnly = true; });
    for (const reason of ['remplacement', 'effacement']) {
      const refused = await replace(page, 'Interdit', {reason, keepPrevious: reason === 'remplacement'});
      assert.equal(refused.ok, false); assert.match(refused.message, /données enregistrées brutes/);
    }
    assert.deepEqual((await store(page)).library.documents.map(d => d.name), ['Avant']);
  } finally { await browser.close(); }
});
