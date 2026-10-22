const test = require('node:test');
const {open, chromium, assert} = require('./browser-support.cjs');
test('le harnais détecte réellement une erreur et une requête HTTP dès le démarrage', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {observations} = await open(browser, {bypassCSP: true}, async page => {
      await page.route('https://startup.invalid/**', route => route.fulfill({body: 'fixture', headers: {'Access-Control-Allow-Origin': '*'}}));
      await page.addInitScript(() => { fetch('https://startup.invalid/probe'); queueMicrotask(() => { throw new Error('Défaut injecté au démarrage'); }); });
    });
    assert(observations.errors.includes('Défaut injecté au démarrage'));
    assert(observations.requests.includes('https://startup.invalid/probe'));
  } finally { await browser.close(); }
});
