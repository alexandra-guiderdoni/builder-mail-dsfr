const test = require('node:test');
const {open, click, expand, saved, selectBlock, state, store, enterEditor, chromium, assert} = require('./browser-support.cjs');

// Lettre entièrement fictive : titre, article avec image générée, paragraphe, pied de page avec deux liens supplémentaires.
async function importLetter(page) {
  const doc = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 6; canvas.height = 4;
    const context = canvas.getContext('2d'); context.fillStyle = '#6a6af4'; context.fillRect(0, 0, 6, 4);
    const doc = MailBuilder.Model.create('Lettre de recette du retrait', [5, 31, 19, 50]), [title, article, paragraph, footer] = doc.blocks;
    title.values.f0 = 'Titre fictif de la lettre';
    Object.assign(article.values, {f0: canvas.toDataURL('image/png'), f1: 'Illustration synthétique', f2: 'Détail fictif', f3: 'https://example.invalid/article-retire', f4: 'Article retiré puis restauré', f5: 'Rédaction fictive', f6: '. 24 octobre'});
    Object.assign(article, {source: 'https://example.invalid/source-fictive', sourceLabel: 'Lire la source fictive'});
    paragraph.values.f0 = 'Paragraphe fictif';
    footer.additionalLinks = [{url: 'https://example.invalid/desabonnement', label: 'Se désabonner'}, {url: 'mailto:contact@example.invalid', label: 'Nous contacter'}];
    return doc;
  });
  await expand(page, 'Fichiers et récupération');
  await page.locator('#project-input').setInputFiles({name: 'lettre-retrait.courriel.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc))});
  await saved(page);
  return page.evaluate(() => MailBuilder.doc());
}
const g = name => `«\u00a0${name}\u00a0»`;
const ids = page => page.evaluate(() => MailBuilder.doc().blocks.map(b => b.id));
const focused = page => page.evaluate(() => ({id: document.activeElement.id, first: document.activeElement === document.querySelector('#block-editor').querySelector('textarea,input')}));
async function remove(page, id) { await selectBlock(page, id); await click(page, '[data-block-action=remove]'); await saved(page); }
async function undo(page) { await click(page, '#undo-remove'); await page.locator('#notice').filter({hasText: 'restauré'}).waitFor(); await saved(page); }

test('annuler le dernier retrait restaure le bloc avec image à sa place, sans effacer les saisies ultérieures, puis le conserve', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    const doc = await importLetter(page), [title, article, paragraph, footer] = doc.blocks;
    await selectBlock(page, article.id);
    await page.locator('#field-f2').fill('Détail saisi juste avant le retrait'); await saved(page);
    const removed = await page.evaluate(id => MailBuilder.doc().blocks.find(b => b.id === id), article.id);
    assert.match(removed.values.f0, /^data:image\/png;base64,/);
    await click(page, '[data-block-action=remove]'); await saved(page);
    assert.deepEqual(await ids(page), [title.id, paragraph.id, footer.id]);
    const button = page.locator('#undo-remove');
    assert.equal(await button.isVisible(), true, 'Le retrait doit proposer « Annuler le retrait ».');
    assert.equal(await button.textContent(), `Annuler le retrait du bloc ${g('Article avec vignette et lien')}`);
    assert.ok((await page.locator('#notice').textContent()).startsWith(`Bloc ${g('Article avec vignette et lien')} retiré.`));

    await selectBlock(page, paragraph.id);
    await page.locator('#field-f0').fill('Paragraphe saisi après le retrait'); await saved(page);
    await page.locator('#field-f0').pressSequentially(', puis complété', {delay: 5}); await saved(page);
    await page.locator('#subject').fill('Objet saisi après le retrait'); await saved(page);
    assert.equal((await store(page)).library.documents.find(d => d.id === doc.id).blocks.some(b => b.id === article.id), false);

    await page.locator('#subject').focus(); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'undo-remove');
    await page.keyboard.press('Enter');
    await page.locator('#notice').filter({hasText: 'restauré'}).waitFor(); await saved(page);

    const current = await page.evaluate(() => MailBuilder.doc());
    assert.deepEqual(current.blocks.map(b => b.id), [title.id, article.id, paragraph.id, footer.id]);
    assert.deepEqual(current.blocks[1], removed);
    assert.equal(current.blocks[2].values.f0, 'Paragraphe saisi après le retrait, puis complété');
    assert.equal(current.subject, 'Objet saisi après le retrait');
    assert.equal(await page.locator('#notice').getAttribute('role'), 'status');
    assert.equal(await page.locator('#notice').textContent(), `Bloc ${g('Article avec vignette et lien')} restauré en position 2.`);
    assert.equal(await page.evaluate(() => MailBuilder.selected), article.id);
    assert.deepEqual(await focused(page), {id: 'field-f0', first: true});
    assert.equal(await button.isVisible(), false);
    const preview = page.frameLocator('#preview');
    // Présence dans le document de l’aperçu : sa mise en page n’est pas l’objet de ce test.
    await preview.locator('a').filter({hasText: 'Article retiré puis restauré'}).waitFor({state: 'attached'});
    assert.equal(await preview.locator(`img[src="${removed.values.f0}"]`).count(), 1);

    assert.deepEqual((await store(page)).library.documents.find(d => d.id === doc.id), current);
    await page.reload(); await page.waitForFunction(() => MailBuilder.ready); await enterEditor(page);
    assert.deepEqual(await page.evaluate(() => MailBuilder.doc()), current);
    assert.equal(await page.locator('#undo-remove').isVisible(), false);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});

test('dernier bloc et liens supplémentaires restaurés ; seul le retrait le plus récent de la composition s’annule', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    const doc = await importLetter(page), [title, article, paragraph, footer] = doc.blocks;
    await remove(page, footer.id);
    assert.deepEqual(await ids(page), [title.id, article.id, paragraph.id]);
    assert.equal(await page.locator('#undo-remove').isVisible(), true, 'Le retrait du dernier bloc doit proposer « Annuler le retrait ».');
    assert.equal(await page.locator('#undo-remove').textContent(), `Annuler le retrait du bloc ${g('Gestion des abonnements')}`);
    await undo(page);
    const restored = await page.evaluate(() => MailBuilder.doc());
    assert.deepEqual(restored.blocks.map(b => b.id), [title.id, article.id, paragraph.id, footer.id]);
    assert.deepEqual(restored.blocks[3], footer);
    assert.equal(await page.locator('#notice').textContent(), `Bloc ${g('Gestion des abonnements')} restauré en position 4.`);
    assert.deepEqual(await focused(page), {id: 'field-f0', first: true});
    assert.equal(await page.locator('#field-footer-label-1').inputValue(), 'Nous contacter');
    await page.frameLocator('#preview').locator('a[href]').filter({hasText: 'Nous contacter'}).waitFor({state: 'attached'});

    await remove(page, paragraph.id);
    await remove(page, title.id);
    assert.equal(await page.locator('#undo-remove').textContent(), `Annuler le retrait du bloc ${g('Titre principal')}`);
    // Contrat de #37 : l’URL invalide est un brouillon ; la garde refuse l’annulation avec le message du lien.
    await page.locator('#article-source').fill('adresse sans protocole');
    await click(page, '#undo-remove');
    await page.locator('#error').filter({hasText: 'Corrigez ce lien'}).waitFor();
    assert.deepEqual(await ids(page), [article.id, footer.id]);
    assert.equal(await page.locator('#undo-remove').isVisible(), true, 'Une annulation refusée doit rester disponible.');
    await click(page, '[data-action=cancel-fields]');
    await undo(page);
    assert.deepEqual(await ids(page), [title.id, article.id, footer.id]);
    assert.equal(await page.locator('#undo-remove').isVisible(), false);

    await remove(page, article.id);
    await expand(page, 'Fichiers et récupération');
    await click(page, '[data-action=recover]'); await page.locator('#notice').filter({hasText: 'État précédent relu'}).waitFor(); await saved(page);
    assert.deepEqual(await ids(page), [title.id, article.id, footer.id]);
    assert.equal(await page.locator('#undo-remove').isVisible(), false, 'Un bloc déjà présent ne doit pas être proposé à la restauration.');
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});

test('chaque composition garde son propre dernier retrait, y compris lorsqu’elle a été vidée', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    const letter = await importLetter(page), other = (await state(page)).documents.find(d => d.id !== letter.id);
    await remove(page, letter.blocks[1].id);
    assert.equal(await page.locator('#undo-remove').isVisible(), true, 'Le retrait doit proposer « Annuler le retrait ».');

    await page.locator('#documents').selectOption(other.id); await saved(page);
    assert.equal(await page.locator('#undo-remove').isVisible(), false);
    for (let i = 0; i < 10 && (await ids(page)).length; i++) { await click(page, '[data-block-action=remove]'); await saved(page); }
    assert.deepEqual(await ids(page), []);
    assert.equal(await page.locator('#block-editor').textContent(), 'Ajoutez un composant au courriel pour personnaliser son contenu.');
    assert.equal(await page.locator('#undo-remove').textContent(), `Annuler le retrait du bloc ${g('Lien de désabonnement')}`);
    await undo(page);
    assert.deepEqual(await page.evaluate(() => MailBuilder.doc().blocks), [other.blocks.at(-1)]);
    assert.equal(await page.locator('#notice').textContent(), `Bloc ${g('Lien de désabonnement')} restauré en position 1.`);
    assert.deepEqual(await focused(page), {id: 'field-f0', first: true});

    await page.locator('#documents').selectOption(letter.id); await saved(page);
    assert.equal(await page.locator('#undo-remove').textContent(), `Annuler le retrait du bloc ${g('Article avec vignette et lien')}`);
    await undo(page);
    assert.deepEqual(await page.evaluate(() => MailBuilder.doc()), letter);
    assert.equal((await state(page)).documents.find(d => d.id === other.id).blocks.length, 1);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});
