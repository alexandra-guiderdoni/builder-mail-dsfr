const test = require('node:test');
const path = require('node:path');
const {root, evidence, portable, click, open, enterEditor, saved, expand, download, state, store, chromium, fs, assert} = require('./browser-support.cjs');

test('quota simulé : aucune écriture partielle, export du travail puis récupération de l’état précédent', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.locator('#document-name').fill('État initial sauvegardé'); await saved(page);
    await page.locator('#document-name').fill('Avant la panne'); await saved(page);
    const before = await store(page);
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      window.failWrites = true;
      IDBObjectStore.prototype.put = function(...args) { if (window.failWrites && this.name === 'library') throw new DOMException('Quota de recette', 'QuotaExceededError'); return put.apply(this, args); };
    });
    await page.locator('#document-name').fill('Travail en mémoire');
    await page.locator('#save-state').filter({hasText: 'Modifications non sauvegardées'}).waitFor();
    assert.deepEqual(await store(page), before);
    await expand(page, 'Fichiers et récupération');
    const output = await download(page, '[data-action=export-document]', 'quota-composition.json');
    assert.equal(JSON.parse(await fs.readFile(output, 'utf8')).name, 'Travail en mémoire');
    await click(page, '[data-action=recover]');
    await page.locator('#save-state').filter({hasText: 'Récupération impossible'}).waitFor();
    assert.equal(await page.locator('#document-name').inputValue(), 'Travail en mémoire'); assert.deepEqual(await store(page), before);
    await page.evaluate(() => { window.failWrites = false; }); await click(page, '[data-action=save-now]'); await saved(page);
    await click(page, '[data-action=recover]'); await page.locator('#notice').filter({hasText: 'État précédent relu'}).waitFor(); await saved(page);
    assert.equal(await page.locator('#document-name').inputValue(), 'Avant la panne'); assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('deux fenêtres ne peuvent pas écraser silencieusement leurs bibliothèques', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser);
    await page.locator('#document-name').fill('État partagé'); await saved(page);
    const second = await context.newPage(); await second.goto(portable); await second.waitForFunction(() => window.MailBuilder?.ready);
    await enterEditor(second);
    await page.locator('#document-name').fill('Sauvegarde première fenêtre'); await saved(page);
    await second.locator('#document-name').fill('Travail deuxième fenêtre'); await second.locator('#error').filter({hasText: 'Une autre fenêtre'}).waitFor();
    const stored = await store(page); assert.equal(stored.library.documents[0].name, 'Sauvegarde première fenêtre');
    await expand(second, 'Fichiers et récupération'); const output = await download(second, '[data-action=export-document]', 'conflit-composition.json');
    assert.equal(JSON.parse(await fs.readFile(output, 'utf8')).name, 'Travail deuxième fenêtre');
  } finally { await browser.close(); }
});

test('une version de bibliothèque inconnue reste intacte jusqu’à récupération explicite', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await page.locator('#document-name').fill('État récupérable'); await saved(page);
    await page.locator('#document-name').fill('État plus récent'); await saved(page);
    await page.evaluate(async () => {
      const record = await MailBuilder.Storage.load(); record.token = 'version-inconnue-de-recette'; record.library.version = 99;
      await new Promise((resolve, reject) => { const request = indexedDB.open('builder-mail-dsfr-library', 1); request.onsuccess = () => { const tx = request.result.transaction('library', 'readwrite'); tx.objectStore('library').put(record, 'current'); tx.oncomplete = resolve; tx.onerror = reject; }; });
    });
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    await page.locator('#error').filter({hasText: 'Version de bibliothèque non prise en charge'}).waitFor();
    await enterEditor(page);
    await page.locator('#document-name').fill('Travail temporaire récupérable');
    assert.equal((await store(page)).library.version, 99);
    await expand(page, 'Fichiers et récupération');
    const raw = await download(page, '[data-action=export-stored]', 'stockage-version-inconnue.json');
    assert.equal(JSON.parse(await fs.readFile(raw, 'utf8')).library.version, 99);
    await click(page, '[data-action=recover]'); await saved(page);
    assert.equal(await page.locator('#document-name').inputValue(), 'État récupérable');
    assert.equal((await store(page)).library.version, 1);
  } finally { await browser.close(); }
});

test('une récupération obsolète conserve le stockage concurrent et le travail en mémoire', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser);
    await page.locator('#document-name').fill('État commun'); await saved(page);
    const second = await context.newPage(); await second.goto(portable); await second.waitForFunction(() => window.MailBuilder?.ready);
    await enterEditor(second);
    await page.locator('#document-name').fill('Nouvelle sauvegarde concurrente'); await saved(page);
    await second.locator('#document-name').fill('Travail local à conserver'); await second.locator('#error').filter({hasText: 'Une autre fenêtre'}).waitFor();
    const before = await store(page), memory = await state(second);
    await expand(second, 'Fichiers et récupération'); await click(second, '[data-action=recover]');
    await second.waitForFunction(() => document.querySelector('#save-state').textContent.includes('Récupération impossible') || document.querySelector('#notice').textContent.includes('État précédent relu'));
    assert.deepEqual(await store(page), before); assert.deepEqual(await state(second), memory);
    await second.locator('#error').filter({hasText: 'Une autre fenêtre'}).waitFor();
    assert(!(await second.locator('#notice').textContent()).includes('État précédent relu'));
  } finally { await browser.close(); }
});

test('un fichier en cours de lecture et un champ invalide empêchent une exportation périmée', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await page.evaluate(() => {
      const read = FileReader.prototype.readAsDataURL;
      FileReader.prototype.readAsDataURL = function(...args) { setTimeout(() => read.apply(this, args), 1500); };
    });
    await page.locator('[data-image-field]').first().setInputFiles(path.join(root, 'app/assets/icon-192.png'));
    await click(page, '[data-action=export-mail]'); await page.locator('#error').filter({hasText: 'Attendez la fin'}).waitFor();
    await page.locator('#notice').filter({hasText: 'Image locale incorporée'}).waitFor(); await saved(page);
    await page.locator('#article-source').fill('javascript:alert(1)');
    const before = await store(page); await click(page, '[data-action=export-mail]'); await page.locator('#error').filter({hasText: 'Protocole interdit'}).waitFor();
    assert.equal(await page.locator('#article-source').getAttribute('aria-invalid'), 'true'); assert.deepEqual(await store(page), before);
    await page.locator('#article-source').fill('https://exemple.invalid/source'); await saved(page);
    assert((await state(page)).documents[0].blocks[0].source.includes('https://'));
  } finally { await browser.close(); }
});

test('fermer pendant la sauvegarde avertit ; le départ annulé conserve le travail puis la réouverture retrouve l’écriture terminée', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser);
    await page.locator('#document-name').fill('Avant fermeture'); await saved(page);
    const before = await store(page);
    await page.evaluate(() => {
      const storage = MailBuilder.Storage, gate = new Promise(resolve => { window.releaseSave = resolve; });
      MailBuilder.Storage = {...storage, save: async (...args) => { window.saveWaiting = true; await gate; return storage.save(...args); }};
    });
    await page.locator('#document-name').click(); await page.locator('#document-name').fill('Travail conservé après avertissement');
    await page.waitForFunction(() => window.saveWaiting); assert.deepEqual(await store(page), before);
    const event = page.waitForEvent('dialog'); await page.close({runBeforeUnload: true}); const dialog = await event;
    assert.equal(dialog.type(), 'beforeunload'); await dialog.dismiss();
    assert(!page.isClosed()); assert.equal(await page.locator('#document-name').inputValue(), 'Travail conservé après avertissement');
    assert.deepEqual(await store(page), before);
    await page.evaluate(() => window.releaseSave()); await saved(page);
    assert.equal((await store(page)).library.documents[0].name, 'Travail conservé après avertissement');
    let unexpectedDialogs = 0; page.on('dialog', async next => { unexpectedDialogs++; await next.accept(); });
    await Promise.all([page.waitForEvent('close'), page.close({runBeforeUnload: true})]); assert.equal(unexpectedDialogs, 0);
    const reopened = await context.newPage(); await reopened.goto(portable); await reopened.waitForFunction(() => window.MailBuilder?.ready);
    assert.equal(await reopened.locator('#document-name').inputValue(), 'Travail conservé après avertissement');
    await fs.mkdir(evidence, {recursive: true}); await fs.writeFile(path.join(evidence, 'fermeture-sauvegarde.json'), JSON.stringify({warningObserved: true, departureCancelled: true, memoryPreserved: true, storeUnchangedBeforeCommit: true, noWarningAfterCommit: true, reopenedWithSavedDocument: true, scope: 'Chromium ; écriture retardée avant la transaction réelle'}, null, 2));
  } finally { await browser.close(); }
});
