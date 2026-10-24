const test = require('node:test');
const {chromium, webkit} = require('playwright');
const {portable, click, assert} = require('./browser-support.cjs');

for (const [engineName, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const width of [320, 768]) {
    test(`${engineName} ${width} px : catalogue sans défilement horizontal, accès rapide à l’aperçu, pas de défilement interne`, async () => {
      const browser = await engine.launch();
      try {
        const page = await (await browser.newContext({viewport: {width, height: 700}})).newPage();
        await page.goto(portable); await page.waitForFunction(() => window.MailBuilder?.ready);
        await click(page, '[data-action=resume-document]'); await page.locator('#editor-page').waitFor({state: 'visible'});
        await page.locator('summary').filter({hasText: 'Ajouter un composant'}).click();
        const geometry = await page.evaluate(() => {
          const c = document.getElementById('catalogue'), d = document.documentElement;
          return {pageScrollW: d.scrollWidth, pageClientW: d.clientWidth, catScrollW: c.scrollWidth, catClientW: c.clientWidth, catScrollH: c.scrollHeight, catClientH: c.clientHeight, catRight: c.getBoundingClientRect().right};
        });
        assert(geometry.pageScrollW <= geometry.pageClientW, 'page : ' + JSON.stringify(geometry));
        assert(geometry.catScrollW <= geometry.catClientW, 'catalogue horizontal : ' + JSON.stringify(geometry));
        assert(geometry.catScrollH <= geometry.catClientH + 1 && geometry.catRight <= width, 'catalogue vertical : ' + JSON.stringify(geometry));
        // Accès rapide : un lien de la page, atteignable au clavier, mène à l’aperçu.
        const link = page.locator('a[href="#preview-title"]');
        assert.equal(await link.count(), 1, 'un accès rapide vers l’aperçu est attendu');
        assert(await link.isVisible());
        await page.evaluate(() => scrollTo(0, 0));
        await link.focus(); await link.press('Enter');
        await page.waitForFunction(() => document.getElementById('preview-title').getBoundingClientRect().top >= -1 && document.getElementById('preview-title').getBoundingClientRect().top < innerHeight);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'preview-title');
        // Ajouter un composant reste possible.
        const before = await page.locator('#block-list > li').count();
        await page.evaluate(() => scrollTo(0, 0));
        await page.locator('#catalogue').selectOption({index: 3});
        await click(page, '[data-action=add-block]');
        await page.waitForFunction(n => document.querySelectorAll('#block-list > li').length === n + 1, before);
      } finally { await browser.close(); }
    });
  }
}
