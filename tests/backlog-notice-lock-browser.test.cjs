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


test('#169 : une sauvegarde réellement commitée ne remplace pas le verrou arrivé avant sa résolution', async t => {
  t.diagnostic('Frontière instrumentée : seule la résolution de Storage.save est retenue après son vrai commit IndexedDB. Conflits, reprise et BroadcastChannel restent réels ; aucun accès clipboard.');
  const browser = await chromium.launch();
  try {
    const {page: a, context} = await open(browser);
    await a.locator('#document-name').fill('Résolution ancienne après reprise'); await saved(a);
    const b = await another(context), c = await another(context);
    await a.locator('#subject').fill('Version initiale propriétaire A'); await saved(a);
    await b.locator('#subject').fill('Mémoire initiale B'); await b.locator(banner).waitFor({state: 'visible'});
    await c.locator('#subject').fill('Mémoire initiale C'); await c.locator(banner).waitFor({state: 'visible'});
    await click(b, takeOver); await saved(b);
    await b.locator('#notice').filter({hasText: /Main reprise.*copie horodatée/}).waitFor();
    const previousNotice = await b.locator('#notice').textContent(); assert.match(previousNotice, /Main reprise/);
    await b.evaluate(() => {
      const A = MailBuilder, original = A.Storage;
      window.__heldCommittedSave = {committed: false, released: false};
      A.Storage = {...original, async save(...args) {
        A.Storage = original; // Une seule opération instrumentée ; aucun faux résultat de stockage.
        const result = await original.save(...args);
        window.__heldCommittedSave.committed = true;
        window.__heldCommittedSave.token = result.token;
        await new Promise(resolve => { window.__releaseCommittedSave = () => { window.__heldCommittedSave.released = true; resolve(); }; });
        return result;
      }};
    });
    const subject = 'B réellement commité avant la reprise C';
    await b.locator('#subject').fill(subject);
    await b.waitForFunction(() => window.__heldCommittedSave?.committed);
    assert.equal(await b.evaluate(() => window.__heldCommittedSave.released), false);
    const committedB = (await store(c)).library;
    assert(committedB.documents.some(d => d.subject === subject), 'la vraie base contient déjà la modification B, avant relâchement');
    const memoryB = await state(b);
    // C charge la vraie base et reprend réellement la main ; son BroadcastChannel doit verrouiller B.
    await click(c, takeOver); await saved(c);
    await b.locator(banner).waitFor({state: 'visible'});
    const locked = await b.evaluate(() => Object.fromEntries(['save-state', 'save-announce', 'error', 'notice', 'read-only-message'].map(id => [id, document.getElementById(id).textContent])));
    assert.match(locked['save-state'], /Lecture seule/);
    assert.match(locked['save-announce'], /Lecture seule/);
    assert.match(locked.error, /autre fenêtre.*repris la main/);
    assert.equal(locked.notice, '');
    assert.equal(await b.locator('#subject').isDisabled(), true);
    await b.evaluate(async () => { window.__releaseCommittedSave(); await MailBuilder.State.settle(); });
    // Observer aussi l'échéance du succès vocal différé (QUIET_MS=1000), pas seulement la microtâche.
    await b.evaluate(() => new Promise(resolve => setTimeout(resolve, 1100)));
    const after = await b.evaluate(() => Object.fromEntries(['save-state', 'save-announce', 'error', 'notice', 'read-only-message'].map(id => [id, document.getElementById(id).textContent])));
    assert.deepEqual(after, locked, 'la fin ancienne ne remplace aucune information du verrou courant');
    assert.equal(await b.locator(banner).isVisible(), true);
    assert.equal(await b.locator('#subject').isDisabled(), true);
    assert.deepEqual(await state(b), memoryB, 'la lecture seule conserve le modèle B');
    const final = (await store(c)).library;
    assert.deepEqual(final, await state(c), 'C reste propriétaire de la vraie base');
    assert(final.documents.some(d => d.subject === subject));
    assert(final.documents.some(d => d.subject === 'Mémoire initiale C'));
  } finally { await browser.close(); }
});
