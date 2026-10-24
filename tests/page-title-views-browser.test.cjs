const test = require('node:test');
const {chromium: chromiumEngine, webkit} = require('playwright');
const {portable, click, saved, assert} = require('./browser-support.cjs');
const BRAND = 'Atelier de courriels DSFR', HOME = `Mes newsletters – ${BRAND}`;
const settled = async (page, expected, message) => { await page.waitForFunction(v => document.title === v, expected, {timeout: 3000}).catch(() => {}); assert.equal(await page.title(), expected, message); };
const editor = name => `${name} – Éditeur – ${BRAND}`;

for (const [engineName, engine] of [['Chromium', chromiumEngine], ['WebKit', webkit]]) {
  test(`${engineName} : le titre de page change avec la vue et nomme la composition ouverte`, async () => {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({viewport: {width: 1200, height: 900}}), page = await context.newPage();
      await page.goto(portable); await page.waitForFunction(() => window.MailBuilder?.ready);
      await settled(page, HOME, 'accueil au chargement');
      await click(page, '[data-action=resume-document]');
      const first = await page.locator('#document-name').inputValue();
      await settled(page, editor(first), 'éditeur : nom de la composition ouverte');
      await page.locator('#document-name').fill('Édition & <A>'); await saved(page);
      await settled(page, editor('Édition & <A>'), 'renommage dans l’éditeur');
      await click(page, '[data-action=library-home]');
      await settled(page, HOME, 'retour à l’accueil');
      await page.locator('#starter').selectOption('lettre'); await click(page, '[data-action=new-document]');
      await page.locator('#document-name').fill('Édition B'); await saved(page);
      await settled(page, editor('Édition B'), 'nouvelle composition');
      await click(page, '[data-action=library-home]');
      const row = await page.locator('[data-document]').filter({hasText: 'Édition & <A>'}).getAttribute('data-document');
      await click(page, `[data-document="${row}"] [data-library-action=open]`);
      await settled(page, editor('Édition & <A>'), 'ouverture depuis l’accueil');
      await click(page, '[data-action=library-home]');
      await click(page, `[data-document="${row}"] [data-library-action=rename]`);
      await settled(page, HOME, 'un dialogue ne change pas le titre de page');
      await page.locator('#library-name').fill('Renommée'); await click(page, '#library-confirm'); await saved(page);
      await settled(page, HOME, 'renommage depuis l’accueil : titre inchangé');
      await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
      await settled(page, HOME, 'rechargement : accueil');
    } finally { await browser.close(); }
  });
}
