/* Page SNUM : l’aperçu prend la hauteur du courriel converti, sans défilement vertical interne, et suit une reconversion. */
const test = require('node:test'), path = require('node:path'), fs = require('node:fs');
const {root, click, assert} = require('./browser-support.cjs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const pageUrl = 'file://' + path.join(root, 'app/distribution/snum.html');
const packet = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/snum-46/entree-synthetique.json'), 'utf8'));
const height = page => page.locator('#preview').evaluate(frame => frame.getBoundingClientRect().height);
// Document de l’aperçu chargé, complet, et entièrement visible dans le cadre.
const fits = (frame, articles) => frame.waitForFunction(count => document.readyState === 'complete'
  && document.querySelectorAll('h3 a[href]').length === count
  && document.documentElement.scrollHeight <= innerHeight, articles, {timeout: 10000});
for (const name of ['chromium', 'webkit']) {
  test(`SNUM (${name}) : aperçu à la hauteur du courriel, sans défilement interne`, async () => {
    const browser = await playwright[name].launch();
    try {
      const page = await (await browser.newContext({viewport: {width: 1400, height: 900}})).newPage();
      await page.goto(pageUrl); await page.waitForFunction(() => MailBuilder.ready);
      await page.locator('#snum-input').fill(JSON.stringify(packet)); await click(page, '#convert');
      const frame = await (await page.locator('#preview').elementHandle()).contentFrame();
      await fits(frame, packet.articles.length);
      const full = await height(page);
      assert(full > 1500, `hauteur de l’aperçu complet : ${full}`);
      const short = {...packet, articles: [packet.articles[1]]};
      await page.locator('#snum-input').fill(JSON.stringify(short)); await click(page, '#convert');
      await fits(frame, 1);
      await page.waitForFunction(previous => document.getElementById('preview').getBoundingClientRect().height < previous - 300, full);
    } finally { await browser.close(); }
  });
}
