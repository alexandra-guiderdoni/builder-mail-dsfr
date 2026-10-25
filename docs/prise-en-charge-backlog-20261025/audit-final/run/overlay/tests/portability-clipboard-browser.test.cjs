const test = require('node:test');
const {chromium, open, assert} = require('./browser-support.cjs');

test('le témoin texte se relit par read et readText ; une écriture refusée ne le remplace pas', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser, {permissions: ['clipboard-read', 'clipboard-write']});
    const observed = await page.evaluate(async () => {
      await navigator.clipboard.writeText('Témoin de non-diffusion');
      const [item] = await navigator.clipboard.read();
      const before = await (await item.getType('text/plain')).text();
      let rejected = false;
      try { await navigator.clipboard.write([null]); }
      catch { rejected = true; }
      return {before, rejected, after: await navigator.clipboard.readText()};
    });
    assert.deepEqual(observed, {before: 'Témoin de non-diffusion', rejected: true, after: 'Témoin de non-diffusion'});
  } finally { await browser.close(); }
});
