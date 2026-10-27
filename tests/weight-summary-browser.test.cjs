const test = require('node:test');
const {chromium, open, click, assert} = require('./browser-support.cjs');

test('poids : synthèse visible liée au bouton, détail complet au clavier et état conservé', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    assert.equal(await page.locator('[data-action=copy]').getAttribute('aria-describedby'), 'mail-weight-summary');
    const summary = page.locator('#mail-weight-summary'), detail = page.locator('#mail-weight');
    await page.waitForFunction(() => document.getElementById('mail-weight-summary').dataset.level === 'ok');
    assert.equal(await summary.isVisible(), true);
    assert.match(await summary.textContent(), /Kio.*images comprises/);
    assert.equal(await detail.isVisible(), false);
    await click(page, '#mail-weight-details > summary');
    assert.equal(await detail.isVisible(), true);
    assert.match(await detail.textContent(), /octets/);
    await page.locator('#subject').fill('Nouvel objet de recette');
    assert.equal(await page.locator('#mail-weight-details').getAttribute('open'), '');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'subject');
    await click(page, '#mail-weight-details > summary');
    assert.equal(await detail.isVisible(), false);
    assert.equal(await summary.isVisible(), true);
  } finally { await browser.close(); }
});

test('poids : une mutation invalide immédiatement les deux descriptions sans annoncer l’ancien nombre', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await page.waitForFunction(() => document.getElementById('mail-weight').dataset.level === 'ok');
    const state = await page.evaluate(() => {
      const before = document.getElementById('mail-weight').dataset.bytes;
      window.__weightChange = MailBuilder.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).subject = 'Un objet plus long, après mutation'; });
      return {before, elements: ['mail-weight', 'mail-weight-summary'].map(id => { const e = document.getElementById(id); return {level: e?.dataset.level, bytes: e?.dataset.bytes, text: e?.textContent}; })};
    });
    for (const element of state.elements) {
      assert.equal(element.level, 'pending');
      assert.equal(element.bytes, undefined);
      assert.match(element.text, /calcul en cours/);
      assert.doesNotMatch(element.text, /\d/);
    }
    await page.evaluate(() => window.__weightChange);
    await page.waitForFunction(() => document.getElementById('mail-weight-summary').dataset.level === 'ok');
    const actual = await page.evaluate(() => ({bytes: MailBuilder.Render.weight(MailBuilder.Render.clipboardHtml(MailBuilder.doc())).bytes, shown: ['mail-weight', 'mail-weight-summary'].map(id => document.getElementById(id).dataset.bytes)}));
    assert.deepEqual(actual.shown, [String(actual.bytes), String(actual.bytes)]);
  } finally { await browser.close(); }
});
