const test = require('node:test');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const zlib = require('node:zlib');
const {open, enterEditor, saved, store, chromium, assert} = require('./browser-support.cjs');

// PNG RVB de bruit pseudo-aléatoire : incompressible, reproductible, sans métadonnée ni contenu réel.
const crcTable = Array.from({length: 256}, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
const crc32 = bytes => { let crc = 0xffffffff; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; };
function noisePng(side, seed) {
  const row = side * 3 + 1, raw = Buffer.alloc(row * side); let state = seed >>> 0 || 1;
  for (let y = 0; y < side; y++) for (let x = 1; x < row; x++) { state ^= state << 13; state >>>= 0; state ^= state >>> 17; state ^= state << 5; state >>>= 0; raw[y * row + x] = state & 255; }
  const chunk = (tag, data) => { const head = Buffer.alloc(4), body = Buffer.concat([Buffer.from(tag), data]), crc = Buffer.alloc(4); head.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(body)); return Buffer.concat([head, body, crc]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(side, 0); header.writeUInt32BE(side, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw, {level: 1})), chunk('IEND', Buffer.alloc(0))]);
}
const dataUri = buffer => 'data:image/png;base64,' + buffer.toString('base64');
const percentile = (values, p) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.ceil(p / 100 * sorted.length) - 1)]; };
const summary = values => values.length ? `p50 ${percentile(values, 50).toFixed(1)} ms, p95 ${percentile(values, 95).toFixed(1)} ms, max ${Math.max(...values).toFixed(1)} ms (${values.length} mesures)` : 'aucune mesure';

// La bibliothèque est importée par l’interface puis relue au rechargement : c’est une bibliothèque existante.
async function typeIntoExistingLibrary(t, page, library, blockIndex, warmup = 10, count = 100) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'saisie-images-')), file = path.join(directory, 'bibliotheque.courriels.json');
  try {
    fs.writeFileSync(file, JSON.stringify(library));
    await page.locator('#project-input').setInputFiles(file);
    await page.waitForFunction(() => document.getElementById('notice').textContent.includes('Import ajouté') || !document.getElementById('error').hidden, null, {timeout: 120000});
    assert.equal(await page.locator('#error').isHidden(), true, await page.locator('#error').innerText());
    await saved(page);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
  await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready, null, {timeout: 120000}); await enterEditor(page);
  assert.equal(await page.evaluate(() => MailBuilder.doc().name), library.documents.find(d => d.id === library.activeId).name);
  await page.locator('#block-list [data-select]').nth(blockIndex).click();
  const field = page.locator('#block-editor textarea[data-field]').first(); await field.focus(); await page.keyboard.press('End');
  await page.evaluate(() => {
    const probe = window.typingProbe = {samples: [], renders: [], shown: []}, frame = document.getElementById('preview'); let current;
    // Traitement de saisie : de l’entrée dans la répartition de « input » à sa sortie, écouteurs et microtâches compris.
    addEventListener('keydown', event => { current = {down: event.timeStamp}; }, true);
    addEventListener('input', () => { if (current) current.start = performance.now(); }, true);
    addEventListener('input', event => { if (current?.start !== undefined) { current.end = performance.now(); current.length = event.target.value.length; probe.samples.push(current); } current = undefined; });
    // Mise à jour visible de l’aperçu : rendu demandé, puis document chargé et image suivante peinte.
    new MutationObserver(() => {
      const block = MailBuilder.doc().blocks.find(b => b.id === MailBuilder.selected);
      probe.renders.push({src: frame.src, at: performance.now(), length: block.values.f0.length});
    }).observe(frame, {attributes: true, attributeFilter: ['src']});
    frame.addEventListener('load', () => { const src = frame.src; requestAnimationFrame(() => probe.shown.push({src, at: performance.now()})); });
  });
  const press = async total => {
    for (let i = 0; i < total; i++) {
      const before = await page.evaluate(() => typingProbe.samples.length);
      await page.keyboard.type('abcdefghijklmnopqrstuvwxyz'[i % 26]);
      await page.waitForFunction(n => typingProbe.samples.length > n, before, {timeout: 120000});
    }
  };
  await press(warmup); await page.evaluate(() => { typingProbe.samples.length = 0; typingProbe.renders.length = 0; typingProbe.shown.length = 0; });
  await press(count);
  const typed = await field.inputValue();
  await page.waitForFunction(length => typingProbe.shown.some(s => typingProbe.renders.some(r => r.src === s.src && r.length >= length)), typed.length, {timeout: 120000});
  const probe = await page.evaluate(() => typingProbe);
  const processing = probe.samples.map(s => s.end - s.start), latency = probe.samples.map(s => s.end - s.down);
  const visible = probe.samples.map(s => {
    const render = probe.renders.find(r => r.at >= s.start && r.length >= s.length), shown = render && probe.shown.find(v => v.src === render.src && v.at >= render.at);
    return shown ? shown.at - s.down : NaN;
  }).filter(Number.isFinite);
  t.diagnostic(`traitement de saisie : ${summary(processing)}`);
  t.diagnostic(`frappe jusqu’au traitement terminé, attente comprise : ${summary(latency)}`);
  const finalShown = probe.shown.find(v => probe.renders.some(r => r.src === v.src && r.length >= typed.length));
  t.diagnostic(`frappe jusqu’à l’aperçu visible : ${summary(visible)} ; ${probe.renders.length} rendus d’aperçu pour ${probe.samples.length} frappes`);
  t.diagnostic(`dernière frappe jusqu’à l’aperçu final visible : ${(finalShown.at - probe.samples.at(-1).down).toFixed(1)} ms`);
  assert.equal(probe.samples.length, count);
  await page.frameLocator('#preview').locator('body', {hasText: typed.slice(-20)}).waitFor();
  await saved(page);
  const record = await store(page);
  assert.equal(record.library.documents.find(d => d.id === record.library.activeId).blocks[blockIndex].values.f0, typed);
  return {processing, latency, visible};
}

test('la saisie reste fluide avec trois PNG distincts de 8,27 Mio déjà présents', {timeout: 600000}, async t => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    t.diagnostic(`navigateur : ${browser.browserType().name()} ${browser.version()}, ${os.cpus()[0].model}, ${os.platform()} ${os.release()}`);
    const images = [1, 2, 3].map(seed => noisePng(1700, seed));
    assert.deepEqual(images.map(b => (b.length / 1048576).toFixed(2)), ['8.27', '8.27', '8.27']);
    assert.equal(new Set(images.map(b => b.toString('base64'))).size, 3);
    const library = await page.evaluate(() => { const M = MailBuilder.Model, lib = M.initial(), doc = M.create('Trois images lourdes', [27, 27, 27, 19]); lib.documents = [doc]; lib.activeId = doc.id; return lib; });
    images.forEach((image, i) => { library.documents[0].blocks[i].values.f0 = dataUri(image); });
    const {processing} = await typeIntoExistingLibrary(t, page, library, 3);
    assert(percentile(processing, 95) < 50, `95e percentile du traitement de saisie : ${percentile(processing, 95).toFixed(1)} ms`);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});

test('la saisie reste fluide dans une bibliothèque de dix compositions illustrées', {timeout: 600000}, async t => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    const library = await page.evaluate(() => {
      const M = MailBuilder.Model, lib = M.initial();
      lib.documents = Array.from({length: 10}, (_, i) => M.create(`Composition illustrée ${i + 1}`, [2, 5, 27, 19, 27, 47]));
      lib.activeId = lib.documents[9].id; return lib;
    });
    // Deux images distinctes d’environ 1 Mio par composition, comme le constat SG-13.
    library.documents.forEach((doc, i) => { doc.blocks[2].values.f0 = dataUri(noisePng(600, 100 + 2 * i)); doc.blocks[4].values.f0 = dataUri(noisePng(600, 101 + 2 * i)); });
    const {processing} = await typeIntoExistingLibrary(t, page, library, 3);
    assert(percentile(processing, 95) < 50, `95e percentile du traitement de saisie : ${percentile(processing, 95).toFixed(1)} ms`);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});

test('après la saisie, l’import, la restauration et le changement d’image contrôlent toujours les images', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    const good = await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const context = canvas.getContext('2d'), pixels = context.createImageData(64, 64); let seed = 7;
      for (let i = 0; i < pixels.data.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; pixels.data[i] = i % 4 === 3 ? 255 : seed >>> 24; }
      context.putImageData(pixels, 0, 0); const data = canvas.toDataURL('image/png');
      await MailBuilder.State.change(lib => { const block = MailBuilder.Model.createBlock(27); block.values.f0 = data; lib.documents.find(d => d.id === lib.activeId).blocks.push(block); });
      return data;
    });
    // L’image est acceptée et la saisie la revalide : une variante altérée doit encore être contrôlée.
    await page.locator('#document-name').pressSequentially(' saisi'); await saved(page);
    const bytes = Buffer.from(good.slice(good.indexOf(',') + 1), 'base64'); bytes[1] = 0x41;
    const forged = 'data:image/png;base64,' + bytes.toString('base64'), lying = good.replace('image/png', 'image/jpeg');
    const before = await page.evaluate(() => JSON.stringify(MailBuilder.library)), persisted = await store(page);
    for (const bad of [forged, lying]) {
      const incoming = await page.evaluate(bad => { const doc = MailBuilder.Model.create('Image altérée', [27]); doc.blocks[0].values.f0 = bad; return doc; }, bad);
      await page.evaluate(() => MailBuilder.error(''));
      await page.locator('#project-input').setInputFiles({name: 'altere.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming))});
      await page.locator('#error').filter({hasText: /image/i}).waitFor();
      assert.equal(await page.evaluate(() => JSON.stringify(MailBuilder.library)), before); assert.deepEqual(await store(page), persisted);
    }
    // Restauration de l’état précédent puis relecture au démarrage, avec l’image altérée dans le stockage.
    const corrupt = key => page.evaluate(async ([key, forged]) => {
      const db = await new Promise((resolve, reject) => { const request = indexedDB.open('builder-mail-dsfr-library', 1); request.onsuccess = () => resolve(request.result); request.onerror = reject; });
      const run = (mode, action) => new Promise((resolve, reject) => { const tx = db.transaction('library', mode), request = action(tx.objectStore('library')); tx.oncomplete = () => resolve(request.result); tx.onerror = tx.onabort = reject; });
      const record = await run('readonly', store => store.get('current'));
      for (const doc of record.library.documents) for (const block of doc.blocks) if (block.component === 'mail-27') block.values.f0 = forged;
      await run('readwrite', store => store.put(record, key)); db.close();
    }, [key, forged]);
    await corrupt('previous'); await page.evaluate(() => MailBuilder.error(''));
    await page.locator('[data-action=recover]').evaluate(button => button.click());
    await page.locator('#save-state').filter({hasText: 'Récupération impossible'}).waitFor();
    assert.match(await page.locator('#error').innerText(), /image/i);
    assert.equal(await page.evaluate(() => JSON.stringify(MailBuilder.library)), before);
    await corrupt('current'); await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.equal(await page.locator('#save-state').innerText(), 'Bibliothèque non restaurée.'); assert.match(await page.locator('#error').innerText(), /image/i);
    // Changement d’image : un fichier altéré est refusé, le fichier valide est incorporé.
    const fresh = await open(browser);
    await fresh.page.evaluate(() => MailBuilder.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).blocks.push(MailBuilder.Model.createBlock(27)); }));
    await fresh.page.locator('#block-list [data-select]').last().click();
    await fresh.page.locator('[data-image-field]').setInputFiles({name: 'altere.png', mimeType: 'image/png', buffer: bytes});
    await fresh.page.locator('#error').filter({hasText: /image/i}).waitFor();
    await fresh.page.evaluate(() => MailBuilder.error(''));
    await fresh.page.locator('[data-image-field]').setInputFiles({name: 'valide.png', mimeType: 'image/png', buffer: Buffer.from(good.slice(good.indexOf(',') + 1), 'base64')});
    await fresh.page.locator('#notice').filter({hasText: 'Image locale incorporée'}).waitFor();
    // Depuis #33, l’import peut recompresser l’image : on vérifie une image de données contrôlée, pas son encodage.
    const stored = await fresh.page.evaluate(() => { const value = MailBuilder.doc().blocks.at(-1).values.f0; MailBuilder.Model.image(value); return value; });
    assert.match(stored, /^data:image\/(png|jpeg);base64,/); assert.notEqual(stored, forged);
    // Mêmes octets annoncés en JPEG : le décodage natif réussit, le contrôle du modèle doit refuser la chaîne.
    await fresh.page.evaluate(() => MailBuilder.notice(''));
    await fresh.page.locator('[data-image-field]').setInputFiles({name: 'annonce.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(good.slice(good.indexOf(',') + 1), 'base64')});
    await fresh.page.locator('#error').filter({hasText: 'ne correspond pas au format annoncé'}).waitFor();
    assert.equal(await fresh.page.evaluate(() => MailBuilder.doc().blocks.at(-1).values.f0), stored);
    assert.deepEqual(observations.errors, []); assert.deepEqual(fresh.observations.errors, []);
  } finally { await browser.close(); }
});

test('après une frappe, le résumé de la composition suit aussitôt la saisie', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    const summary = await page.evaluate(() => {
      const input = document.getElementById('document-name'); input.value = 'Résumé immédiat'; input.dispatchEvent(new Event('input', {bubbles: true}));
      return document.getElementById('composition-summary').textContent;
    });
    assert.equal(summary, `${await page.evaluate(() => MailBuilder.doc().blocks.length)} blocs dans « Résumé immédiat »`);
    await saved(page);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});

test('un rafraîchissement complet remplace l’aperçu différé d’une frappe', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    await page.evaluate(async () => {
      const frame = document.getElementById('preview'); let count = 0;
      const observer = new MutationObserver(records => { count += records.length; }); observer.observe(frame, {attributes: true, attributeFilter: ['src']});
      window.finishPreviewCount = () => { observer.disconnect(); return count; };
      const input = document.getElementById('subject'); input.value += ' puis bloc déplacé'; input.dispatchEvent(new Event('input', {bubbles: true}));
      await MailBuilder.State.change(() => {});
    });
    // La frappe peut précéder le premier chargement de l’iframe. Garder l’observateur jusqu’au
    // document final réellement chargé, sans pré-attendre l’aperçu initial ni minuterie de test.
    const title = await page.locator('#subject').inputValue();
    const frame = await (await page.locator('#preview').elementHandle()).contentFrame();
    await frame.waitForFunction(expected => document.readyState === 'complete' && document.title === expected, title);
    const url = await page.locator('#preview').getAttribute('src');
    await frame.waitForFunction(expected => location.href === expected.url && document.readyState === 'complete' && document.title === expected.title, {url, title});
    assert.equal(await page.evaluate(() => window.finishPreviewCount()), 1);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});
