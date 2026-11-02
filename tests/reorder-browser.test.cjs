const test = require('node:test');
const {open, saved, selectBlock, chromium, assert} = require('./browser-support.cjs');

// #204 : réagencer les blocs par glisser-déposer à la souris, « Déplacer à la position… » au clavier, et
// « Annuler le déplacement » tant que l'ordre obtenu n'a pas changé. Spécification : docs/tickets/reagencer-blocs.md.
const order = page => page.evaluate(() => MailBuilder.doc().blocks.map(b => b.id));
const handle = id => `[data-drag-handle="${id}"]`;
async function five(page) {
  await page.evaluate(async () => { const A = MailBuilder, doc = A.Model.create('Ordre', [2, 5, 13, 19, 47]); await A.State.change(lib => { lib.documents = [doc]; lib.activeId = doc.id; }); });
  await saved(page); return order(page);
}
const undoVisible = page => page.locator('#undo-move-zone').isVisible();
const focused = page => page.evaluate(() => document.activeElement?.dataset.dragHandle || document.activeElement?.id);
// Les actions sont asynchrones : le focus est attendu, avec une limite, puis constaté.
async function focusOn(page, expected) {
  await page.waitForFunction(expected => (document.activeElement?.dataset.dragHandle || document.activeElement?.id) === expected, expected, {timeout: 3000, polling: 100}).catch(() => {});
  assert.equal(await focused(page), expected);
}

test('#204 glisser-déposer : dépôt avant un bloc, sélection, focus et annonce, puis annulation', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); const ids = await five(page);
    await page.locator(handle(ids[4])).dragTo(page.locator(`[data-select="${ids[1]}"]`), {targetPosition: {x: 10, y: 2}});
    assert.deepEqual(await order(page), [ids[0], ids[4], ids[1], ids[2], ids[3]]);
    assert.equal(await page.evaluate(() => MailBuilder.selected), ids[4]);
    await focusOn(page, ids[4]);
    assert.match(await page.locator('#notice').textContent(), /déplacé.*position 2 sur 5/);
    assert.equal(await undoVisible(page), true);
    assert.match(await page.locator('#undo-move').textContent(), /Annuler le déplacement du bloc/);
    await page.locator('#undo-move').click();
    assert.deepEqual(await order(page), ids);
    await focusOn(page, ids[4]);
    assert.match(await page.locator('#notice').textContent(), /position 5 sur 5/);
    assert.equal(await undoVisible(page), false);
    await saved(page); await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.deepEqual(await order(page), ids, 'ordre persistant après rechargement');
  } finally { await browser.close(); }
});

test('#204 abandon par Échap et dépôt sur place : ordre inchangé, aucune annulation, focus sur la poignée', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); const ids = await five(page);
    // Échap pendant un glissement : le navigateur le termine par dragend, sans drop. L’automatisation ne rejoue pas Échap
    // de façon fiable pendant un glissement natif : cet abandon est rejoué au niveau du DOM, avec un vrai DataTransfer.
    await page.locator(handle(ids[0])).evaluate(element => {
      const data = new DataTransfer(), list = element.closest('#block-list');
      element.dispatchEvent(new DragEvent('dragstart', {bubbles: true, dataTransfer: data}));
      list.children[3].dispatchEvent(new DragEvent('dragover', {bubbles: true, cancelable: true, dataTransfer: data}));
      element.dispatchEvent(new DragEvent('dragend', {bubbles: true, dataTransfer: data}));
    });
    assert.deepEqual(await order(page), ids); assert.equal(await undoVisible(page), false);
    await focusOn(page, ids[0]);
    await page.locator(handle(ids[2])).dragTo(page.locator(`[data-select="${ids[2]}"]`));
    assert.deepEqual(await order(page), ids); assert.equal(await undoVisible(page), false);
  } finally { await browser.close(); }
});

test('#204 clavier : la poignée mène à « Déplacer à la position… », liste nommée, puis annulation', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); const ids = await five(page);
    await page.locator(handle(ids[0])).focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => MailBuilder.selected), ids[0]);
    await focusOn(page, 'move-position');
    const options = await page.locator('#move-position option').allTextContents();
    assert.equal(options.length, 5); assert.match(options[3], /^4 - /);
    assert.equal(await page.locator(handle(ids[0])).getAttribute('aria-label'), await page.evaluate(id => `Déplacer le bloc 1 « ${MailBuilder.UI.blockName(MailBuilder.doc().blocks.find(b => b.id === id))} »`, ids[0]));
    await page.locator('#move-position').selectOption('3'); await page.locator('[data-block-action=move-to]').click();
    assert.deepEqual(await order(page), [ids[1], ids[2], ids[3], ids[0], ids[4]]);
    await focusOn(page, 'move-position');
    assert.match(await page.locator('#notice').textContent(), /position 4 sur 5/);
    await page.locator('#undo-move').click(); assert.deepEqual(await order(page), ids);
  } finally { await browser.close(); }
});

test('#204 matrice d’annulation : saisie conservée, retrait, duplication et annulation du retrait la retirent', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); const ids = await five(page);
    const move = async (source, target) => { await page.locator(handle(source)).dragTo(page.locator(`[data-select="${target}"]`), {targetPosition: {x: 10, y: 2}}); assert.equal(await undoVisible(page), true); };
    await move(ids[4], ids[0]);
    await page.locator('#block-editor textarea, #block-editor input[type=text]').first().fill('Saisie après déplacement'); await saved(page);
    assert.equal(await undoVisible(page), true, 'une saisie garde l’annulation');
    await selectBlock(page, ids[2]); await page.locator('[data-block-action=remove]').click();
    assert.equal(await undoVisible(page), false, 'un retrait la retire'); assert.equal(await page.locator('#undo-remove-zone').isVisible(), true, 'l’annulation du retrait reste');
    await page.locator('#undo-remove').click();
    assert.equal(await undoVisible(page), false, 'annuler le retrait ne réactive pas le déplacement');
    await move(ids[3], ids[1]);
    await selectBlock(page, ids[1]); await page.locator('[data-block-action=duplicate]').click();
    assert.equal(await undoVisible(page), false, 'une duplication la retire');
  } finally { await browser.close(); }
});

test('#204 garde : déplacement refusé pendant un brouillon d’URL, ordre inchangé ; poignée inactive au toucher', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); const ids = await five(page);
    await selectBlock(page, ids[1]); await page.locator('#article-source').fill('pas une adresse'); await page.locator('#article-source').press('Tab');
    await page.locator('#move-position').selectOption('4'); await page.locator('[data-block-action=move-to]').click();
    await page.locator('#error').filter({hasText: /Corrigez/}).waitFor();
    assert.deepEqual(await order(page), ids); assert.equal(await undoVisible(page), false);
    // Garde existante, comme pour Monter et Descendre : le focus va au champ à corriger.
    await focusOn(page, 'article-source');
    const draggable = await page.locator(handle(ids[0])).evaluate(element => {
      element.dispatchEvent(new PointerEvent('pointerdown', {pointerType: 'touch', bubbles: true}));
      const touch = element.draggable; element.dispatchEvent(new PointerEvent('pointerdown', {pointerType: 'mouse', bubbles: true}));
      return {touch, mouse: element.draggable};
    });
    assert.deepEqual(draggable, {touch: false, mouse: true});
  } finally { await browser.close(); }
});
