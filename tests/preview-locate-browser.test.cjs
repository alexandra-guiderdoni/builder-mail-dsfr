const test = require('node:test');
const {chromium, open, assert, selectBlock} = require('./browser-support.cjs');

// #211, piste B : « Voir ce bloc dans l’aperçu » fait défiler la page jusqu’au bloc, l’encadre, puis « Revenir au champ »
// rend le champ quitté avec sa sélection et la position de la page. L’aperçu ne transmet que la position d’un repère de bloc,
// émis seulement dans le HTML d’aperçu (décision d’Alex du 4 novembre 2026, extension bornée de l’exception de #28).
const components = [1, 2, 10, 20, 31, 41, 50];

async function compose(page) {
  return page.evaluate(async ids => {
    const A = MailBuilder, doc = A.Model.create('Voir le bloc', ids);
    await A.State.change(lib => { lib.documents.push(doc); lib.activeId = doc.id; });
    await A.Library.open(doc.id);
    return doc.blocks.map(b => b.id);
  }, components);
}
// Aperçu prêt : son document chargé porte un repère par bloc, et sa hauteur suit le contenu (#28).
async function previewReady(page) {
  const count = await page.evaluate(() => MailBuilder.doc().blocks.length), until = Date.now() + 10000;
  while (Date.now() < until) {
    const frame = page.frames().find(f => f.parentFrame() === page.mainFrame() && f.url().startsWith('blob:'));
    const state = frame && await frame.evaluate(() => ({markers: document.querySelectorAll('[data-preview-block]').length, height: document.documentElement.scrollHeight})).catch(() => null);
    const outer = await page.evaluate(() => document.getElementById('preview')?.clientHeight);
    if (state && state.markers === count && Math.abs(outer - state.height) <= 2) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`aperçu sans ${count} repères de bloc ni hauteur ajustée`);
}
// Position attendue du bloc, lue dans le document de l’aperçu par l’outil de test (le parent, lui, n’y a pas accès).
async function expected(page, id) {
  const frame = page.frames().find(f => f.parentFrame() === page.mainFrame() && f.url().startsWith('blob:'));
  const inner = await frame.evaluate(id => {
    const markers = [...document.querySelectorAll('[data-preview-block]')], i = markers.findIndex(m => m.dataset.previewBlock === id);
    const top = markers[i].getBoundingClientRect().top, next = markers[i + 1];
    return {top, bottom: next ? next.getBoundingClientRect().top : document.body.getBoundingClientRect().bottom, count: markers.length};
  }, id);
  const outer = await page.evaluate(() => { const f = document.getElementById('preview'), r = f.getBoundingClientRect(), s = getComputedStyle(f); return {top: r.top + scrollY + parseFloat(s.borderTopWidth), left: r.left + scrollX, width: r.width}; });
  return {top: outer.top + inner.top, bottom: outer.top + inner.bottom, count: inner.count};
}

for (const [width, height, label] of [[1280, 900, '1280 px'], [1024, 800, '1024 px'], [390, 844, '390 px'], [640, 450, 'zoom 200 % à 1280 px']]) {
  test(`voir le bloc dans l’aperçu puis revenir au champ, ${label}`, async () => {
    const browser = await chromium.launch();
    try {
      const {page, observations} = await open(browser, {viewport: {width, height}});
      const ids = await compose(page); await previewReady(page);
      const target = ids[3];
      await selectBlock(page, target);
      const field = page.locator('#block-editor textarea, #block-editor input.fr-input').first(), fieldId = await field.getAttribute('id');
      await field.focus(); await field.evaluate(input => { input.value = 'Texte de recette assez long'; input.dispatchEvent(new Event('input', {bubbles: true})); });
      await page.waitForTimeout(400); await previewReady(page);
      await field.evaluate(input => input.setSelectionRange(2, 9, 'forward'));
      const before = await page.evaluate(() => scrollY);
      // Le bouton est atteint par son nom, comme avec la liste des boutons d’un lecteur d’écran.
      const show = page.getByRole('button', {name: 'Voir ce bloc dans l’aperçu', exact: true});
      assert.equal(await show.count(), 1);
      await show.focus(); await page.keyboard.press('Enter');
      const back = page.getByRole('button', {name: /^Revenir au champ/});
      await back.waitFor({state: 'visible'});
      assert.equal(await back.evaluate(b => b === document.activeElement), true, 'le focus passe au bouton de retour');
      const box = await page.evaluate(() => { const h = document.getElementById('preview-highlight'); if (!h || h.hidden) return null; const r = h.getBoundingClientRect(); return {top: r.top + scrollY, bottom: r.bottom + scrollY, viewTop: r.top, innerHeight}; });
      assert.ok(box, 'le bloc est encadré');
      const place = await expected(page, target);
      assert.equal(place.count, ids.length, 'un repère par bloc dans l’aperçu');
      assert.ok(Math.abs(box.top - place.top) <= 1 && Math.abs(box.bottom - place.bottom) <= 1, `cadre ${box.top}–${box.bottom}, bloc ${place.top}–${place.bottom}`);
      assert.ok(box.viewTop >= 0 && box.viewTop < box.innerHeight / 2, `haut du bloc visible dans la fenêtre : ${box.viewTop}`);
      await page.keyboard.press('Enter');
      await page.waitForFunction(id => document.activeElement?.id === id, fieldId);
      const state = await page.evaluate(() => ({start: document.activeElement.selectionStart, end: document.activeElement.selectionEnd, scroll: scrollY, bar: document.getElementById('preview-return').hidden, highlight: document.getElementById('preview-highlight')?.hidden ?? true}));
      assert.deepEqual([state.start, state.end], [2, 9], 'sélection conservée');
      assert.ok(Math.abs(state.scroll - before) <= 1, `position de la page rendue : ${state.scroll} au lieu de ${before}`);
      assert.equal(state.bar, true); assert.equal(state.highlight, true);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `aucun défilement horizontal : ${overflow} px`);
      assert.deepEqual(observations.errors, []);
    } finally { await browser.close(); }
  });
}

test('voir le bloc : Échap ramène au champ, et le cadre suit un bloc déplacé', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser, {viewport: {width: 1280, height: 900}});
    const ids = await compose(page); await previewReady(page);
    await selectBlock(page, ids[2]);
    const field = page.locator('#block-editor textarea, #block-editor input.fr-input').first(), fieldId = await field.getAttribute('id');
    await field.focus();
    await page.getByRole('button', {name: 'Voir ce bloc dans l’aperçu', exact: true}).click();
    await page.getByRole('button', {name: /^Revenir au champ/}).waitFor({state: 'visible'});
    await page.keyboard.press('Escape');
    await page.waitForFunction(id => document.activeElement?.id === id, fieldId);
    assert.equal(await page.locator('#preview-return').isHidden(), true);
    await page.locator('[data-block-action=down]').click();
    await page.waitForFunction(id => MailBuilder.doc().blocks[3].id === id, ids[2]); await page.waitForTimeout(400); await previewReady(page);
    await page.getByRole('button', {name: 'Voir ce bloc dans l’aperçu', exact: true}).click();
    await page.getByRole('button', {name: /^Revenir au champ|^Revenir aux champs du bloc$/}).waitFor({state: 'visible'});
    const box = await page.evaluate(() => { const r = document.getElementById('preview-highlight').getBoundingClientRect(); return {top: r.top + scrollY, bottom: r.bottom + scrollY}; });
    const place = await expected(page, ids[2]);
    assert.ok(Math.abs(box.top - place.top) <= 1 && Math.abs(box.bottom - place.bottom) <= 1, `cadre ${box.top}–${box.bottom}, bloc déplacé ${place.top}–${place.bottom}`);
  } finally { await browser.close(); }
});

test('voir le bloc : repères seulement dans l’aperçu, message forgé ignoré, suspension respectée', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const ids = await compose(page); await previewReady(page);
    const outputs = await page.evaluate(() => { const A = MailBuilder, d = A.doc(); return {preview: (A.Render.html(d, true).match(/data-preview-block=/g) || []).length, html: A.Render.html(d).includes('data-preview-block'), copy: A.Render.clipboardHtml(d).includes('data-preview-block'), used: A.Render.html(d, true).length > 0}; });
    assert.equal(outputs.preview, ids.length); assert.equal(outputs.html, false); assert.equal(outputs.copy, false);
    // Un message forgé par la page elle-même ne vient pas de l’aperçu : il est ignoré, la réponse vient du repère réel.
    const located = await page.evaluate(async id => {
      const pending = MailBuilder.Preview.locate(id);
      postMessage({type: 'mail-preview-block', block: id, top: 1, height: 1}, '*');
      return pending;
    }, ids[4]);
    const place = await expected(page, ids[4]), frameTop = await page.evaluate(() => { const f = document.getElementById('preview'); return f.getBoundingClientRect().top + scrollY + parseFloat(getComputedStyle(f).borderTopWidth); });
    assert.ok(located && Math.abs(frameTop + located.top - place.top) <= 1 && Math.abs(located.height - (place.bottom - place.top)) <= 1, JSON.stringify(located));
    assert.equal(await page.evaluate(() => MailBuilder.Preview.locate('bloc-absent')), null, 'un bloc absent n’est pas situé');
    const suspended = await page.evaluate(async id => { const release = MailBuilder.Preview.suspend(); const result = await MailBuilder.Preview.locate(id); release(); return result; }, ids[4]);
    assert.equal(suspended, null, 'aucune position pendant une confirmation');
    await previewReady(page);
    assert.ok(await page.evaluate(id => MailBuilder.Preview.locate(id), ids[4]), 'l’aperçu rétabli situe de nouveau le bloc');
  } finally { await browser.close(); }
});
