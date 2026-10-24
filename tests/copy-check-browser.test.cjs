const test = require('node:test'), path = require('node:path');
const {root, open, click, fs, assert} = require('./browser-support.cjs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// #36 : blocage de la composition vide, avertissements confirmables une fois par sortie, accès direct au bloc concerné.
const capture = page => page.addInitScript(() => {
  window.__clipboard = [];
  const Original = window.ClipboardItem;
  if (Original) window.ClipboardItem = class extends Original { constructor(items, options) { super(items, options); window.__clipboard.push(items); } };
});
const copies = page => page.evaluate(() => window.__clipboard.length);
const permissions = engine => engine === 'chromium' ? {permissions: ['clipboard-read', 'clipboard-write']} : {};
const dialogOpen = page => page.locator('#check-dialog').evaluate(e => e.open);
const watchDialog = page => page.evaluate(() => {
  window.__dialogOpened = 0;
  new MutationObserver(() => { if (document.getElementById('check-dialog').open) window.__dialogOpened++; }).observe(document.getElementById('check-dialog'), {attributes: true});
});
async function setBlocks(page, build) {
  await page.evaluate(build => MailBuilder.State.change(lib => {
    const doc = lib.documents.find(d => d.id === lib.activeId), M = MailBuilder.Model;
    const index = id => MailBuilder.catalog.components.findIndex(c => c.id === id);
    const footer = (values, extra = {}) => Object.assign(M.createBlock(index('mail-50')), extra, {values: {...M.createBlock(index('mail-50')).values, ...values}});
    const noise = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), d = x.createImageData(w, h); let s = 7; for (let i = 0; i < d.data.length; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; d.data[i] = i % 4 === 3 ? 255 : s & 255; } x.putImageData(d, 0, 0); return c.toDataURL('image/png'); };
    const healthy = () => footer({f0: 'Pour vos abonnements,', f1: 'https://www.exemple-info.gouv.fr/abonnements', f2: 'Gérer mon abonnement'});
    const sets = {
      empty: () => [],
      healthy: () => [healthy()],
      starter: () => M.create('Départ').blocks,
      rules: () => {
        const article = M.createBlock(index('mail-31'));
        Object.assign(article.values, {f0: noise(300, 300), f1: 'Motif synthétique', f2: 'Avant-titre rédigé', f3: 'https://www.exemple-info.gouv.fr/article', f4: 'Titre rédigé', f5: 'Détail rédigé', f6: 'Fin rédigée'});
        return [
          footer({f0: 'Pour vos abonnements,', f1: 'https://exemple.invalid/abonnement', f2: 'Gérer mon abonnement'}),
          footer({f1: 'https://www.exemple-info.gouv.fr/abonnements'}),
          footer({f0: 'Pour payer,', f1: 'https://collecte-exemple.fr/', f2: 'exemple-admin.gouv.fr'}),
          footer({f0: 'Pour lire,', f1: 'https://www.exemple-info.gouv.fr/‮fdp.exe', f2: 'Lire la pièce'}),
          footer({f0: 'Pour se connecter,', f1: 'https://ехемрӏе.com/', f2: 'Se connecter'}),
          article,
        ];
      },
    };
    doc.blocks = sets[build]();
  }), build);
}
const expectedWarnings = page => page.evaluate(() => MailBuilder.Checks.warnings(MailBuilder.doc(), MailBuilder.Render.weight(MailBuilder.Render.clipboardHtml(MailBuilder.doc()))));

for (const engine of ['chromium', 'webkit']) {
  test(`${engine} : composition vide bloquée ; composition saine copiée et téléchargée sans étape`, async () => {
    const browser = await playwright[engine].launch();
    try {
      const {page, observations} = await open(browser, {offline: true, ...permissions(engine)}, capture);
      let downloads = 0; page.on('download', () => downloads++);
      await setBlocks(page, 'empty');
      await click(page, '[data-action=copy]');
      await page.locator('#error').filter({hasText: 'Ajoutez au moins un composant'}).waitFor({timeout: 5000});
      await click(page, '[data-action=export-mail]');
      await page.locator('#error').filter({hasText: 'Ajoutez au moins un composant'}).waitFor();
      await page.waitForTimeout(300);
      assert.equal(await copies(page), 0); assert.equal(downloads, 0);
      await setBlocks(page, 'healthy');
      await watchDialog(page);
      assert.deepEqual(await expectedWarnings(page), []);
      await page.evaluate(() => { document.getElementById('notice').textContent = ''; });
      await click(page, '[data-action=copy]');
      await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
      assert.equal(await copies(page), 1);
      const event = page.waitForEvent('download'); await click(page, '[data-action=export-mail]'); await event;
      assert.equal(await page.evaluate(() => window.__dialogOpened), 0, 'aucune étape supplémentaire');
      assert.deepEqual(observations.errors, []);
      assert.ok(!observations.requests.some(url => /^https?:/.test(url)), 'aucun contrôle réseau');
    } finally { await browser.close(); }
  });

  test(`${engine} : avertissements confirmés une fois par copie ou téléchargement`, async () => {
    const browser = await playwright[engine].launch();
    try {
      const {page, observations} = await open(browser, {offline: true, ...permissions(engine)}, capture);
      let downloads = 0; page.on('download', () => downloads++);
      await setBlocks(page, 'starter');
      // Largeur étroite : la liste dépasse la hauteur de la fenêtre.
      await page.setViewportSize({width: 320, height: 700});
      await click(page, '[data-action=copy]');
      await page.locator('#check-dialog').waitFor({state: 'visible', timeout: 5000});
      const warnings = await expectedWarnings(page);
      assert.ok(warnings.some(w => w.rule === 'demo-domain') && warnings.some(w => w.rule === 'demo-text'));
      assert.equal(await page.locator('#check-dialog-title').textContent(), 'Vérifier avant de copier');
      assert.deepEqual(await page.locator('#check-list li p').allTextContents(), warnings.map(w => w.message));
      // Liste longue : le focus part du titre, en haut de la fenêtre, avant les points à lire et les boutons.
      assert.equal(await page.evaluate(() => document.activeElement.id), 'check-dialog-title');
      assert.equal(await page.locator('#check-dialog').evaluate(e => e.scrollTop), 0);
      assert.equal(await copies(page), 0, 'rien n’est copié avant confirmation');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.getElementById('check-dialog').open);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'copy');
      assert.equal(await copies(page), 0);
      await click(page, '[data-action=copy]'); await page.locator('#check-dialog').waitFor({state: 'visible'});
      await page.locator('#check-confirm').click();
      await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
      assert.equal(await copies(page), 1);
      // La confirmation vaut pour cette copie seulement.
      await click(page, '[data-action=copy]'); await page.locator('#check-dialog').waitFor({state: 'visible'});
      await page.locator('#check-cancel').click();
      await page.waitForFunction(() => !document.getElementById('check-dialog').open);
      assert.equal(await copies(page), 1);
      await click(page, '[data-action=export-mail]'); await page.locator('#check-dialog').waitFor({state: 'visible'});
      assert.equal(await page.locator('#check-dialog-title').textContent(), 'Vérifier avant de télécharger');
      await page.locator('#check-cancel').click(); await page.waitForTimeout(300);
      assert.equal(downloads, 0);
      await click(page, '[data-action=export-mail]'); await page.locator('#check-dialog').waitFor({state: 'visible'});
      const event = page.waitForEvent('download'); await page.locator('#check-confirm').click(); await event;
      assert.equal(downloads, 1);
      assert.deepEqual(observations.errors, []);
      assert.ok(!observations.requests.some(url => /^https?:/.test(url)));
    } finally { await browser.close(); }
  });

  test(`${engine} : chaque avertissement mène directement à son bloc`, async () => {
    const browser = await playwright[engine].launch();
    try {
      const {page} = await open(browser, {offline: true, ...permissions(engine)}, capture);
      await setBlocks(page, 'rules');
      await click(page, '[data-action=copy]');
      await page.locator('#check-dialog').waitFor({state: 'visible', timeout: 5000});
      await page.locator('#check-cancel').click();
      const blocks = await page.evaluate(() => MailBuilder.doc().blocks.map(b => b.id));
      const warnings = await expectedWarnings(page);
      assert.deepEqual(warnings.map(w => [w.rule, blocks.indexOf(w.block), w.field]), [
        ['demo-domain', 0, 'field-f1'], ['demo-text', 1, 'field-f0'], ['label-domain', 2, 'field-f2'], ['bidi', 3, 'field-f1'], ['mixed-script', 4, 'field-f1'], ['weight', 5, 'field-f0'],
      ]);
      for (const [i, warning] of warnings.entries()) {
        await click(page, '[data-action=copy]'); await page.locator('#check-dialog').waitFor({state: 'visible'});
        await page.locator('#check-list li').nth(i).locator('button').click();
        await page.waitForFunction(() => !document.getElementById('check-dialog').open);
        assert.equal(await page.locator(`[data-select="${warning.block}"]`).getAttribute('aria-pressed'), 'true', warning.rule);
        assert.equal(await page.evaluate(() => document.activeElement.id), warning.field, warning.rule);
      }
      assert.equal(await copies(page), 0);
    } finally { await browser.close(); }
  });
}
