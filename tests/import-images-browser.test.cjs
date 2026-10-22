const test = require('node:test');
const path = require('node:path');
const {root, chromium, open, expand, click, state, store, assert} = require('./browser-support.cjs');
const truncated = 'data:image/png;base64,' + require('node:fs').readFileSync(path.join(root, 'app/assets/icon-192.png')).subarray(0, 40).toString('base64');
test('les formats valides traversent le JSON et le décodage natif des deux éditeurs', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser, {offline: true});
    const images = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 5; canvas.getContext('2d').fillRect(0, 0, 8, 5);
      return [canvas.toDataURL('image/png'), canvas.toDataURL('image/jpeg'), canvas.toDataURL('image/webp'), 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'];
    });
    const incoming = await page.evaluate(images => { const M = MailBuilder.Model, lib = M.initial(), doc = M.create('Quatre formats', [27, 27, 27, 27]); images.forEach((src, i) => { doc.blocks[i].values.f0 = src; }); lib.documents.push(doc); lib.activeId = doc.id; lib.templates.push(M.clone(doc, 'Modèle avec images')); lib.identities.push({id: M.id(), name: 'Identité avec image', blocks: [M.createBlock(2)]}); return lib; }, images);
    await expand(page, 'Importer du JSON'); await page.locator('#json-input').fill(JSON.stringify(incoming)); await click(page, '[data-action=json-import]');
    await page.waitForFunction(() => MailBuilder.doc().name === 'Quatre formats' && MailBuilder.pendingInputs === 0);
    await page.evaluate(() => MailBuilder.State.flush());
    const data = await page.evaluate(() => ({doc: MailBuilder.doc(), html: MailBuilder.Render.html(MailBuilder.doc()), library: MailBuilder.library}));
    for (const image of images) { assert(data.html.includes(image)); assert(JSON.stringify(data.doc).includes(image)); }
    assert.equal(data.library.templates.length, 1); assert.equal(data.library.identities.length, 1);
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready); assert.deepEqual(await state(page), data.library);
    const prototype = await context.newPage(); await prototype.goto('file://' + path.join(root, 'prototype/distribution/portable.html'));
    const old = await prototype.evaluate(images => { const doc = MailDocument.initial(); doc.subject = 'PNG et JPEG conservés'; doc.blocks = images.slice(0, 2).map((src, i) => ({...MailDocument.block('image', String(i)), image: src})); return doc; }, images);
    await prototype.locator('#project-input').setInputFiles({name: 'images.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(old))});
    await prototype.waitForFunction(() => document.querySelector('#subject').value === 'PNG et JPEG conservés');
    await prototype.waitForFunction(() => document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.');
    const restored = await prototype.evaluate(async () => (await PrototypeDraft.load()).doc); assert.deepEqual(restored, old);
    await prototype.reload(); await prototype.waitForFunction(() => document.querySelector('#subject').value === 'PNG et JPEG conservés');
  } finally { await browser.close(); }
});
test('une validation native devenue obsolète conserve les dernières saisies dans les deux éditeurs', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser);
    for (const family of ['app', 'prototype']) {
      const tab = family === 'app' ? page : await context.newPage();
      if (family === 'prototype') { await tab.goto('file://' + path.join(root, 'prototype/distribution/portable.html')); await tab.waitForFunction(() => document.querySelector('#save-state').textContent !== ''); }
      const incoming = await tab.evaluate(family => family === 'app' ? MailBuilder.Model.create('Import différé') : {...MailDocument.initial(), subject: 'Import différé'}, family);
      await tab.evaluate(() => { const decode = Image.prototype.decode, gate = new Promise(resolve => { window.finishDecode = resolve; }); Image.prototype.decode = async function() { window.decoding = true; await gate; return decode.call(this); }; });
      if (family === 'app') await expand(tab, 'Fichiers et récupération');
      await tab.locator('#project-input').setInputFiles({name: 'differe.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming))});
      await tab.waitForFunction(() => window.decoding); await tab.locator('#subject').fill('Saisie pendant le décodage'); await tab.evaluate(() => finishDecode());
      await tab.waitForFunction(() => document.querySelector('#error').textContent.includes('obsolète') || document.querySelector('#notice')?.textContent.includes('obsolète') || document.querySelector('#subject').value === 'Import différé');
      assert.equal(await tab.locator('#subject').inputValue(), 'Saisie pendant le décodage');
    }
  } finally { await browser.close(); }
});
test('application : image tronquée refusée avant mutation des compositions, modèles et identités', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    const before = await state(page), persisted = await store(page);
    await expand(page, 'Importer du JSON');
    for (const kind of ['document', 'template', 'identity']) {
      const incoming = await page.evaluate(({kind, truncated}) => {
        const M = MailBuilder.Model, doc = M.create('Import à refuser', [27]); doc.blocks[0].values.f0 = truncated;
        if (kind === 'document') return doc;
        const lib = M.initial();
        if (kind === 'template') lib.templates.push(doc);
        else { const block = M.createBlock(2); block.values[M.component(block.component).fields.find(f => f.type === 'image').key] = truncated; lib.identities.push({id: M.id(), name: 'Identité illisible', blocks: [block]}); }
        return lib;
      }, {kind, truncated});
      await page.locator('#json-input').fill(JSON.stringify(incoming)); await click(page, '[data-action=json-import]');
      await page.waitForFunction(() => !document.querySelector('#error').hidden || MailBuilder.library.documents.length > 1);
      assert.deepEqual(await state(page), before, kind); assert.deepEqual(await store(page), persisted, kind);
      assert.match(await page.locator('#error').innerText(), /image/i);
    }
  } finally { await browser.close(); }
});

test('application : une saisie plus récente rend l’import différé obsolète', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    if (process.env.MAIL_BUILDER_BASELINE_HTML) {
      await page.goto('file://' + process.env.MAIL_BUILDER_BASELINE_HTML); await page.waitForFunction(() => window.MailBuilder?.ready);
      await click(page, '[data-action=resume-document]');
    }
    await page.locator('#document-name').fill('Travail en cours');
    const before = await state(page), incoming = await page.evaluate(() => MailBuilder.Model.create('Fichier différé'));
    await expand(page, 'Fichiers et récupération');
    await page.evaluate(() => { const read = File.prototype.text; window.finishFile = null; File.prototype.text = function() { return new Promise(resolve => { window.finishFile = async () => resolve(await read.call(this)); }); }; });
    await page.locator('#project-input').setInputFiles({name: 'differe.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming))});
    await page.waitForFunction(() => typeof finishFile === 'function'); await page.locator('#document-name').fill('Saisie après lancement');
    await page.evaluate(() => finishFile());
    await page.waitForFunction(() => MailBuilder.pendingInputs === 0);
    await page.waitForFunction(() => document.querySelector('#notice').textContent.includes('obsolète') || document.querySelector('#error').textContent.includes('obsolète') || MailBuilder.library.documents.length > 1);
    assert.equal((await state(page)).activeId, before.activeId);
    assert.equal(await page.locator('#document-name').inputValue(), 'Saisie après lancement');
    assert.equal((await state(page)).documents.length, before.documents.length);
  } finally { await browser.close(); }
});
