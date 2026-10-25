const test = require('node:test');
const path = require('node:path');
const {root, evidence, click, open, saved, expand, download, state, chromium, fs, assert} = require('./browser-support.cjs');
const converterURL = 'file://' + path.join(root, 'app/distribution/snum.html');

test('import JSON collé, exemple téléchargeable et refus sans perte dans le builder générique', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser, {offline: true});
    const before = await state(page); await expand(page, 'Importer du JSON');
    const examplePath = await download(page, '[data-action=example-json]', 'exemple-generique.json');
    assert.deepEqual(await state(page), before);
    const exampleText = await fs.readFile(examplePath, 'utf8');
    await page.locator('#json-input').fill(exampleText); await click(page, '[data-action=json-import]'); await saved(page);
    const imported = await state(page); assert.equal(imported.documents.length, 2);
    assert.equal(imported.documents.find(d => d.id === imported.activeId).blocks.length, 3);
    await page.locator('#json-input').fill(JSON.stringify(require('./fixtures/snum.cjs')())); await click(page, '[data-action=json-import]');
    await page.locator('#error').filter({hasText: 'Composition'}).waitFor(); assert.deepEqual(await state(page), imported);
    assert.equal(await page.locator('#snum-input').count(), 0);
  } finally { await browser.close(); }
});

test('SNUM autonome hors connexion : rubriques, JSON transporté, rendu identique et sorties périmées empêchées', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page: builder, context} = await open(browser, {offline: true, permissions: ['clipboard-read', 'clipboard-write']}), errors = [], requests = [];
    const converter = await context.newPage(); converter.on('pageerror', e => errors.push(e.message)); converter.on('request', r => requests.push(r.url()));
    await converter.goto(converterURL); assert(await converter.locator('#export-json').isDisabled());
    const packet = require('./fixtures/snum.cjs')(); await converter.locator('#snum-input').fill(JSON.stringify(packet)); await click(converter, '#convert');
    await converter.frameLocator('#preview').locator('img').first().waitFor({state: 'visible'});
    const converted = await converter.evaluate(() => JSON.parse(JSON.stringify(MailBuilder.doc())));
    assert.equal(converted.blocks.filter(b => b.component === 'mail-17').length, 5);
    assert.equal(converted.blocks.filter(b => b.component === 'mail-31').length, 5);
    const preview = converter.frameLocator('#preview');
    for (const title of ['Numérique', 'Intelligence artificielle (IA)', 'Commande publique', 'Ressources humaines', 'Bercy']) assert((await preview.locator('body').textContent()).includes(title));
    const titleSize = await preview.locator('h3 a').filter({hasText: 'Article 0'}).evaluate(e => parseFloat(getComputedStyle(e).fontSize));
    assert.equal(titleSize, 18); assert(!(await preview.locator('body').textContent()).includes(packet.watch[0].summary));
    const projectPath = await download(converter, '#export-json', 'snum-generique.json');
    const snumHTMLPath = await download(converter, '#export-html', 'snum-rendu.html');
    await expand(builder, 'Fichiers et récupération'); await builder.locator('#project-input').setInputFiles(projectPath);
    await builder.locator('#notice').filter({hasText: 'Import ajouté à la bibliothèque'}).waitFor(); await saved(builder);
    const library = await state(builder), imported = library.documents.find(d => d.id === library.activeId);
    assert.deepEqual(imported.blocks.map(b => [b.component, b.values, b.source]), converted.blocks.map(b => [b.component, b.values, b.source]));
    const builderHTMLPath = await download(builder, '[data-action=export-mail]', 'snum-apres-import.html');
    assert.equal(await fs.readFile(builderHTMLPath, 'utf8'), await fs.readFile(snumHTMLPath, 'utf8'));
    await click(converter, '#copy'); await converter.locator('#notice').filter({hasText: 'Courriel copié'}).waitFor();
    const plain = await converter.evaluate(async () => { const [item] = await navigator.clipboard.read(); return (await item.getType('text/plain')).text(); });
    assert(plain.includes(packet.articles[0].url)); assert(!plain.includes(packet.watch[0].summary));
    await converter.screenshot({path: path.join(evidence, 'snum-standalone.png'), fullPage: true});
    await converter.locator('#snum-input').fill('{'); assert(await converter.locator('#export-json').isDisabled()); await click(converter, '#convert');
    await converter.locator('#error').filter({hasText: 'JSON'}).waitFor();
    assert.deepEqual(await converter.evaluate(() => MailBuilder.doc()), converted); assert(await converter.locator('#export-html').isDisabled());
    assert.deepEqual(errors, []); assert(!requests.some(url => /^https?:/.test(url)));
    await fs.writeFile(path.join(evidence, 'separation-snum.json'), JSON.stringify({browser: browser.version(), offlineStandalone: true, rubrics: 5, articleTitles: 5, articleTitleSize: titleSize, genericJSONImported: true, importedRenderByteIdentical: true, clipboardSourcePreserved: true, watchExcluded: true, invalidInputPreservesLastConversion: true, staleExportsDisabled: true, errors}, null, 2));
  } finally { await browser.close(); }
});
