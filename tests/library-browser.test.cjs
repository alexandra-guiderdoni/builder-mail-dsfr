const test = require('node:test');
const {root, evidence, portable, click, open, saved, expand, download, state, chromium, fs, assert} = require('./browser-support.cjs');
const path = require('node:path');
const row = id => `[data-document="${id}"]`;

test('accueil et gestion ciblée : ancienne composition, images, renommage, copie, export et suppression confirmée', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    await fs.mkdir(evidence, {recursive: true});
    const context = await browser.newContext({offline: true, acceptDownloads: true, viewport: {width: 1440, height: 1000}});
    const page = await context.newPage(); await page.goto(portable); await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.equal(await page.locator('#library-home').count(), 1, 'Un accueil de bibliothèque est attendu.');
    assert(await page.locator('#library-home').isVisible()); assert(!(await page.locator('#editor-page').isVisible()));
    await click(page, '[data-action=resume-document]'); await page.locator('#document-name').fill('Édition A'); await saved(page);
    const a = (await state(page)).activeId;
    await click(page, '[data-action=library-home]'); assert.equal(await page.locator('#home-title').evaluate(e => e === document.activeElement), true);
    await page.locator('#starter').selectOption('lettre'); await click(page, '[data-action=new-document]');
    await page.locator('#document-name').fill('Édition B');
    await page.locator('[data-image-field]').first().setInputFiles(path.join(root, 'app/assets/icon-192.png'));
    await page.locator('#notice').filter({hasText: 'Image locale incorporée'}).waitFor(); await saved(page);
    const b = (await state(page)).activeId, originalB = (await state(page)).documents.find(d => d.id === b);
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    assert(await page.locator('#library-home').isVisible()); assert.equal(await page.locator('#newsletter-list > li').count(), 2);
    await click(page, `${row(a)} [data-library-action=open]`); await click(page, '[data-action=library-home]');
    await click(page, `${row(b)} [data-library-action=rename]`); await page.locator('#library-name').fill('Édition B renommée');
    await click(page, '#library-confirm'); await saved(page);
    assert.equal((await state(page)).activeId, a); assert.equal((await state(page)).documents.find(d => d.id === b).name, 'Édition B renommée');
    await page.waitForFunction(selector => document.querySelector(selector) === document.activeElement, `${row(b)} [data-library-action=rename]`);
    const exported = JSON.parse(await fs.readFile(await download(page, `${row(b)} [data-library-action=export]`, 'entree-b.json'), 'utf8'));
    assert.equal(exported.id, b); assert.deepEqual(exported.blocks, originalB.blocks); assert.equal((await state(page)).activeId, a);
    await click(page, `${row(b)} [data-library-action=duplicate]`); await saved(page);
    const lib = await state(page), clone = lib.documents.find(d => d.id === lib.activeId);
    assert.equal(clone.name, 'Édition B renommée · copie'); assert.notEqual(clone.id, b);
    assert.deepEqual(clone.blocks.map(x => x.values), originalB.blocks.map(x => x.values));
    assert(clone.blocks.every(x => !originalB.blocks.some(y => x.id === y.id)));
    await click(page, `${row(a)} [data-library-action=open]`); await click(page, '[data-action=library-home]');
    const beforeCancel = await state(page);
    await click(page, `${row(b)} [data-library-action=remove]`); await click(page, '#library-cancel');
    assert.deepEqual(await state(page), beforeCancel);
    await page.waitForFunction(selector => document.querySelector(selector) === document.activeElement, `${row(b)} [data-library-action=remove]`);
    await page.screenshot({path: path.join(evidence, 'accueil-newsletters.png'), fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path: path.join(evidence, 'accueil-newsletters-mobile.png'), fullPage: true});
    for (const id of [b, clone.id, a]) { await click(page, `${row(id)} [data-library-action=remove]`); await click(page, '#library-confirm'); await saved(page); await page.waitForFunction(() => document.activeElement?.dataset.libraryAction === 'open'); }
    const last = await state(page); assert.equal(last.documents.length, 1); assert(last.documents.some(d => d.id === last.activeId));
    assert(!last.documents.some(d => [a, b, clone.id].includes(d.id)));
    assert.equal(last.documents[0].blocks.length, 6);
    assert.match(await page.locator('#notice').innerText(), /composition de départ/);
    await fs.writeFile(path.join(evidence, 'bibliotheque-accueil.json'), JSON.stringify({offline: true, existingCompositionRestored: true, targetOtherThanActive: true, imageExported: true, independentClone: true, cancelledDeletionPreserved: true, focusRestored: true, mobile390: true, lastDeletionPreservesInvariant: true}, null, 2));
    await context.close();
  } finally { await browser.close(); }
});

test('retour à la bibliothèque : champ invalide et fichier en chargement conservent le travail affiché', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await page.locator('#article-source').fill('javascript:alert(1)');
    await click(page, '[data-action=library-home]');
    assert(await page.locator('#editor-page').isVisible()); assert.equal(await page.locator('#article-source').inputValue(), 'javascript:alert(1)');
    await click(page, '[data-action=cancel-fields]');
    await page.evaluate(() => { const original = MailBuilder.Files.image; MailBuilder.Files = {...MailBuilder.Files, image: async file => { await new Promise(r => setTimeout(r, 500)); return original(file); }}; });
    await page.locator('[data-image-field]').first().setInputFiles(path.join(root, 'app/assets/icon-192.png'));
    await page.waitForFunction(() => MailBuilder.pendingInputs === 1); await click(page, '[data-action=library-home]');
    assert(await page.locator('#editor-page').isVisible());
    await page.locator('#notice').filter({hasText: 'Image locale incorporée'}).waitFor(); await saved(page);
    await click(page, '[data-action=library-home]'); assert(await page.locator('#library-home').isVisible());
  } finally { await browser.close(); }
});

test('panne de sauvegarde : retour à l’accueil sans perte, stockage intact et export de secours toujours accessible', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await page.locator('#document-name').fill('Version sauvegardée'); await saved(page);
    const persisted = await page.evaluate(() => MailBuilder.Storage.load());
    await page.evaluate(() => { MailBuilder.Storage = {...MailBuilder.Storage, save: async () => { throw new Error('Quota de recette'); }}; });
    await page.locator('#document-name').fill('Travail à exporter'); await page.locator('#error').filter({hasText: 'Quota de recette'}).waitFor();
    // #32 : après un échec, le changement de vue reste disponible ; le travail en mémoire est conservé.
    await click(page, '[data-action=library-home]'); assert(await page.locator('#library-home').isVisible());
    assert.match(await page.locator('#newsletter-list').innerText(), /Travail à exporter/);
    await expand(page, 'Fichiers et récupération');
    const exported = JSON.parse(await fs.readFile(await download(page, '[data-action=export-library]', 'bibliotheque-panne-accueil.json'), 'utf8'));
    assert.equal(exported.documents.find(d => d.id === exported.activeId).name, 'Travail à exporter');
    assert.deepEqual(await page.evaluate(() => MailBuilder.Storage.load()), persisted);
  } finally { await browser.close(); }
});
