const test = require('node:test');
const {chromium, open, click, confirmChecks, assert} = require('./browser-support.cjs');

// #203 : dans le builder, le poids ne s'affiche qu'à partir du repère de 92 160 octets (90 Kio), en un seul message sans
// chiffres ; le détail technique reste dans l'aide repliable. La copie conseille un envoi de test. SNUM n'est pas concerné.
const plain = /octets|Kio|%|Base64/;
async function heavy(page) {
  await page.evaluate(async () => {
    const A = MailBuilder, block = A.doc().blocks.find(b => A.Model.component(b.component).fields.some(f => f.type === 'text'));
    const key = A.Model.component(block.component).fields.find(f => f.type === 'text').key;
    await A.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).blocks.find(b => b.id === block.id).values[key] = 'Texte de recette volontairement long. '.repeat(3000); });
  });
  await page.waitForFunction(() => ['notice', 'alert'].includes(document.getElementById('mail-weight-summary').dataset.level));
}

test('#203 frontières exactes : rien jusqu’à 92 159 octets, message à partir de 92 160, sans calcul en cours trompeur', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const notices = await page.evaluate(() => [92159, 92160, 104447, 104448].map(bytes => MailBuilder.Files.weightNotice({...MailBuilder.Render.weight('a'.repeat(bytes)), dominant: 'text'})));
    assert.equal(notices[0], '');
    for (const notice of notices.slice(1)) { assert.match(notice, /Gmail risque/); assert.doesNotMatch(notice, plain); }
    assert.equal(notices[1], notices[3], 'un seul niveau visible');
    assert.equal(await page.evaluate(() => MailBuilder.Files.weightNotice({level: 'pending'}) + MailBuilder.Files.weightNotice({level: 'unavailable'})), '');
  } finally { await browser.close(); }
});

test('#203 aperçu : aucune information de poids sous le repère, un message clair au-delà, détail dans l’aide', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await page.waitForFunction(() => document.getElementById('mail-weight-summary').dataset.level === 'ok');
    assert.equal(await page.locator('#mail-weight-summary').isVisible(), false);
    assert.equal(await page.locator('#mail-weight-details').isVisible(), false);
    assert.equal(await page.locator('#clipboard-help').count(), 0, 'l’aide permanente sur la copie a disparu');
    assert.doesNotMatch(await page.locator('.preview-panel').innerText(), plain);
    await heavy(page);
    const summary = page.locator('#mail-weight-summary');
    assert.equal(await summary.isVisible(), true);
    assert.match(await summary.textContent(), /Courriel lourd : Gmail risque/); assert.doesNotMatch(await summary.textContent(), plain);
    assert.equal(await page.locator('[data-action=copy]').getAttribute('aria-describedby'), 'mail-weight-summary');
    await click(page, '#mail-weight-details > summary');
    assert.match(await page.locator('#mail-weight').textContent(), /octets/, 'le détail technique reste disponible dans l’aide');
    assert.match(await page.locator('#mail-weight-details').textContent(), /Chromium/);
  } finally { await browser.close(); }
});

test('#203 dialogue de vérification et message de copie : alerte courte et conseil d’envoi de test', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser, {permissions: ['clipboard-read', 'clipboard-write']});
    await heavy(page);
    await click(page, '[data-action=copy]');
    await page.locator('#check-dialog').waitFor({state: 'visible'});
    const items = await page.locator('#check-list li').allTextContents();
    const weightItem = items.find(text => /Gmail/.test(text));
    assert.ok(weightItem, 'le dialogue garde l’alerte de poids'); assert.doesNotMatch(weightItem, plain);
    await confirmChecks(page);
    await page.locator('#notice').filter({hasText: 'Courriel copié'}).waitFor();
    const notice = await page.locator('#notice').textContent();
    assert.match(notice, /envoi de test/); assert.doesNotMatch(notice, plain);
  } finally { await browser.close(); }
});
