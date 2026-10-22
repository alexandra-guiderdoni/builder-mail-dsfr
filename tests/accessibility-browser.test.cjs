const test = require('node:test');
const {chromium, open, click, expand, assert} = require('./browser-support.cjs');

test('les sections ouvertes restent dans la fenêtre avec les espacements de texte augmentés', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser, {viewport: {width: 320, height: 1000}});
    for (const title of ['Mes modèles', 'Identités de service', 'Ajouter un composant', 'Fichiers et récupération', 'Importer du JSON']) await expand(page, title);
    await page.addStyleTag({content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});
    for (const width of [320, 640, 1280]) {
      await page.setViewportSize({width, height: 1000});
      const measured = await page.evaluate(() => ({viewport: innerWidth, scroll: document.documentElement.scrollWidth,
        outside: [...document.querySelectorAll('input,select,textarea,summary')].filter(e => {const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1);}).map(e => e.id)}));
      assert.equal(measured.scroll, width, JSON.stringify(measured)); assert.deepEqual(measured.outside, []);
    }
  } finally { await browser.close(); }
});

test('les erreurs de champs restent associées à chacun et disparaissent après correction ou annulation', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await page.locator('#article-source').fill('http://exemple.invalid/');
    await page.locator('#document-name').fill('');
    const described = selector => page.locator(selector).evaluate(e => ({invalid: e.getAttribute('aria-invalid'),
      text: (e.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ')}));
    assert.match((await described('#article-source')).text, /HTTPS/);
    assert.match((await described('#document-name')).text, /nom/i);
    await page.locator('#article-source').fill('https://exemple.invalid/');
    assert.equal((await described('#article-source')).invalid, null);
    assert.match((await described('#document-name')).text, /nom/i);
    await click(page, '[data-action=cancel-fields]');
    assert.equal(await page.locator('[data-field-error]').count(), 0);
    assert.equal((await described('#document-name')).invalid, null);
    await click(page, '[data-action=library-home]'); await click(page, '[data-library-action=rename]');
    await page.locator('#library-name').fill(''); await click(page, '#library-confirm');
    assert.match((await described('#library-name')).text, /Renseignez un nom/);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'library-name');
  } finally { await browser.close(); }
});
