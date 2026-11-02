'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const {loadBuilder} = require('../scripts/builder-document.cjs');
const {fixture} = require('./catalogue-fixture.cjs');
const {throughChecks} = require('./browser-checks.cjs');
const {root} = require('./builder-root.cjs');
// Preuves conservées dans NEWSLETTER_EVIDENCE si défini, sinon dans un dossier temporaire (CI du builder, #197).
const evidence = process.env.NEWSLETTER_EVIDENCE || require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(), 'newsletter-evidence-'));
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || path.join(root, 'node_modules/playwright'));
const A = loadBuilder(root);
const click = async (page, selector) => { await page.locator(selector).focus(); await page.locator(selector).press('Enter'); };

async function open(browser, mode = 'capture') {
  const context = await browser.newContext({offline: true, viewport: {width: 1440, height: 1000}});
  const page = await context.newPage();
  await page.addInitScript(mode => {
    window.__copyPackets = [];
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: mode === 'missing' ? undefined : {
      write: async items => {
        if (mode === 'denied') throw new Error('Refus de copie de recette');
        for (const item of items) {
          const packet = {};
          for (const type of item.types) packet[type] = await (await item.getType(type)).text();
          window.__copyPackets.push(packet);
        }
      }
    }});
  }, mode);
  await page.goto(pathToFileURL(path.join(root, 'app/distribution/portable.html')).href);
  await page.waitForFunction(() => window.MailBuilder?.ready);
  await page.locator('summary').filter({hasText: 'Sauvegarde et import'}).click();
  const doc = fixture(A);
  await page.locator('#project-input').setInputFiles({name: 'copie-de-recette.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc))});
  await page.waitForFunction(name => MailBuilder.doc().name === name && document.querySelector('#save-state').textContent.includes('sauvegardée'), doc.name);
  return {context, page};
}

// Le moteur de préparation et le bouton sont natifs ; seule l’API Clipboard est capturée.
test('copie enrichie : contenus conservés et collage simulé étroit sans toucher au presse-papiers système', async () => {
  await fs.mkdir(evidence, {recursive: true});
  const browser = await chromium.launch({headless: true});
  try {
    const {context, page} = await open(browser), errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message)); page.on('request', request => requests.push(request.url()));
    const before = await page.evaluate(() => JSON.stringify(MailBuilder.library));
    const doc = await page.evaluate(() => MailBuilder.doc());
    await throughChecks(page, 'copy', () => click(page, '[data-action=copy]'));
    await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
    const packets = await page.evaluate(() => window.__copyPackets);
    assert.equal(packets.length, 1);
    const packet = packets[0], native = A.Render.html(doc);
    assert.deepEqual(Object.keys(packet).sort(), ['text/html', 'text/plain']);
    assert.notEqual(packet['text/html'], native); assert.equal(packet['text/plain'], A.Render.plain(doc));
    assert.equal(await page.evaluate(() => JSON.stringify(MailBuilder.library)), before);
    const expected = await page.evaluate(html => {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      return {text: parsed.body.textContent.replace(/\s+/g, ' ').trim(),
        links: [...parsed.querySelectorAll('a[href]')].map(a => [a.textContent.trim(), a.getAttribute('href')]),
        images: [...parsed.images].map(img => [img.getAttribute('src'), img.alt]),
        headings: [...parsed.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => [h.tagName, h.textContent])};
    }, native);
    const received = await context.newPage();
    await received.setContent('<div id="message" style="width:100%;overflow:auto"></div>');
    await received.evaluate(html => {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      parsed.querySelectorAll('style,link').forEach(node => node.remove());
      for (const table of parsed.body.children) table.style.width = '800px';
      document.querySelector('#message').replaceChildren(...parsed.body.childNodes);
    }, packet['text/html']);
    const widths = [];
    for (const width of [800, 390, 320]) {
      await received.setViewportSize({width, height: 1000});
      const actual = await received.locator('#message').evaluate(async element => {
        await Promise.all([...element.querySelectorAll('img')].map(img => img.decode()));
        return {available: element.clientWidth, content: element.scrollWidth, text: element.textContent.replace(/\s+/g, ' ').trim(),
          links: [...element.querySelectorAll('a[href]')].map(a => [a.textContent.trim(), a.getAttribute('href')]),
          images: [...element.querySelectorAll('img')].map(img => [img.getAttribute('src'), img.alt]),
          headings: [...element.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => [h.tagName, h.textContent])};
      });
      assert.ok(actual.content <= actual.available + 1, JSON.stringify({width, available: actual.available, content: actual.content}));
      for (const key of ['text', 'links', 'headings']) assert.deepEqual(actual[key], expected[key]);
      const images = list => list.map(([src, alt]) => [createHash('sha256').update(src).digest('hex'), alt]);
      assert.deepEqual(images(actual.images), images(expected.images));
      widths.push({width, available: actual.available, content: actual.content, images: actual.images.length, links: actual.links.length});
    }
    assert.deepEqual(errors, []); assert.ok(!requests.some(url => /^https?:/.test(url)));
    await fs.writeFile(path.join(evidence, 'copie-et-collage.json'), JSON.stringify({status: 'PASS', nativeButton: true,
      blocks: doc.blocks.length, htmlAndText: true, exportDiffersFromCopy: true, libraryPreserved: true,
      contentPreserved: true, widths, clipboardTransport: 'API interceptée dans un contexte isolé',
      systemClipboardExecuted: false, mailClientExecuted: false, externalRequests: 0}, null, 2));
  } finally { await browser.close(); }
});

for (const mode of ['denied', 'missing']) test(`copie ${mode} : échec visible, aucun paquet et composition conservée`, async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser, mode), before = await page.evaluate(() => JSON.stringify(MailBuilder.library));
    // Sans API Clipboard, la copie échoue avant le contrôle : aucun dialogue à confirmer.
    if (mode === 'denied') await throughChecks(page, 'copy', () => click(page, '[data-action=copy]')); else await click(page, '[data-action=copy]');
    await page.getByText(mode === 'denied' ? 'Refus de copie de recette' : 'La copie enrichie est indisponible ici.', {exact: false}).first().waitFor();
    assert.equal(await page.evaluate(() => window.__copyPackets.length), 0);
    assert.equal(await page.evaluate(() => JSON.stringify(MailBuilder.library)), before);
    assert.ok(!(await page.locator('#notice').textContent()).includes('Courriel copié'));
  } finally { await browser.close(); }
});
