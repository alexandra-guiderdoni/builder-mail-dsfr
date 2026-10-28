const test = require('node:test');
const {chromium, open, portable, enterEditor, click, saved, state, store, assert} = require('./browser-support.cjs');
const banner = '#read-only', takeOver = '[data-action=take-over]';
async function another(context) {
  const page = await context.newPage(); await page.goto(portable);
  await page.waitForFunction(() => window.MailBuilder?.ready); await enterEditor(page); return page;
}

test('#169 : trois pages réelles, une reprise annoncée puis un nouveau verrou invalide cette notice', async () => {
  const browser = await chromium.launch();
  try {
    const {page: a, context} = await open(browser);
    await a.locator('#document-name').fill('Conflit à trois pages'); await saved(a);
    const b = await another(context), c = await another(context);
    await a.locator('#subject').fill('État propriétaire de A'); await saved(a);
    // Les deux écritures utilisent réellement un jeton devenu périmé.
    await b.locator('#subject').fill('Travail en mémoire de B'); await b.locator(banner).waitFor({state: 'visible'});
    await c.locator('#subject').fill('Travail en mémoire de C'); await c.locator(banner).waitFor({state: 'visible'});
    await click(b, takeOver); await saved(b);
    assert.equal(await b.locator(banner).isHidden(), true);
    await b.locator('#notice').filter({hasText: /Main reprise.*copie horodatée/}).waitFor();
    const oldNotice = await b.locator('#notice').innerText(), bMemory = await state(b);
    assert.match(oldNotice, /Main reprise/);
    await a.locator(banner).waitFor({state: 'visible'});
    // C reprend à son tour ; le vrai BroadcastChannel verrouille B, sans message injecté.
    await click(c, takeOver); await saved(c);
    await b.locator(banner).waitFor({state: 'visible'});
    assert.equal(await b.locator('#subject').isDisabled(), true);
    assert.match(await b.locator('#read-only-message').innerText(), /autre fenêtre.*repris la main/);
    assert.match(await b.locator('#error').innerText(), /autre fenêtre.*repris la main/);
    assert.equal(await b.locator('#notice').textContent(), '', 'la réussite précédente ne contredit plus le verrou courant');
    assert.deepEqual(await state(b), bMemory, 'le verrou conserve la mémoire de B');
    assert.equal(await b.locator('#subject').inputValue(), 'Travail en mémoire de B');
    const final = (await store(c)).library;
    assert.deepEqual(final, await state(c), 'C détient le modèle effectivement sauvegardé');
    assert(final.documents.some(d => d.subject === 'Travail en mémoire de B'));
    assert(final.documents.some(d => d.subject === 'Travail en mémoire de C'));
    assert(final.documents.some(d => d.subject === 'État propriétaire de A'));
  } finally { await browser.close(); }
});
