const test = require('node:test');
const {root, open, expand, click, saved, confirmChecks, fs, assert} = require('./browser-support.cjs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// #41 : le pré-en-tête n'occupe aucune place ni ne s'affiche, sous Chromium et WebKit, sur l'export, l'aperçu et la copie.
const secret = 'Pré-en-tête de recette à ne pas afficher';
const measure = secret => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let found = 0, rendered = 0;
  while (walker.nextNode()) if (walker.currentNode.data.includes(secret)) {
    found++;
    const range = document.createRange(); range.selectNodeContents(walker.currentNode);
    rendered += [...range.getClientRects()].filter(r => r.width && r.height).length;
  }
  return {found, rendered, visibleText: document.body.innerText.includes(secret), height: document.documentElement.scrollHeight};
};

for (const engine of ['chromium', 'webkit']) test(`le pré-en-tête est masqué et sans emprise sous ${engine}`, async () => {
  const browser = await playwright[engine].launch();
  try {
    const loader = await (await browser.newContext()).newPage();
    await loader.goto('file://' + root + '/app/distribution/portable.html'); await loader.waitForFunction(() => window.MailBuilder?.ready);
    const docs = await loader.evaluate(secret => {
      const M = MailBuilder.Model, R = MailBuilder.Render, make = indices => { const d = M.create('Recette', indices); d.blocks.filter(b => b.component === 'mail-00').forEach(b => { b.values.f0 = secret; }); return d; };
      const paths = d => ({export: R.html(d), preview: R.html(d, true), copie: R.clipboardHtml(d)});
      return {with: paths(make([0, 5, 19])), without: paths(make([5, 19])), late: paths(make([5, 19, 0]))};
    }, secret);
    for (const scheme of ['light', 'dark']) {
      const context = await browser.newContext({colorScheme: scheme, viewport: {width: 700, height: 900}}), page = await context.newPage();
      for (const path of ['export', 'preview', 'copie']) for (const variant of ['with', 'late']) {
        for (const stripped of path === 'copie' ? [false, true] : [false]) {
          await page.setContent(docs[variant][path]);
          if (stripped) await page.locator('style,link').evaluateAll(nodes => nodes.forEach(e => e.remove()));
          const result = await page.evaluate(measure, secret), label = `${engine} ${scheme} ${path} ${variant}${stripped ? ' sans styles de tête' : ''}`;
          assert.equal(result.found, 1, label + ' : texte présent une fois');
          assert.equal(result.rendered, 0, label + ' : texte non rendu');
          assert.equal(result.visibleText, false, label + ' : absent du texte visible');
          await page.setContent(docs.without[path]);
          if (stripped) await page.locator('style,link').evaluateAll(nodes => nodes.forEach(e => e.remove()));
          assert.equal(result.height, (await page.evaluate(measure, secret)).height, label + ' : aucune hauteur réservée');
        }
      }
      await context.close();
    }
  } finally { await browser.close(); }
});

test('plusieurs pré-en-têtes : avertissement visible dans l’éditeur, un seul texte copié', async () => {
  const {chromium} = playwright;
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser, {offline: true, permissions: ['clipboard-read', 'clipboard-write']});
    const packet = await page.evaluate(() => { const d = MailBuilder.Model.create('Plusieurs pré-en-têtes', [0, 5, 0]); d.blocks[0].values.f0 = 'Premier pré-en-tête'; d.blocks[2].values.f0 = 'Second pré-en-tête'; return d; });
    await expand(page, 'Fichiers et récupération');
    await page.locator('#project-input').setInputFiles({name: 'preentetes.courriel.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(packet))});
    await page.locator('#notice').filter({hasText: 'Import ajouté à la bibliothèque'}).waitFor(); await saved(page);
    await page.locator('#composition-summary').filter({hasText: 'seul le premier est utilisé'}).waitFor();
    await click(page, '[data-action=copy]'); await confirmChecks(page); await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
    assert.match(await page.locator('#notice').textContent(), /seul le premier est utilisé/);
    const copied = await page.evaluate(async () => { const [item] = await navigator.clipboard.read({unsanitized: ['text/html']}); return {html: await (await item.getType('text/html')).text(), plain: await (await item.getType('text/plain')).text()}; });
    assert(copied.html.includes('Premier pré-en-tête') && !copied.html.includes('Second pré-en-tête'));
    assert(copied.html.includes('mso-hide:all') && copied.plain.includes('Premier pré-en-tête') && !copied.plain.includes('Second pré-en-tête'));
  } finally { await browser.close(); }
});
