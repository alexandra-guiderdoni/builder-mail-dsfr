const test = require('node:test');
const {open, click, saved, chromium, nativeAx, nativeAxNode, assert} = require('./browser-support.cjs');

test('le dernier retrait rend le focus nommé à Ajouter un composant, même si la section est fermée', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser);
    const summary = page.locator('summary').filter({hasText: 'Ajouter un composant'});
    await summary.evaluate(e => { e.parentElement.open = false; });
    while (await page.evaluate(() => MailBuilder.doc().blocks.length)) {
      await click(page, '[data-block-action=remove]'); await saved(page);
    }
    const focus = await page.evaluate(() => ({tag: document.activeElement.tagName, text: document.activeElement.textContent}));
    assert.equal(focus.tag, 'SUMMARY'); assert.equal(focus.text, 'Ajouter un composant');
    const active = await nativeAxNode(page, 'summary:focus');
    if (nativeAx) { assert(active && !active.ignored); assert.equal(active.name.value, 'Ajouter un composant'); assert.equal(active.properties.find(p => p.name === 'focused')?.value.value, true); }
    else assert.match(await page.locator('summary:focus').ariaSnapshot(), /Ajouter un composant/);
    await page.keyboard.press('Enter');
    assert(await summary.evaluate(e => e.parentElement.open));
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'catalogue-search');
  } finally { await browser.close(); }
});
