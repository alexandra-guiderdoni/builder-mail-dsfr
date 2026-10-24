const test = require('node:test'), path = require('node:path');
const {root, click, assert} = require('./browser-support.cjs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const pageUrl = 'file://' + path.join(root, 'app/distribution/snum.html');
const valid = () => require('./fixtures/snum.cjs')();
const cases = [
  ['paquet sans champs requis', () => ({texte: 'collé par erreur'}), /pas un paquet de Collecte complet/, /schema_version/],
  ['article incomplet', () => { const p = valid(); delete p.articles[1].url; return p; }, /article 2/i, /champs manquants \(url\)/],
  ['date incohérente', () => { const p = valid(); p.edition_date_long = '15 octobre 2026'; return p; }, /date/i, /incohérentes/],
];
for (const name of ['chromium', 'webkit']) {
  test(`SNUM (${name}) : l’erreur est liée au champ, annoncée et sans jargon`, async () => {
    const browser = await playwright[name].launch();
    try {
      const page = await (await browser.newContext()).newPage();
      await page.goto(pageUrl); await page.waitForFunction(() => MailBuilder.ready);
      for (const [label, make, plain, technical] of cases) {
        await page.locator('#snum-input').fill(JSON.stringify(make())); await click(page, '#convert');
        const error = page.locator('#error'); await error.waitFor({state: 'visible'});
        assert.equal(await error.getAttribute('role'), 'alert', label);
        const input = page.locator('#snum-input');
        assert.equal(await input.getAttribute('aria-invalid'), 'true', label);
        assert.match(await input.getAttribute('aria-describedby'), /(^|\s)error(\s|$)/, label);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'snum-input', label);
        const visible = await page.locator('#error-text').innerText();
        assert.match(visible, plain, label);
        assert.doesNotMatch(visible, /schema_version|champs manquants|[a-z]+_[a-z]+|\bwatch\b/, label);
        assert.equal(await page.locator('#error-detail').evaluate(e => e.open), false, label);
        assert.match(await page.locator('#error-detail-text').textContent(), technical, label);
        await input.fill(JSON.stringify(make()) + ' ');
        assert.equal(await input.getAttribute('aria-invalid'), null, label);
        assert.equal(await input.getAttribute('aria-describedby'), null, label);
        assert.equal(await error.isHidden(), true, label);
      }
      await page.locator('#snum-input').fill(JSON.stringify(valid())); await click(page, '#convert');
      await page.waitForFunction(() => !document.getElementById('preview').hidden);
      assert.equal(await page.locator('#snum-input').getAttribute('aria-invalid'), null);
      assert.equal(await page.locator('#error').isHidden(), true);
    } finally { await browser.close(); }
  });
}
