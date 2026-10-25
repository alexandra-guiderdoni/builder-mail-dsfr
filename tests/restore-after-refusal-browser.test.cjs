const test = require('node:test');
const {click, open, enterEditor, saved, expand, store, portable, chromium, fs, assert} = require('./browser-support.cjs');

// Fenêtre dont la première ouverture d'IndexedDB est refusée (une seule fois par onglet, donc pas après un rechargement) ; toute écriture ultérieure dans le stockage est comptée.
async function refusedWindow(context) {
  const page = await context.newPage(), errors = []; page.setDefaultTimeout(8000);
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    if (window !== window.top || location.protocol !== 'file:') return;
    // La demande appartient à cette navigation de recette, jamais au document about:blank,
    // au stockage ni au nom de fenêtre. Le reload garde le même fichier sans le fragment consommé.
    const open = IDBFactory.prototype.open; let attempts = 0; window.writes = 0;
    const requested = location.hash === '#mailbuilder-test-refuse-idb-once';
    if (requested) history.replaceState(null, '', location.href.split('#')[0]);
    window.refusedAtStart = !requested; window.fixtureRefusals = 0; window.nativeOpens = 0;
    IDBFactory.prototype.open = function(...args) {
      if (requested && ++attempts === 1) { window.fixtureRefusals++; const request = {}; queueMicrotask(() => request.onerror?.()); return request; }
      window.nativeOpens++;
      return open.apply(this, args);
    };
    for (const method of ['put', 'add', 'delete', 'clear']) { const original = IDBObjectStore.prototype[method]; IDBObjectStore.prototype[method] = function(...args) { window.writes++; return original.apply(this, args); }; }
  });
  await page.goto(portable + '#mailbuilder-test-refuse-idb-once'); await page.waitForFunction(() => window.MailBuilder?.ready);
  assert.equal(page.url(), portable, 'le fragment de demande est consommé nativement sur le même fichier');
  assert.equal(await page.evaluate(() => window.refusedAtStart), false, 'cette fenêtre doit recevoir son unique refus initial');
  assert.equal(await page.evaluate(() => window.fixtureRefusals), 1, 'une seule ouverture est artificiellement refusée');
  assert.equal(await page.evaluate(() => MailBuilder.recoveryOnly), true, 'le refus initial doit placer la page en mode récupération');
  return {page, errors};
}
const activeName = async page => { const {library} = await store(page); return library.documents.find(d => d.id === library.activeId).name; };
const raw = page => page.evaluate(async () => ({current: await MailBuilder.Storage.load(), previous: await MailBuilder.Storage.load('previous')}));
async function seed(browser) {
  const {page: writer, context} = await open(browser);
  await writer.locator('#document-name').fill('Premier état'); await saved(writer);
  await writer.locator('#document-name').fill('Second état'); await saved(writer);
  return {writer, context};
}
async function exportTemporary(page) {
  const event = page.waitForEvent('download'); await click(page, '#reopen-export');
  const result = await event; return JSON.parse(await fs.readFile(await result.path(), 'utf8'));
}

test('refus initial d’IndexedDB : « Restaurer l’état précédent » propose export puis rechargement, sans faux conflit ni écriture', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {writer, context} = await seed(browser), before = await raw(writer);
    const {page, errors} = await refusedWindow(context); page.on('dialog', dialog => dialog.accept());
    await enterEditor(page); await page.locator('#document-name').fill('Travail temporaire');
    await expand(page, 'Fichiers et récupération'); await click(page, '[data-action=recover]');
    await page.locator('#reopen-offer').waitFor({state: 'visible'});
    assert.doesNotMatch(await page.locator('#error').innerText(), /Une autre fenêtre/, 'aucun conflit n’existe');
    assert.doesNotMatch(await page.locator('#save-state').innerText(), /Récupération impossible/);
    const offer = await page.locator('#reopen-offer').innerText();
    assert.match(offer, /Exporter le travail temporaire/); assert.match(offer, /Recharger l’atelier/); assert.match(offer, /n’y a rien écrit|aucune écriture/i);
    assert.equal(await page.evaluate(() => window.writes), 0, 'aucune écriture dans le stockage existant');
    assert.deepEqual(await raw(writer), before);
    assert.equal(await page.locator('#document-name').inputValue(), 'Travail temporaire', 'le travail temporaire reste en mémoire');
    const library = await exportTemporary(page);
    assert(JSON.stringify(library).includes('Travail temporaire'), 'l’export contient le travail temporaire');
    assert.deepEqual(await raw(writer), before);
    // Reproduire la précondition observée en CI : le marqueur sessionStorage manque au rechargement.
    // Ce retrait contrôlé ne prétend pas expliquer sa disparition sous Linux.
    await page.evaluate(() => { sessionStorage.removeItem('refus-initial'); window.name = ''; });
    await Promise.all([page.waitForEvent('load'), click(page, '#reopen-reload')]); await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.equal(await page.evaluate(() => window.refusedAtStart), true, 'le refus reste consommé même sans le marqueur sessionStorage');
    assert.equal(await page.evaluate(() => window.fixtureRefusals), 0, 'aucun refus artificiel au rechargement');
    assert(await page.evaluate(() => window.nativeOpens > 0), 'le rechargement ouvre réellement IndexedDB');
    assert.equal(await page.evaluate(() => MailBuilder.recoveryOnly), false);
    assert.match(await page.locator('#save-state').innerText(), /restaurée depuis ce navigateur/);
    await enterEditor(page); assert.equal(await page.locator('#document-name').inputValue(), 'Second état');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('écriture concurrente pendant la récupération : rien n’est écrasé, le rechargement relit l’état concurrent et le contrôle de conflit reste actif', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {writer, context} = await seed(browser);
    const {page} = await refusedWindow(context); page.on('dialog', dialog => dialog.accept());
    await enterEditor(page); await page.locator('#document-name').fill('Travail temporaire');
    await expand(page, 'Fichiers et récupération'); await click(page, '[data-action=recover]');
    await page.locator('#reopen-offer').waitFor({state: 'visible'});
    await writer.locator('#document-name').fill('Écriture concurrente'); await saved(writer);
    const concurrent = await raw(writer);
    const library = await exportTemporary(page);
    assert(JSON.stringify(library).includes('Travail temporaire'));
    await click(page, '[data-action=recover]');
    assert.doesNotMatch(await page.locator('#error').innerText(), /Une autre fenêtre/, 'toujours aucun faux conflit');
    assert.equal(await page.evaluate(() => window.writes), 0);
    assert.deepEqual(await raw(writer), concurrent, 'l’écriture concurrente est intacte');
    await Promise.all([page.waitForEvent('load'), click(page, '#reopen-reload')]); await page.waitForFunction(() => window.MailBuilder?.ready);
    /* Un nom initial après rechargement signifierait une bibliothèque non relue : l’état réel est nommé avant la comparaison. */
    const reloaded = await page.evaluate(() => ({recoveryOnly: MailBuilder.recoveryOnly, refusedAtStart: window.refusedAtStart, writes: window.writes, saveState: document.querySelector('#save-state').textContent, error: document.getElementById('error').textContent, documents: MailBuilder.library.documents.map(d => d.name)}));
    assert.equal(reloaded.recoveryOnly, false, `le rechargement doit relire la bibliothèque enregistrée : ${JSON.stringify(reloaded)}`);
    assert.equal(reloaded.refusedAtStart, true, `le refus initial doit déjà être consommé au rechargement : ${JSON.stringify(reloaded)}`);
    assert.equal(await page.evaluate(() => window.fixtureRefusals), 0, 'aucun nouveau refus pendant la récupération concurrente');
    assert(await page.evaluate(() => window.nativeOpens > 0), 'la bibliothèque concurrente est relue par IndexedDB natif');
    await enterEditor(page); assert.equal(await page.locator('#document-name').inputValue(), 'Écriture concurrente', `le rechargement relit le jeton et l’état concurrents ; page rechargée : ${JSON.stringify(reloaded)} ; stockage : ${JSON.stringify((await raw(page)).current?.library.documents.map(d => d.name))}`);
    assert.deepEqual(await raw(writer), concurrent);
    // Le contrôle de conflit fonctionne dans les deux sens après le rechargement.
    await page.locator('#document-name').fill('Après rechargement'); await saved(page);
    assert.equal(await activeName(writer), 'Après rechargement');
    await writer.locator('#document-name').fill('Écriture périmée'); await writer.locator('#error').filter({hasText: 'Une autre fenêtre'}).waitFor();
    assert.equal(await activeName(page), 'Après rechargement');
  } finally { await browser.close(); }
});

test('sans IndexedDB : l’export du travail est proposé, sans rechargement trompeur', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const context = await browser.newContext({acceptDownloads: true}), page = await context.newPage();
    await page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', {value: undefined}); });
    await page.goto(portable); await page.waitForFunction(() => window.MailBuilder?.ready);
    await enterEditor(page); await page.locator('#document-name').fill('Travail sans stockage');
    await expand(page, 'Fichiers et récupération'); await click(page, '[data-action=recover]');
    await page.locator('#reopen-offer').waitFor({state: 'visible'});
    assert.equal(await page.locator('#reopen-reload').isVisible(), false);
    assert.match(await page.locator('#reopen-offer').innerText(), /Aucun stockage/);
    assert(JSON.stringify(await exportTemporary(page)).includes('Travail sans stockage'));
  } finally { await browser.close(); }
});
