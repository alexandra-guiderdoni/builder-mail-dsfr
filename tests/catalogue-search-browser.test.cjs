const test = require('node:test');
const {open, expand, click, assert} = require('./browser-support.cjs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Moteur choisi par MAIL_BUILDER_ENGINE (chromium par défaut, webkit pour le contrôle croisé).
const engine = playwright[process.env.MAIL_BUILDER_ENGINE || 'chromium'];
const options = page => page.locator('#catalogue option').evaluateAll(nodes => nodes.map(n => n.value));
const search = async (page, text) => { await page.locator('#catalogue-search').fill(text); return options(page); };

async function session(run) {
  const browser = await engine.launch();
  try { const context = await open(browser); await expand(context.page, 'Ajouter un composant'); await run(context); }
  finally { await browser.close(); }
}

test('le catalogue regroupe ses 52 options par famille, sans préfixe répété', () => session(async ({page}) => {
  const groups = await page.locator('#catalogue optgroup').evaluateAll(nodes => nodes.map(g => ({label: g.label, options: g.querySelectorAll('option').length})));
  const families = await page.evaluate(() => [...new Set(MailBuilder.catalog.components.map(c => c.family))]);
  assert.deepEqual(groups.map(g => g.label), families);
  assert.equal(groups.reduce((n, g) => n + g.options, 0), 52);
  assert.equal(await page.locator('#catalogue > option').count(), 0);
  const texts = await page.locator('#catalogue option').evaluateAll(nodes => nodes.map(n => n.textContent));
  assert.deepEqual(texts.filter(t => t.includes(' — ')), []);
}));

test('la recherche ignore accents, casse, tirets et apostrophes, et reconnaît les mots des agents', () => session(async ({page}) => {
  const all = await options(page);
  const same = async (...queries) => { const results = []; for (const q of queries) results.push(await search(page, q));
    const [first, ...rest] = results; assert(first.length > 0, queries[0]); for (const r of rest) assert.deepEqual(r, first, queries.join(' / ')); return first; };
  const headers = await same('en-têtes', 'EN-TETES', 'entete', 'Entêtes');
  assert(headers.includes('mail-02') && headers.includes('mail-03'));
  await same('désabonnement', 'DESABONNEMENT', 'desabonnement');
  assert.deepEqual(await search(page, ''), all);
  for (const [word, id] of [['photo', 'mail-26'], ['Photos', 'mail-04'], ['préheader', 'mail-00'], ['footer', 'mail-47'], ['unsubscribe', 'mail-49'], ['coordonnées', 'mail-39']]) {
    assert((await search(page, word)).includes(id), `${word} -> ${id}`);
  }
  assert.deepEqual(await search(page, 'agenda'), []);
  assert.equal(await page.locator('#catalogue-count').textContent(), '0 composants sur 52');
  const narrowed = await search(page, 'bouton secondaire');
  assert.deepEqual(narrowed, ['mail-41']);
}));

test('un aperçu du composant choisi précède l’insertion et ne modifie pas la composition', () => session(async ({page}) => {
  const frame = page.locator('#catalogue-preview');
  assert.equal(await frame.isHidden(), true);
  const before = await page.evaluate(() => MailBuilder.doc().blocks.length);
  await page.locator('#catalogue').selectOption('mail-40');
  await frame.waitFor({state: 'visible'});
  assert.equal(await frame.getAttribute('title'), 'Aperçu du composant sélectionné');
  const first = await page.locator('#catalogue-preview').evaluate(e => e.srcdoc);
  assert(first.includes('<a '), 'le gabarit du bouton contient un lien');
  await page.locator('#catalogue').selectOption('mail-51');
  const second = await page.locator('#catalogue-preview').evaluate(e => e.srcdoc);
  assert.notEqual(second, first);
  assert.equal(await page.evaluate(() => MailBuilder.doc().blocks.length), before);
  await search(page, 'agenda');
  assert.equal(await frame.isHidden(), true);
  await click(page, '[data-action=add-block]');
  assert.equal(await page.evaluate(() => MailBuilder.doc().blocks.length), before);
}));

test('les liens des aperçus restent au clavier, avec un accès rapide qui les contourne', () => session(async ({page}) => {
  await page.locator('#catalogue').selectOption('mail-40');
  const skipCatalogue = page.locator('a[data-skip-to=catalogue-add]');
  assert.equal(await skipCatalogue.textContent(), 'Passer l’aperçu du composant');
  await skipCatalogue.focus();
  assert.equal(await skipCatalogue.isVisible(), true);
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'catalogue-add');

  const skipMail = page.locator('a[data-skip-to=files-summary]');
  // WebKit (réglage par défaut de Safari) ne tabule pas vers les liens : l’ordre Tab ne se contrôle que sous Chromium.
  if (engine === playwright.chromium) {
    await page.locator('[data-action=export-mail]').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Passer l’aperçu du courriel');
  } else await skipMail.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Fichiers et récupération');

  for (const selector of ['#preview', '#catalogue-preview']) {
    const links = await page.frameLocator(selector).locator('a[href]').evaluateAll(nodes => nodes.map(n => n.getAttribute('tabindex')));
    assert(links.length > 0, selector);
    assert.deepEqual(links.filter(v => v === '-1'), [], selector);
    assert.notEqual(await page.locator(selector).getAttribute('tabindex'), '-1');
  }
}));
