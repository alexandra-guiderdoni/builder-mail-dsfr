const test = require('node:test');
const path = require('node:path');
const {root, portable, click, open, saved, state, store, chromium, assert} = require('./browser-support.cjs');
test('une ouverture bloquée puis réussie tardivement est fermée sans empoisonner la nouvelle connexion', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const context = await browser.newContext(), page = await context.newPage();
    await page.addInitScript(() => {
      const open = IDBFactory.prototype.open; let first = true;
      IDBFactory.prototype.open = function(...args) {
        if (!first) return open.apply(this, args); first = false; const factory = this, pending = {};
        window.deliverLate = () => new Promise((resolve, reject) => { const request = open.apply(factory, args); request.onerror = reject; request.onsuccess = () => { pending.result = request.result; pending.onsuccess(); try { request.result.transaction('library'); resolve(false); } catch (e) { resolve(e.name === 'InvalidStateError'); } }; });
        queueMicrotask(() => pending.onblocked()); return pending;
      };
    });
    await page.goto(portable); await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.equal(await page.evaluate(() => MailBuilder.Storage.load()), undefined);
    assert.equal(await page.evaluate(() => deliverLate()), true);
    assert.equal(await page.evaluate(() => MailBuilder.Storage.load()), undefined);
    assert.match(await page.locator('#error').innerText(), /autres fenêtres/);
  } finally { await browser.close(); }
});
test('une ouverture refusée est retentée et une connexion fermée n’est pas réutilisée', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const context = await browser.newContext(), page = await context.newPage();
    await page.addInitScript(() => {
      const open = IDBFactory.prototype.open; window.dbAttempts = 0;
      IDBFactory.prototype.open = function(...args) {
        dbAttempts++;
        if (dbAttempts === 1) { const request = {}; queueMicrotask(() => request.onerror?.()); return request; }
        const request = open.apply(this, args); request.addEventListener('success', () => { window.openedDatabase = request.result; }); return request;
      };
    });
    await page.goto(portable); await page.waitForFunction(() => window.MailBuilder?.ready);
    const result = await page.evaluate(async () => { try { await MailBuilder.Storage.load(); return 'relecture possible'; } catch (e) { return e.message; } });
    assert.equal(result, 'relecture possible'); assert.equal(await page.evaluate(() => dbAttempts), 2);
    const after = await page.evaluate(async () => {
      await new Promise((resolve, reject) => { const r = indexedDB.open('builder-mail-dsfr-library', 2); r.onsuccess = () => { r.result.close(); resolve(); }; r.onerror = reject; });
      try { await MailBuilder.Storage.load(); return 'succès inattendu'; } catch (e) { return e.message; }
    });
    assert.match(after, /ouverture/); assert(!after.includes('InvalidStateError'));
  } finally { await browser.close(); }
});
test('une sauvegarde lente retient seulement l’écriture en cours et la dernière révision', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    const libraryBytes = await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d'), image = context.createImageData(256, 256); let seed = 42;
      for (let i = 0; i < image.data.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; image.data[i] = i % 4 === 3 ? 255 : seed >>> 24; }
      context.putImageData(image, 0, 0); const data = canvas.toDataURL('image/png');
      await MailBuilder.State.change(lib => { for (let i = 0; i < 3; i++) { const block = MailBuilder.Model.createBlock(27); block.values.f0 = data; lib.documents[0].blocks.push(block); } });
      return new Blob([JSON.stringify(MailBuilder.library)]).size;
    });
    await page.locator('#document-name').fill('Avant la rafale'); await saved(page);
    await page.evaluate(() => {
      const storage = MailBuilder.Storage; window.writeAttempts = 0;
      const gate = new Promise(resolve => { window.releaseWrites = resolve; });
      MailBuilder.Storage = {...storage, save: async (...args) => { writeAttempts++; await gate; return storage.save(...args); }};
    });
    await page.locator('#document-name').fill('Première écriture'); await page.waitForFunction(() => writeAttempts === 1);
    const cdp = await page.context().newCDPSession(page); await cdp.send('HeapProfiler.collectGarbage');
    const heapBefore = await cdp.send('Runtime.getHeapUsage');
    const milliseconds = await page.evaluate(() => {
      const start = performance.now(), field = document.querySelector('#document-name');
      for (let i = 0; i < 80; i++) { field.value = 'Révision ' + i; field.dispatchEvent(new Event('input', {bubbles: true})); }
      return performance.now() - start;
    });
    await cdp.send('HeapProfiler.collectGarbage'); const heapBlocked = await cdp.send('Runtime.getHeapUsage');
    assert.equal((await store(page)).library.documents[0].name, 'Avant la rafale');
    await page.evaluate(() => releaseWrites()); await saved(page); await page.evaluate(() => MailBuilder.State.flush());
    assert.equal((await store(page)).library.documents[0].name, 'Révision 79');
    assert.equal((await state(page)).documents[0].name, 'Révision 79'); assert.equal(await page.evaluate(() => writeAttempts), 2);
    assert.equal((await page.evaluate(() => MailBuilder.Storage.load('previous'))).library.documents[0].name, 'Première écriture');
    console.log(JSON.stringify({scenario: '80 saisies, stockage retenu', libraryBytes, inputMilliseconds: milliseconds, committedWrites: 2, jsHeapBefore: heapBefore.usedSize, jsHeapBlocked: heapBlocked.usedSize, heapScope: 'tas JavaScript V8 après collecte ; mémoire physique du processus non mesurée'}));
  } finally { await browser.close(); }
});
test('un changement de composition refusé rétablit toujours le sélecteur', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await click(page, '#library-back'); await click(page, '[data-action=new-document]'); await saved(page);
    const before = await state(page), other = before.documents.find(d => d.id !== before.activeId).id;
    await page.evaluate(() => { MailBuilder.pendingInputs = 1; });
    await page.locator('#documents').selectOption(other);
    assert.equal(await page.locator('#documents').inputValue(), before.activeId);
    assert.equal((await state(page)).activeId, before.activeId); assert.equal((await store(page)).library.activeId, before.activeId);
    await page.evaluate(() => { MailBuilder.pendingInputs = 0; });
    await page.locator('#documents').selectOption(other); await saved(page);
    assert.equal((await state(page)).activeId, other); assert.equal(await page.locator('#documents').inputValue(), other);
    for (const outcome of ['success', 'error']) {
      const active = (await state(page)).activeId, target = (await state(page)).documents.find(d => d.id !== active).id;
      await page.evaluate(outcome => { const files = MailBuilder.Files; const gate = new Promise(resolve => { window.finishFile = resolve; }); MailBuilder.Files = {...files, image: async file => { await gate; MailBuilder.Files = files; if (outcome === 'error') throw new Error('Image refusée pour la recette'); return files.image(file); }}; }, outcome);
      await page.locator('[data-image-field]').first().setInputFiles(path.join(root, 'app/assets/icon-192.png')); await page.waitForFunction(() => MailBuilder.pendingInputs === 1);
      await page.locator('#documents').selectOption(target); assert.equal(await page.locator('#documents').inputValue(), active);
      await page.evaluate(() => finishFile()); await page.waitForFunction(() => MailBuilder.pendingInputs === 0);
      if (outcome === 'success') await saved(page); else await page.locator('#error').filter({hasText: 'Image refusée pour la recette'}).waitFor();
      assert.equal((await state(page)).activeId, active); assert.equal((await store(page)).library.activeId, active);
    }
    await page.locator('#document-name').fill(''); await page.locator('#documents').selectOption(before.activeId);
    assert.equal(await page.locator('#documents').inputValue(), other); assert.equal((await state(page)).activeId, other);
    await click(page, '[data-action=cancel-fields]');
    await page.evaluate(() => {
      const storage = MailBuilder.Storage, gate = new Promise(resolve => { window.finishRecovery = resolve; });
      MailBuilder.Storage = {...storage, load: async key => { if (key === 'previous') { window.recovering = true; await gate; } return storage.load(key); }};
      window.recovery = MailBuilder.State.recover();
    });
    await page.waitForFunction(() => window.recovering);
    await page.evaluate(value => { const select = document.querySelector('#documents'); select.value = value; select.dispatchEvent(new Event('change')); }, before.activeId);
    assert.equal(await page.locator('#documents').inputValue(), other);
    await page.evaluate(async () => { finishRecovery(); await recovery; });
    assert.equal(await page.locator('#documents').inputValue(), (await state(page)).activeId);
  } finally { await browser.close(); }
});
