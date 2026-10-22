const test = require('node:test');
const path = require('node:path');
const {root, open, expand, click, saved, state, store, chromium, assert} = require('./browser-support.cjs');
test('les nouvelles images trop volumineuses ou trop larges sont refusées avant remplacement', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser);
    const fileError = await page.evaluate(async () => { try { await MailImages.read({type: 'image/png', size: 10 * 1024 * 1024 + 1}, ['image/png']); return ''; } catch (e) { return e.message; } });
    assert.match(fileError, /10 Mio/);
    const dataError = await page.evaluate(async () => { try { await MailImages.decode('data:image/png;base64,' + 'A'.repeat(14 * 1024 * 1024), 'Logo de recette'); return ''; } catch (e) { return e.message; } });
    assert.match(dataError, /Logo de recette.*10 Mio/);
    const large = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 8193; canvas.height = 1; return canvas.toDataURL('image/png'); });
    await page.locator('#document-name').fill('Contenu à préserver'); await saved(page); const before = await state(page), persisted = await store(page);
    const incoming = await page.evaluate(image => { const doc = MailBuilder.Model.create('Trop large', [27]); doc.blocks[0].values.f0 = image; return doc; }, large);
    await expand(page, 'Importer du JSON'); await page.locator('#json-input').fill(JSON.stringify(incoming)); await click(page, '[data-action=json-import]');
    await page.waitForFunction(() => MailBuilder.pendingInputs === 0); assert.match(await page.locator('#error').innerText(), /Trop large.*8192/);
    assert.deepEqual(await state(page), before); assert.deepEqual(await store(page), persisted);
    const prototype = await context.newPage(); await prototype.goto('file://' + path.join(root, 'prototype/distribution/portable.html'));
    await prototype.waitForFunction(() => document.querySelector('#save-state').textContent !== '');
    const old = await prototype.evaluate(logo => ({...MailDocument.initial(), logo, subject: 'Ne pas importer'}), large);
    await prototype.locator('#project-input').setInputFiles({name: 'large.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(old))});
    await prototype.waitForFunction(() => document.querySelector('#error').textContent !== ''); assert.match(await prototype.locator('#error').innerText(), /Logo.*8192/);
    assert.notEqual(await prototype.locator('#subject').inputValue(), 'Ne pas importer');
  } finally { await browser.close(); }
});
