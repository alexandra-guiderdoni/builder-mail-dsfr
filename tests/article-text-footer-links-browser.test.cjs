const test = require('node:test');
const {chromium, open, click, expand, saved, state, enterEditor, selectBlock, download, fs, assert, evidence, pageState} = require('./browser-support.cjs');
const path = require('node:path');

test('article sans image et trois actions de pied de page : import, édition, refus, image, clone et exports hors ligne', async () => {
  const browser = await chromium.launch();
  let page, stage = 'ouverture';
  try {
    const opened = await open(browser, {offline: true}); page = opened.page;
    const {observations} = opened;
    const fixture = await page.evaluate(() => {
      const doc = MailBuilder.Model.create('Lettre de recette', [31, 50]), [article, footer] = doc.blocks, image = article.values.f0;
      Object.assign(article.values, {f0: '', f1: '', f2: '', f3: 'https://example.invalid/article', f4: 'Un article sans illustration', f5: 'Le détail utile de cet article', f6: ''});
      Object.assign(footer.values, {f0: 'Une question sur cette lettre ?', f1: 'mailto:abonnement@example.invalid?subject=Inscription', f2: 'S’abonner'});
      footer.additionalLinks = [{url: 'https://example.invalid/desabonnement', label: 'Se désabonner'}, {url: 'mailto:contact@example.invalid', label: 'Nous contacter'}];
      return {doc, image};
    });
    await expand(page, 'Fichiers et récupération');
    await page.locator('#project-input').setInputFiles({name: 'lettre-native.courriel.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture.doc))});
    await saved(page);
    const imported = await state(page), doc = imported.documents.find(d => d.id === imported.activeId), [article, footer] = doc.blocks;
    assert.equal(doc.blocks.length, 2);
    const preview = page.frameLocator('#preview');
    stage = 'aperçu de l’article importé sans image';
    await preview.locator('a').filter({hasText: 'Un article sans illustration'}).waitFor();
    assert.equal(await preview.locator('img').count(), 0);
    assert.equal(await preview.locator('a[href]').count(), 4);
    for (const label of ['S’abonner', 'Se désabonner', 'Nous contacter']) assert.equal(await preview.locator('a[href]').filter({hasText: label}).count(), 1);

    await selectBlock(page, article.id);
    assert.equal(await page.locator('#block-editor h3').textContent(), 'Article sans image');
    assert.match(await page.locator(`[data-select="${article.id}"]`).textContent(), /Article sans image.*Un article sans illustration/s);
    assert.equal(await page.locator('.image-field img').count(), 0);
    assert.equal(await page.locator('label[for=field-f0]').textContent(), 'Image facultative');
    const imageMatch = /^data:(image\/[a-z]+);base64,(.+)$/.exec(fixture.image);
    assert.ok(imageMatch);
    await page.locator('[data-image-field=f0]').setInputFiles({name: 'illustration.' + imageMatch[1].split('/')[1], mimeType: imageMatch[1], buffer: Buffer.from(imageMatch[2], 'base64')});
    stage = 'aperçu de l’image ajoutée';
    await saved(page); await preview.locator('img').first().waitFor();
    await page.locator('#field-f1').fill('Illustration de recette'); await saved(page);
    assert.equal(await page.locator('.image-field img').count(), 1);
    await click(page, '[data-block-action=remove-image]'); await saved(page);
    assert.equal(await page.locator('.image-field img').count(), 0);
    assert.equal(await preview.locator('img').count(), 0);
    const withoutImage = await page.evaluate(id => MailBuilder.doc().blocks.find(b => b.id === id), article.id);
    assert.equal(withoutImage.values.f0, ''); assert.equal(withoutImage.values.f1, '');

    await selectBlock(page, footer.id);
    stage = 'édition et refus des liens invalides';
    assert.equal(await page.locator('[data-block-action=add-footer-link]').isDisabled(), true);
    assert.equal(await page.locator('#field-footer-label-0').getAttribute('aria-required'), 'true');
    assert.equal(await page.locator('#field-footer-label-0').getAttribute('data-link-label'), '');
    await page.locator('#field-footer-label-0').fill('Modifier mon abonnement'); await saved(page);
    const validURL = 'mailto:abonnement@example.invalid?subject=Modifier';
    await page.locator('#field-footer-url-0').fill(validURL); await saved(page);
    const beforeInvalid = await state(page);
    await page.locator('#field-footer-url-0').fill(validURL + '&bcc=autre@example.invalid'); await page.locator('#field-footer-url-0').blur();
    assert.equal(await page.locator('#field-footer-url-0').getAttribute('aria-invalid'), 'true');
    assert.match(await page.locator('#error-field-footer-url-0').textContent(), /Erreur/);
    assert.deepEqual(await state(page), beforeInvalid);
    await selectBlock(page, article.id);
    assert.equal(await page.locator(`[data-select="${article.id}"]`).getAttribute('aria-pressed'), 'true', 'Une URL en cours de saisie ne bloque pas le changement de bloc.');
    await selectBlock(page, footer.id);
    assert.equal(await page.locator('#field-footer-url-0').inputValue(), validURL + '&bcc=autre@example.invalid', 'La saisie temporaire est conservée.');
    assert.equal(await page.locator('#field-footer-url-0').getAttribute('aria-invalid'), 'true');
    await click(page, '[data-action=cancel-fields]');
    assert.equal(await page.locator('#field-footer-url-0').inputValue(), validURL);
    await page.locator('#field-footer-label-0').fill('   ');
    assert.equal(await page.locator('#field-footer-label-0').getAttribute('aria-invalid'), 'true');
    assert.deepEqual(await state(page), beforeInvalid);
    await click(page, '[data-action=cancel-fields]');

    stage = 'duplication et retrait du pied de page';
    await click(page, '[data-block-action=duplicate]'); await saved(page);
    const clone = await page.evaluate(() => MailBuilder.doc().blocks.find(b => b.id === MailBuilder.selected));
    assert.notEqual(clone.id, footer.id);
    assert.deepEqual(clone.additionalLinks, beforeInvalid.documents.find(d => d.id === beforeInvalid.activeId).blocks.find(b => b.id === footer.id).additionalLinks);
    await click(page, '[data-block-action=remove]'); await saved(page);
    await selectBlock(page, footer.id);
    await click(page, '[data-block-action=remove-footer-link][data-footer-link-index="1"]'); await saved(page);
    await click(page, '[data-block-action=remove-footer-link][data-footer-link-index="0"]'); await saved(page);
    assert.equal(await page.evaluate(id => Object.hasOwn(MailBuilder.doc().blocks.find(b => b.id === id), 'additionalLinks'), footer.id), false);

    await click(page, '[data-block-action=add-footer-link]'); await saved(page);
    assert.equal(await page.locator('#field-footer-label-0').inputValue(), '');
    stage = 'aperçu du lien sans intitulé';
    await preview.locator('a:not([href])').filter({hasText: 'Intitulé du lien à renseigner'}).waitFor();
    let downloads = 0; page.on('download', () => downloads++);
    await click(page, '[data-action=export-mail]');
    assert.equal(downloads, 0);
    assert.equal(await page.locator('#field-footer-label-0').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('#field-footer-label-0').evaluate(e => e === document.activeElement), true);
    assert.equal(await page.evaluate(() => MailBuilder.invalid.size), 0);
    const finalLinks = [{url: 'https://example.invalid/desabonnement-final', label: 'Se désabonner de la lettre'}, {url: 'mailto:contact@example.invalid?subject=Question', label: 'Contacter la rédaction'}];
    for (const [i, link] of finalLinks.entries()) {
      if (i) { await click(page, '[data-block-action=add-footer-link]'); await saved(page); }
      await page.locator(`#field-footer-url-${i}`).fill(link.url); await saved(page);
      await page.locator(`#field-footer-label-${i}`).fill(link.label); await saved(page);
    }
    assert.equal(await page.locator('[data-block-action=add-footer-link]').isDisabled(), true);
    stage = 'aperçu des liens finaux';
    await preview.locator('a[href]').filter({hasText: finalLinks[1].label}).waitFor();
    assert.equal(await preview.locator('a[href]').count(), 4);
    const final = await page.evaluate(() => MailBuilder.doc());
    assert.deepEqual(final.blocks.find(b => b.id === footer.id).additionalLinks, finalLinks);
    stage = 'exports JSON et HTML';
    const json = JSON.parse(await fs.readFile(await download(page, '[data-action=export-document]', 'article-texte-trois-liens.json'), 'utf8'));
    assert.deepEqual(json, final);
    const html = await fs.readFile(await download(page, '[data-action=export-mail]', 'article-texte-trois-liens.html'), 'utf8');
    assert.ok(html.includes('Un article sans illustration')); assert.ok(!/<img\b/i.test(html));
    for (const link of finalLinks) { assert.ok(html.includes(link.url)); assert.ok(html.includes(link.label)); }
    assert.ok(html.includes('S’abonner'));
    stage = 'rechargement et conservation des liens';
    await page.reload(); await page.waitForFunction(() => MailBuilder.ready); await enterEditor(page);
    assert.deepEqual(await page.evaluate(() => MailBuilder.doc()), final);
    await selectBlock(page, footer.id);
    assert.equal(await page.locator('#field-footer-label-1').inputValue(), finalLinks[1].label);
    assert.equal(await page.locator('#field-footer-url-1').inputValue(), finalLinks[1].url);
    assert.deepEqual(observations.errors, []);
    assert.ok(!observations.requests.some(url => /^https?:/.test(url)));
  } catch (cause) {
    const diagnostic = {stage, state: page && await pageState(page), active: page && await page.evaluate(() => ({id: MailBuilder.library.activeId, selected: MailBuilder.selected, name: MailBuilder.doc().name})).catch(() => null), preview: page && await page.frameLocator('#preview').locator('html').innerHTML({timeout: 1000}).catch(error => error.message)};
    await fs.mkdir(evidence, {recursive: true});
    await fs.writeFile(path.join(evidence, 'article-footer-failure.json'), JSON.stringify(diagnostic, null, 2));
    throw new Error(`${stage} : ${cause.message}`, {cause});
  } finally { await browser.close(); }
});
