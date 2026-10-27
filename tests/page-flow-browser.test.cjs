const test = require('node:test');
const {open, click, saved, expand, selectBlock, selectBlockEffective, chromium, assert} = require('./browser-support.cjs');

const longText = Array.from({length: 35}, (_, i) => `Ligne ${i + 1} : un contenu de recette qui reste entièrement lisible.`).join('\n');
async function importAll(page) {
  const packet = await page.evaluate(text => {
    const doc = MailBuilder.Model.create('Composition longue', MailBuilder.catalog.components.map(c => c.id));
    doc.blocks.find(b => b.component === 'mail-19').values.f0 = text;
    return JSON.stringify(doc);
  }, longText);
  await expand(page, 'Importer du JSON'); await page.locator('#json-input').fill(packet);
  await click(page, '[data-action=json-import]');
  await page.locator('#notice').filter({hasText: 'Composition ou bibliothèque JSON ajoutée.'}).waitFor(); await saved(page);
  return page.evaluate(() => MailBuilder.doc().blocks.map(b => ({id: b.id, component: b.component})));
}
const box = locator => locator.evaluate(e => ({client: e.clientHeight, scroll: e.scrollHeight, height: e.getBoundingClientRect().height, overflow: getComputedStyle(e).overflowY, maxHeight: getComputedStyle(e).maxHeight}));

test('un focus placé sans défilement ne satisfait pas l’attente du champ visible', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser), blocks = await importAll(page);
    await page.evaluate(() => {
      const focus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function (options) {
        return focus.call(this, this.closest('#block-editor') ? {...options, preventScroll: true} : options);
      };
    });
    await selectBlockEffective(page, blocks[0].id);
    const position = () => page.evaluate(() => {
      const field = document.querySelector('#block-editor textarea,#block-editor input');
      return {focused: document.activeElement === field, top: field.getBoundingClientRect().top, height: innerHeight};
    });
    const before = await position();
    assert(before.focused && (before.top < 0 || before.top >= before.height), JSON.stringify(before));
    await assert.rejects(selectBlockEffective(page, blocks[0].id, {focusInView: true}), {name: 'TimeoutError'});
    const after = await position();
    assert(after.focused && (after.top < 0 || after.top >= after.height), JSON.stringify(after));
  } finally { await browser.close(); }
});

test('la liste entière reste dans la page et le retour au bloc fonctionne depuis un champ invalide', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); const blocks = await importAll(page);
    const list = await box(page.locator('#block-list'));
    assert(list.client >= list.scroll - 1 && list.maxHeight === 'none', JSON.stringify(list));
    for (const block of [blocks[0], blocks.at(-1)]) {
      await selectBlockEffective(page, block.id, {focusInView: true});
      const active = await page.evaluate(() => ({id: document.activeElement.id, y: document.activeElement.getBoundingClientRect().top, h: innerHeight}));
      assert(active.id && active.y >= 0 && active.y < active.h, JSON.stringify(active));
      await page.locator('#article-source').fill('invalide');
      await page.locator('#block-list').evaluate(e => { e.closest('details').open = false; });
      await click(page, '[data-return-to-block]');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.select), block.id);
      assert(await page.locator('#block-list').evaluate(e => e.closest('details').open));
      await click(page, '[data-action=cancel-fields]');
    }
  } finally { await browser.close(); }
});

test('le catalogue natif affiche tous les résultats et conserve son choix après filtrage', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); await expand(page, 'Ajouter un composant');
    const select = page.locator('#catalogue'); let size = await box(select);
    assert(size.client >= size.scroll - 1 && await select.evaluate(e => e.size >= e.options.length), JSON.stringify(size));
    await select.focus(); await page.keyboard.press('End');
    const current = await select.inputValue();
    const option = await select.evaluate(e => { const r = e.selectedOptions[0].getBoundingClientRect(); return {y: r.top, bottom: r.bottom, viewport: innerHeight}; });
    assert(option.y >= 0 && option.bottom <= option.viewport, JSON.stringify(option));
    const family = await page.evaluate(id => MailBuilder.Model.component(id).family, current);
    await page.locator('#catalogue-search').fill(family);
    assert.equal(await select.inputValue(), current);
    assert(await select.evaluate(e => e.size >= Math.max(2, e.options.length)));
    await page.locator('#catalogue-search').fill('aucun-resultat-recette-zzzz');
    assert.equal(await select.locator('option').count(), 0); assert.equal(await select.evaluate(e => e.size), 2);
    await page.locator('#catalogue-search').fill(''); assert.equal(await select.locator('option').count(), 52);
  } finally { await browser.close(); }
});

test('les champs longs grandissent et rétrécissent sans perdre le focus ; le JSON reste compact', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser), blocks = await importAll(page);
    await selectBlock(page, blocks.find(b => b.component === 'mail-19').id);
    const input = page.locator('#field-f0');
    let measured = await box(input); assert(measured.client >= measured.scroll - 1 && measured.height > 500, JSON.stringify(measured));
    await input.fill('Court'); await saved(page); const small = await box(input); assert(small.height < measured.height);
    await input.fill(longText); await saved(page);
    await input.evaluate(e => e.setSelectionRange(2, 7));
    for (const width of [390, 1024, 1280]) {
      await page.setViewportSize({width, height: 900});
      await page.waitForFunction(() => { const e = document.querySelector('#field-f0'); return e.clientHeight >= e.scrollHeight - 1; });
      assert.deepEqual(await input.evaluate(e => [e === document.activeElement, e.selectionStart, e.selectionEnd]), [true, 2, 7]);
    }
    const label = await page.evaluate(() => { const b = MailBuilder.doc().blocks.find(b => MailBuilder.Model.component(b.component).links.length); return {id: b.id, key: MailBuilder.Model.component(b.component).links[0].label}; });
    await selectBlock(page, label.id); const link = page.locator('#field-' + label.key);
    await link.fill(' \n'.repeat(35));
    assert.equal(await link.getAttribute('aria-invalid'), 'true');
    measured = await box(link); assert(measured.client >= measured.scroll - 1 && measured.height > 500, JSON.stringify(measured));
    const json = await box(page.locator('#json-input'));
    assert(json.height < 300 && json.scroll > json.client && json.overflow !== 'hidden', JSON.stringify(json));
  } finally { await browser.close(); }
});

test('un champ recréé masqué retrouve sa hauteur lors de la réouverture à largeur identique', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser), blocks = await importAll(page);
    const id = blocks.find(b => b.component === 'mail-19').id;
    await selectBlock(page, id);
    await page.locator('#block-editor').evaluate(e => { e.hidden = true; });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(id => { MailBuilder.selected = id; MailBuilder.UI.fields(); }, id);
    assert.equal(await page.locator('#field-f0').evaluate(e => e.getClientRects().length), 0);
    await page.locator('#block-editor').evaluate(e => { e.hidden = false; });
    await page.waitForFunction(() => { const e = document.getElementById('field-f0'); return e.clientHeight >= e.scrollHeight - 1; });
    const measured = await box(page.locator('#field-f0'));
    assert(measured.height > 500, JSON.stringify(measured));
  } finally { await browser.close(); }
});
