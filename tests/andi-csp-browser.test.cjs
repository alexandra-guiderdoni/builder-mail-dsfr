const test = require('node:test');
const {chromium, assert, portable} = require('./browser-support.cjs');

// ANDI s'injecte par un favori : la CSP de la page doit laisser passer ses ressources, et seulement elles.
// Le réseau est simulé : seule compte la décision de la CSP (violation ou non), pas le contenu servi.
test('ANDI : ses scripts et styles passent la CSP du builder, tout autre script externe reste bloqué', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const page = await browser.newPage();
    await page.route(/^https:/, route => route.fulfill({status: 200, contentType: route.request().url().endsWith('.css') ? 'text/css' : 'text/javascript', body: ''}));
    await page.goto(portable); await page.waitForFunction(() => window.MailBuilder?.ready);
    const sources = {andi: 'https://www.ssa.gov/accessibility/andi/andi.js', module: 'https://www.ssa.gov/accessibility/andi/fandi.js',
      jquery: 'https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js', css: 'https://www.ssa.gov/accessibility/andi/andi.css',
      autreJquery: 'https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js', autreChemin: 'https://www.ssa.gov/autre/script.js', tiers: 'https://example.org/script.js'};
    const blocked = await page.evaluate(async sources => {
      const found = []; document.addEventListener('securitypolicyviolation', event => found.push(event.blockedURI));
      for (const [name, src] of Object.entries(sources)) {
        const element = document.createElement(name === 'css' ? 'link' : 'script');
        if (name === 'css') { element.rel = 'stylesheet'; element.href = src; } else element.src = src;
        document.head.append(element);
      }
      await new Promise(resolve => setTimeout(resolve, 800));
      return found;
    }, sources);
    assert.deepEqual(Object.keys(sources).filter(name => blocked.includes(sources[name])), ['autreJquery', 'autreChemin', 'tiers']);
  } finally { await browser.close(); }
});
