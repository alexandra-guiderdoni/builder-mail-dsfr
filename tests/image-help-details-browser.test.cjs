const test = require('node:test');
const {chromium, open, click, assert} = require('./browser-support.cjs');

test('aide image : refus durs visibles avant le choix, détail complet nommé et consultable au clavier', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    assert.equal(await page.locator('[data-image-details=f0]').count(), 1);
    const short = page.locator('#image-help-f0');
    for (const pattern of [/PNG, JPEG, GIF ou WebP/, /10 Mio/, /8192 pixels par côté/, /16\s777\s216 pixels au total/, /GIF animé/, /1 Mio/]) assert.match(await short.textContent(), pattern);
    assert.equal(await short.isVisible(), true);
    assert.equal(await page.locator('#field-f0').getAttribute('aria-describedby'), 'image-help-f0');
    const detail = page.locator('[data-image-details=f0]');
    assert.equal(await detail.locator('p').isVisible(), false);
    assert.match(await detail.locator('summary').textContent(), /logo.*clair/i);
    await click(page, '[data-image-details=f0] > summary');
    assert.equal(await detail.locator('p').isVisible(), true);
    const expected = await page.evaluate(() => MailBuilder.Images.help(MailBuilder.doc().blocks[0].component, 'f0'));
    assert.equal(await detail.locator('p').textContent(), expected);
    assert.ok((await short.textContent()).length < expected.length);
    assert.match(await detail.locator('p').textContent(), /152 pixels de large/);
    const focus = await page.evaluate(() => document.activeElement.id);
    await page.evaluate(() => MailBuilder.UI.fields());
    assert.equal(await detail.getAttribute('open'), '');
    assert.equal(await page.evaluate(() => document.activeElement.id), focus);
    await click(page, '[data-image-details=f0] > summary');
    assert.equal(await detail.locator('p').isVisible(), false);
    await click(page, '[data-image-details=f2] > summary');
    assert.match(await page.locator('[data-image-details=f2] > summary').textContent(), /logo.*sombre/i);
    assert.match(await page.locator('[data-image-details=f2] > p').textContent(), /152 pixels de large/);
  } finally { await browser.close(); }
});

test('aide image : changer de bloc ne transporte pas le détail du précédent et le libellé facultatif demeure', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    assert.equal(await page.locator('[data-image-details=f0]').count(), 1);
    await click(page, '[data-image-details=f0] > summary');
    await page.evaluate(() => MailBuilder.State.change(lib => { const doc = lib.documents.find(d => d.id === lib.activeId); const article = MailBuilder.Model.createBlock('mail-31'); doc.blocks.push(article); MailBuilder.selected = article.id; }));
    assert.equal(await page.locator('[data-image-details=f0]').getAttribute('open'), null);
    assert.equal(await page.locator('label[for=field-f0]').textContent(), 'Image facultative');
    assert.match(await page.locator('[data-image-details=f0] > summary').textContent(), /Image facultative/);
    await click(page, '[data-image-details=f0] > summary');
    assert.match(await page.locator('[data-image-details=f0] > p').textContent(), /250 pixels de large/);
  } finally { await browser.close(); }
});
