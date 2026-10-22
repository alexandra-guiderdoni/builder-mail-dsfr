const test = require('node:test');
const path = require('node:path');
const {open, enterEditor, click, saved, expand, download, selectBlock, state, chromium, fs, evidence, assert} = require('./browser-support.cjs');

test('intitulé source : saisie, aperçu, presse-papiers, fichier, rechargement et transfert hors connexion', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser, {offline: true, permissions: ['clipboard-read', 'clipboard-write']});
    const id = await page.evaluate(() => MailBuilder.doc().blocks.find(b => b.component === 'mail-19').id);
    await selectBlock(page, id);
    const url = 'https://exemple.invalid/dossier', label = 'Lire « État & numérique » <dossier>';
    await page.locator('#article-source').fill(url); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'article-source-label');
    await page.locator('#article-source-label').fill(label); await saved(page);
    await page.locator('#preview').scrollIntoViewIfNeeded();
    const link = page.frameLocator('#preview').locator(`a[href="${url}"]`);
    await link.waitFor({state: 'visible'}); assert.equal(await link.textContent(), label);
    await click(page, '[data-action=copy]');
    await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
    const copied = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return {html: await (await item.getType('text/html')).text(), plain: await (await item.getType('text/plain')).text()};
    });
    assert(copied.html.includes('Lire « État &amp; numérique » &lt;dossier&gt;'));
    assert(copied.plain.includes(label + '\n' + url));
    const mail = await download(page, '[data-action=export-mail]', 'intitule-courriel.html');
    assert((await fs.readFile(mail, 'utf8')).includes('Lire « État &amp; numérique » &lt;dossier&gt;</a>'));
    await page.locator('#article-source').fill(''); await saved(page);
    assert.equal(await page.locator('#article-source-label').inputValue(), label);
    await page.waitForFunction(() => !MailBuilder.doc().blocks.find(b => b.component === 'mail-19').source);
    await page.locator('#article-source').fill(url); await saved(page);
    await page.reload(); await page.waitForFunction(() => MailBuilder.ready); await enterEditor(page); await selectBlock(page, id);
    assert.equal(await page.locator('#article-source-label').inputValue(), label);
    await page.locator('#preview').scrollIntoViewIfNeeded();
    await page.frameLocator('#preview').locator(`a[href="${url}"]`).waitFor({state: 'visible'});
    await expand(page, 'Fichiers et récupération');
    const file = await download(page, '[data-action=export-document]', 'intitule-composition.json');
    const project = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.equal(project.blocks.find(b => b.id === id).sourceLabel, label);
    const fresh = await open(browser, {offline: true}); await expand(fresh.page, 'Fichiers et récupération');
    await fresh.page.locator('#project-input').setInputFiles(file); await saved(fresh.page);
    const restored = await state(fresh.page), block = restored.documents.find(d => d.id === restored.activeId).blocks.find(b => b.source === url);
    assert.equal(block.sourceLabel, label); await selectBlock(fresh.page, block.id);
    assert.equal(await fresh.page.locator('#article-source-label').inputValue(), label);
    assert.deepEqual(observations.errors, []); assert(!observations.requests.some(u => /^https?:/.test(u)));
  } finally { await browser.close(); }
});

test('ressources DSFR locales : Marianne, conteneurs communs, grille et repli à cinq largeurs', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser, {offline: true}), checks = [];
    for (const width of [320, 768, 992, 1248, 1440]) {
      await page.setViewportSize({width, height: 1000});
      const value = await page.evaluate(() => {
        const box = e => { const r = e.getBoundingClientRect(); return {x: r.x, width: r.width, top: r.top}; };
        return {viewport: innerWidth, scroll: document.documentElement.scrollWidth,
          containers: [...document.querySelectorAll('.app-header>.fr-container,main.fr-container,.app-footer>.fr-container')].map(box),
          columns: [...document.querySelectorAll('.composition-panel,.preview-panel')].map(box),
          gutter: getComputedStyle(document.querySelector('.composition-panel')).paddingLeft,
          panelPadding: getComputedStyle(document.querySelector('.composition-panel>.app-panel')).paddingLeft,
          font: getComputedStyle(document.body).fontFamily, fonts: [...document.fonts].map(f => ({family: f.family, weight: f.weight, status: f.status}))};
      });
      assert.equal(value.scroll, width); assert(value.font.startsWith('Marianne'));
      assert(value.fonts.filter(f => f.family === 'Marianne' && f.status === 'loaded').length === 3);
      for (const container of value.containers) { assert.equal(container.width, Math.min(width, 1248)); assert.equal(container.x, Math.max(0, (width - 1248) / 2)); }
      assert.equal(value.gutter, width < 992 ? '8px' : '12px'); assert.equal(value.panelPadding, width < 576 ? '16px' : '24px');
      const [editor, preview] = value.columns;
      if (width >= 992) { assert(Math.abs(editor.width / preview.width - 5 / 7) < .001); assert.equal(editor.top, preview.top); }
      else { assert.equal(editor.width, preview.width); assert(preview.top > editor.top); }
      await page.frameLocator('#preview').locator('img').first().waitFor({state: 'visible'});
      await click(page, '[data-action=library-home]');
      const card = await page.locator('#newsletter-list>li').first().evaluate(e => ({width: e.getBoundingClientRect().width, row: e.parentElement.getBoundingClientRect().width}));
      assert(Math.abs(card.width / card.row - (width < 768 ? 1 : .5)) < .001);
      await enterEditor(page); checks.push(value);
    }
    await page.screenshot({path: path.join(evidence, 'editeur-dsfr-1440.png'), fullPage: true});
    await page.setViewportSize({width: 320, height: 1000});
    const summary = page.locator('summary').filter({hasText: 'Mes modèles'});
    await summary.focus(); await page.keyboard.press('Enter'); assert(await summary.evaluate(e => e.parentElement.open));
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'template-name');
    await page.screenshot({path: path.join(evidence, 'editeur-dsfr-320.png'), fullPage: true});
    assert.deepEqual(observations.errors, []); assert(!observations.requests.some(u => /^https?:/.test(u)));
    await fs.writeFile(path.join(evidence, 'editeur-dsfr.json'), JSON.stringify({checks, portableOffline: true, keyboardSummary: true, errors: observations.errors}, null, 2));
  } finally { await browser.close(); }
});
