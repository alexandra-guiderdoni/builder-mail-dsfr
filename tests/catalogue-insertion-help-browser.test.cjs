const test = require('node:test');
const {chromium, open, expand, click, assert} = require('./browser-support.cjs');

for (const width of [575, 576, 1280]) test(`catalogue ${width} px : choix natif, absence de résultat et aide avant insertion`, async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser, {viewport: {width, height: 1000}});
    await expand(page, 'Ajouter un composant');
    await page.locator('#catalogue-search').fill('clôture');
    assert.equal(await page.locator('#catalogue option').count(), 1);
    assert.equal(await page.locator('#catalogue').getAttribute('size'), width < 576 ? '1' : '2');
    assert.equal(await page.locator('#catalogue').inputValue(), width < 576 ? 'mail-51' : '', 'la sélection native reste inchangée');
    const help = page.locator('#catalogue-add-help');
    assert.equal(await page.locator('#catalogue-add').getAttribute('aria-describedby'), 'catalogue-add-help');
    assert.equal(await help.isVisible(), true);
    assert.match(await help.textContent(), width < 576 ? /Texte de clôture/ : /Choisissez un composant/);
    await page.locator('#catalogue').selectOption('mail-51');
    assert.match(await help.textContent(), /Texte de clôture/);
    await page.locator('#catalogue-search').fill('');
    assert.equal(await page.locator('#catalogue').inputValue(), 'mail-51');
    await page.locator('#catalogue-search').fill('bouton secondaire');
    assert.equal(await page.locator('#catalogue').inputValue(), width < 576 ? 'mail-41' : '');
    assert.doesNotMatch(await help.textContent(), /Texte de clôture/);
    await page.locator('#catalogue-search').fill('aucun-resultat-159');
    assert.match(await help.textContent(), /Aucun composant/);
    const before = await page.evaluate(() => MailBuilder.doc().blocks.length);
    await click(page, '#catalogue-add');
    assert.equal(await page.evaluate(() => MailBuilder.doc().blocks.length), before);
    assert.match(await page.locator('#error').textContent(), /Choisissez un composant/);
  } finally { await browser.close(); }
});

test('catalogue : la destination annoncée avant ajout correspond à l’ordre réel et suit le bloc actif', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await expand(page, 'Ajouter un composant');
    await page.locator('#catalogue-search').fill('clôture');
    await page.locator('#catalogue').selectOption('mail-51');
    const destination = await page.evaluate(() => MailBuilder.doc().blocks[2].id);
    await click(page, `#block-list [data-select="${destination}"]`);
    assert.match(await page.locator('#catalogue-add-help').textContent(), /après le bloc 3/);
    assert.match(await page.locator('#catalogue-add-help').textContent(), /Paragraphe/);
    const before = await page.evaluate(() => MailBuilder.doc().blocks.map(b => b.id));
    await click(page, '#catalogue-add');
    const result = await page.evaluate(() => ({ids: MailBuilder.doc().blocks.map(b => b.id), selected: MailBuilder.selected, component: MailBuilder.doc().blocks[3].component, focus: document.activeElement.id}));
    assert.equal(result.component, 'mail-51');
    assert.deepEqual(result.ids.filter(id => id !== result.selected), before);
    assert.equal(result.ids[3], result.selected);
    assert.match(result.focus, /^field-/);
    assert.match(await page.locator('#notice').textContent(), /ajouté en position 4 sur 7/);
    assert.match(await page.locator('#catalogue-add-help').textContent(), /après le bloc 4/);
    await page.setViewportSize({width: 575, height: 1000});
    await page.waitForFunction(() => document.getElementById('catalogue').size === 1);
    assert.equal(await page.locator('#catalogue').inputValue(), 'mail-51');
    assert.match(await page.locator('#catalogue-add-help').textContent(), /après le bloc 4/);
  } finally { await browser.close(); }
});

test('catalogue sans destination active : l’aide indique la fin et l’ajout y reste placé', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await expand(page, 'Ajouter un composant');
    await page.locator('#catalogue').selectOption('mail-51');
    await page.evaluate(() => { MailBuilder.selected = null; MailBuilder.UI.blockList(); });
    assert.match(await page.locator('#catalogue-add-help').textContent(), /en fin de composition/);
    const before = await page.evaluate(() => MailBuilder.doc().blocks.map(b => b.id));
    await click(page, '#catalogue-add');
    const after = await page.evaluate(() => MailBuilder.doc().blocks);
    assert.deepEqual(after.slice(0, -1).map(b => b.id), before);
    assert.equal(after.at(-1).component, 'mail-51');
  } finally { await browser.close(); }
});
