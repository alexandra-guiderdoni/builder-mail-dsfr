const test = require('node:test');
const path = require('node:path');
const {root, chromium, click, assert} = require('./browser-support.cjs');
const portable = 'file://' + path.join(root, 'prototype/distribution/portable.html');
test('le démarrage différé conserve une saisie valide ou invalide ; une erreur de relecture reste explicite', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    for (const invalid of [false, true]) {
      const context = await browser.newContext(), page = await context.newPage(); await page.goto(portable);
      await page.locator('#subject').fill('Brouillon enregistré'); await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.');
      await page.addInitScript(() => {
        let storage; const gate = new Promise(resolve => { window.finishStartup = resolve; });
        Object.defineProperty(window, 'PrototypeDraft', {get: () => storage, set: original => { storage = {...original, load: async () => { const value = await original.load(); await gate; return value; }}; }});
      });
      await page.reload(); await page.waitForFunction(() => !!document.querySelector('#block-2-url'));
      const before = await page.locator('#subject').inputValue();
      if (invalid) await page.locator('#block-2-url').fill('https://'); else await page.locator('#subject').fill('Saisie pendant le démarrage');
      await page.evaluate(() => finishStartup());
      if (invalid) { assert.equal(await page.locator('#subject').inputValue(), before); assert.equal(await page.locator('#block-2-url').inputValue(), 'https://'); assert.match(await page.locator('#error').innerText(), /Bloc 3/); }
      else { await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.'); assert.equal(await page.locator('#subject').inputValue(), 'Saisie pendant le démarrage'); }
      if (invalid) await page.locator('#block-2-url').fill('https://exemple.invalid/');
      await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.');
      const stored = await page.evaluate(() => PrototypeDraft.load());
      await page.evaluate(() => { window.actualLoad = PrototypeDraft.load; window.PrototypeDraft = {...PrototypeDraft, load: async () => { throw new Error('Lecture de recette refusée'); }}; });
      await click(page, 'section[aria-labelledby=identity-title] [data-action=restore]'); await page.locator('#error').filter({hasText: 'Lecture de recette refusée'}).waitFor();
      assert.deepEqual(await page.evaluate(() => actualLoad()), stored); assert.equal(await page.locator('#subject').inputValue(), stored.doc.subject);
      await context.close();
    }
  } finally { await browser.close(); }
});
test('deux sauvegardes simultanées utilisent un CAS réel et une image retirée ne sauvegarde plus rien', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const context = await browser.newContext(), page = await context.newPage(); await page.goto(portable);
    await page.locator('#subject').fill('État commun'); await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.');
    const results = await page.evaluate(async () => {
      const before = await PrototypeDraft.load(), a = {...before.doc, subject: 'A'}, b = {...before.doc, subject: 'B'};
      const results = await Promise.allSettled([PrototypeDraft.save(a, before.token), PrototypeDraft.save(b, before.token)]);
      return {states: results.map(r => r.status), stored: (await PrototypeDraft.load()).doc.subject};
    });
    assert.deepEqual(results.states.sort(), ['fulfilled', 'rejected']); assert(['A', 'B'].includes(results.stored));
    await page.reload(); await page.waitForFunction(() => document.querySelector('#subject').value === 'A' || document.querySelector('#subject').value === 'B');
    await page.evaluate(() => { const decode = Image.prototype.decode; Image.prototype.decode = async function() { await new Promise(resolve => { window.finishImage = resolve; }); return decode.call(this); }; });
    await page.locator('[data-image]').setInputFiles(path.join(root, 'app/assets/icon-192.png')); await page.waitForFunction(() => !!window.finishImage);
    await click(page, '[data-id=image-1] [data-remove]'); await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.');
    const stored = await page.evaluate(() => PrototypeDraft.load()); await page.evaluate(() => finishImage());
    await page.locator('#status').filter({hasText: 'Image obsolète ignorée'}).waitFor();
    assert.deepEqual(await page.evaluate(() => PrototypeDraft.load()), stored); assert(!stored.doc.blocks.some(b => b.id === 'image-1'));
  } finally { await browser.close(); }
});
