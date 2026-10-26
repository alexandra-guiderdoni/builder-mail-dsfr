const test = require('node:test');
const {open, saved, expand, click, chromium, assert} = require('./browser-support.cjs');

// Contrat structurel nouveau, pas rejeu non instrumenté de #145/#150.
// Les contrôles de DOM sont intrusifs ; aucune conclusion sur le routage interne de Chromium.
async function previewControl(page) {
  const element = await page.locator('#preview').elementHandle();
  const frame = await element.contentFrame();
  const expectedURL = await element.getAttribute('src');
  await frame.waitForFunction(url => location.href === url && document.readyState === 'complete' && document.title === 'Isolation', expectedURL);
  await frame.evaluate(() => {
    window.__controlClicks = 0;
    document.addEventListener('click', event => { if (event.isTrusted) window.__controlClicks++; }, {once: true});
  });
  await frame.locator('body').click({position: {x: 20, y: 20}});
  assert.equal(await frame.evaluate(() => window.__controlClicks), 1, 'contrôle positif du document courant');
  return frame;
}

async function catalogueDocument(page) {
  const element = await page.locator('#catalogue-preview').elementHandle();
  const frame = await element.contentFrame();
  await frame.waitForFunction(() => location.href === 'about:srcdoc' && document.readyState === 'complete' && document.title === 'Aperçu du composant');
  // Sérialisation du DOM analysé par le navigateur, sans effacer les espaces ou les attributs.
  return {frame, html: await frame.evaluate(() => document.documentElement.outerHTML)};
}

test('la confirmation retire les deux aperçus, reçoit le pointeur parent et restaure un aperçu utilisable', async () => {
  const browser = await chromium.launch();
  try {
    const {page, observations} = await open(browser);
    let downloads = 0; page.on('download', () => downloads++);
    await page.evaluate(async () => {
      const A = MailBuilder, doc = A.Model.create('Isolation', [19]);
      await A.State.change(lib => { lib.documents = [doc]; lib.activeId = doc.id; });
    });
    await saved(page);
    await expand(page, 'Ajouter un composant');
    await page.locator('#catalogue').selectOption('mail-19');
    await page.locator('#catalogue-preview').waitFor({state: 'visible'});
    let catalogue = await catalogueDocument(page);
    const expectedCatalogue = catalogue.html;
    await page.evaluate(() => {
      window.__confirmationInputs = [];
      for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'submit', 'close']) {
        document.addEventListener(type, event => {
          if (['check-confirm', 'check-form', 'check-dialog'].includes(event.target.id))
            window.__confirmationInputs.push({type, id: event.target.id, trusted: event.isTrusted});
        }, {capture: true});
      }
    });
    const expectedHtml = await page.evaluate(() => MailBuilder.Render.exportHtml(MailBuilder.doc()));
    for (const action of ['cancel', 'confirm']) {
      const previous = await previewControl(page);
      await click(page, '[data-action=export-mail]');
      await page.locator('#check-dialog').waitFor({state: 'visible'});
      // Le témoin CSS/inert garde deux iframes et doit échouer ici, même si son clic réussirait.
      assert.equal(await page.locator('iframe').count(), 0, 'aucun contexte iframe de fond connecté');
      assert.equal(previous.isDetached(), true);
      assert.equal(catalogue.frame.isDetached(), true, 'ancien document catalogue détaché');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'check-dialog-title');
      assert.equal(downloads, 0, 'aucun téléchargement avant consentement');
      if (action === 'cancel') {
        await page.locator('#check-cancel').click();
      } else {
        const event = page.waitForEvent('download');
        await page.locator('#check-confirm').click();
        const download = await event, chunks = [];
        for await (const chunk of await download.createReadStream()) chunks.push(chunk);
        assert.equal(Buffer.concat(chunks).toString('utf8'), expectedHtml);
      }
      await page.locator('#check-dialog').waitFor({state: 'hidden'});
      assert.equal(await page.locator('iframe').count(), 2);
      await page.locator('#catalogue-preview').waitFor({state: 'visible'});
      assert.equal(await page.locator('#catalogue-preview').getAttribute('data-component'), 'mail-19');
      catalogue = await catalogueDocument(page);
      assert.equal(catalogue.html, expectedCatalogue, `contenu enfant du catalogue conservé après ${action}`);
      if (action === 'cancel') assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'export-mail');
      await previewControl(page);
    }
    assert.equal(downloads, 1);
    const inputs = await page.evaluate(() => window.__confirmationInputs);
    const confirmation = inputs.filter(row => row.id === 'check-confirm');
    assert.deepEqual(confirmation.map(row => row.type), ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']);
    assert.ok(confirmation.every(row => row.trusted));
    assert.equal(inputs.filter(row => row.type === 'submit' && row.trusted).length, 1);
    assert.equal(inputs.filter(row => row.type === 'close' && row.trusted).length, 2);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});
