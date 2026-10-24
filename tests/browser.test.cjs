const test = require('node:test');
const path = require('node:path');
const {root, evidence, click, open, enterEditor, saved, expand, download, selectBlock, selectBlockEffective, focusPage, duplicateBlock, state, chromium, fs, assert} = require('./browser-support.cjs');

test('les 52 gabarits canoniques conservent le DOM officiel et le rendu dérivé porte les titres attendus', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    const official = await fs.readFile(path.join(root, 'reference/dsfr-mail/template-generique.html'), 'utf8');
    const check = await page.evaluate(source => {
      const original = new DOMParser().parseFromString(source, 'text/html');
      const sections = [...original.body.children].filter(e => e.tagName === 'TABLE');
      const shape = node => ({tag: node.tagName, attrs: [...node.attributes].filter(a => !['src', 'href', 'alt'].includes(a.name)).map(a => [a.name, a.value]).sort(), children: [...node.children].map(shape)});
      return {count: sections.length, css: original.querySelector('style').textContent === MailBuilder.catalog.css, comparisons: sections.map((section, i) => {
        const block = MailBuilder.Model.createBlock(i), definition = MailBuilder.Model.component(block.component);
        const canonical = definition.template.replace(/\{\{(f\d+)\}\}/g, (_, key) => MailBuilder.Render.escape(block.values[key]));
        const canonicalDOM = new DOMParser().parseFromString(canonical, 'text/html').body.firstElementChild;
        const rendered = new DOMParser().parseFromString(MailBuilder.Render.block(block), 'text/html').body.firstElementChild;
        const headings = [...rendered.querySelectorAll('h1,h2,h3,h4,h5,h6')], expected = definition.headings.length;
        return {id: block.component, headings: headings.length, expected, identical: JSON.stringify(shape(section)) === JSON.stringify(shape(canonicalDOM))};
      })};
    }, official);
    assert.equal(check.count, 52); assert(check.css); assert(check.comparisons.every(c => c.identical && c.headings === c.expected), JSON.stringify(check.comparisons.filter(c => !c.identical || c.headings !== c.expected)));
    await fs.mkdir(evidence, {recursive: true}); await fs.writeFile(path.join(evidence, 'catalogue-dom.json'), JSON.stringify(check, null, 2));
  } finally { await browser.close(); }
});

test('parcours complet par les contrôles : bibliothèque, identités, modèles, SNUM, image, fichiers et copie', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context, observations: {errors, requests}} = await open(browser, {offline: true, permissions: ['clipboard-read', 'clipboard-write']});
    await page.frameLocator('#preview').locator('img').first().waitFor({state: 'visible'});
    assert.equal(await page.locator('#catalogue option').count(), 52);
    await page.locator('#document-name').fill('Composition de recette');
    await page.locator('#block-editor textarea').first().fill('Service de recette');
    await expand(page, 'Mes modèles'); await page.locator('#template-name').fill('Modèle de recette'); await click(page, '[data-action=save-template]');
    await expand(page, 'Identités de service'); await page.locator('#identity-name').fill('Identité de recette'); await click(page, '[data-action=save-identity]');
    await click(page, '[data-action=library-home]'); await page.locator('#starter').selectOption('invitation'); await click(page, '[data-action=new-document]');
    await page.locator('#document-name').fill('Invitation de recette');
    await page.locator('#identities').selectOption({label: 'Identité de recette'}); await click(page, '[data-action=use-identity]');
    assert((await state(page)).documents.find(d => d.name === 'Invitation de recette').blocks.some(b => Object.values(b.values).includes('Service de recette')));
    await page.locator('#saved-templates').selectOption({label: 'Modèle de recette'}); await click(page, '[data-action=use-template]');
    const packetText = process.env.SNUM_RECIPE_PACKET ? await fs.readFile(process.env.SNUM_RECIPE_PACKET, 'utf8') : JSON.stringify(require('./fixtures/snum.cjs')()), packet = JSON.parse(packetText);
    const converter = await context.newPage(); await converter.goto('file://' + path.join(root, 'app/distribution/snum.html'));
    await converter.locator('#snum-input').fill(packetText); await click(converter, '#convert');
    const converted = await download(converter, '#export-json', 'snum.composition.courriel.json');
    await expand(page, 'Fichiers et récupération'); await page.locator('#project-input').setInputFiles(converted);
    await page.locator('#notice').filter({hasText: 'Import ajouté à la bibliothèque'}).waitFor(); await saved(page);
    const articleId = await page.evaluate(url => MailBuilder.doc().blocks.find(b => b.source === url).id, packet.articles[0].url);
    await focusPage(page); await selectBlockEffective(page, articleId); await page.locator('#block-editor textarea').first().fill('Titre <script>window.injected=1</script>');
    await duplicateBlock(page);
    const order = await page.evaluate(() => MailBuilder.doc().blocks.map(b => b.id)), selected = await page.evaluate(() => MailBuilder.selected);
    await click(page, '[data-block-action=up]'); await saved(page);
    assert.equal(await page.evaluate(id => MailBuilder.doc().blocks.findIndex(b => b.id === id), selected), order.indexOf(selected) - 1);
    await click(page, '[data-block-action=down]'); await saved(page);
    assert.deepEqual(await page.evaluate(() => MailBuilder.doc().blocks.map(b => b.id)), order);
    await duplicateBlock(page);
    assert.equal(await page.evaluate(() => MailBuilder.doc().blocks.length), order.length + 1);
    await click(page, '[data-block-action=remove]'); await saved(page);
    assert.deepEqual(await page.evaluate(() => MailBuilder.doc().blocks.map(b => b.id)), order);
    await expand(page, 'Ajouter un composant'); await page.locator('#catalogue').selectOption('mail-29'); await click(page, '[data-action=add-block]');
    await page.locator('[data-image-field]').first().setInputFiles(path.join(root, 'app/assets/icon-192.png'));
    await page.locator('#notice').filter({hasText: 'Image locale incorporée'}).waitFor();
    await saved(page);
    await expand(page, 'Fichiers et récupération');
    const projectPath = await download(page, '[data-action=export-document]', 'composition.courriel.json');
    const libraryPath = await download(page, '[data-action=export-library]', 'bibliotheque.courriels.json');
    const mailPath = await download(page, '[data-action=export-mail]', 'courriel.html');
    const project = JSON.parse(await fs.readFile(projectPath, 'utf8')), lib = JSON.parse(await fs.readFile(libraryPath, 'utf8')), html = await fs.readFile(mailPath, 'utf8');
    const image = (await fs.readFile(path.join(root, 'app/assets/icon-192.png'))).toString('base64');
    assert(JSON.stringify(project).includes(image)); assert(html.includes(image)); assert(!/<script[\s>]/i.test(html));
    assert(html.includes('&lt;script&gt;')); assert.equal(lib.templates.length, 1); assert.equal(lib.identities.length, 1); assert.equal(lib.documents.length, 4);
    await click(page, '[data-action=copy]'); await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
    const clipboard = await page.evaluate(async () => { const [item] = await navigator.clipboard.read(); return {types: item.types, html: await (await item.getType('text/html')).text(), plain: await (await item.getType('text/plain')).text()}; });
    assert.equal(clipboard.plain.split(packet.articles[0].url).length - 1, 2); assert(clipboard.html.includes('data:image/png;base64,')); assert(!clipboard.plain.includes(packet.watch[0].summary));
    const before = await state(page), bad = {...project, version: 99};
    const badPath = path.join(evidence, 'invalid-application.json'); await fs.writeFile(badPath, JSON.stringify(bad)); await page.locator('#project-input').setInputFiles(badPath);
    await page.locator('#error').filter({hasText: 'Version de composition'}).waitFor(); assert.deepEqual(await state(page), before);
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready); assert.equal((await state(page)).documents.length, 4);
    const fresh = await open(browser, {offline: true}); await expand(fresh.page, 'Fichiers et récupération'); await fresh.page.locator('#project-input').setInputFiles(libraryPath); await saved(fresh.page);
    const restored = await state(fresh.page); assert.equal(restored.documents.length, 5); assert.equal(restored.templates.length, 1); assert.equal(restored.identities.length, 1); assert(JSON.stringify(restored).includes(image));
    await focusPage(page); await enterEditor(page); await page.frameLocator('#preview').locator('img').first().waitFor({state: 'visible'});
    await page.screenshot({path: path.join(evidence, 'bibliotheque-verifiee.png'), fullPage: true});
    assert.deepEqual(errors, []); assert(!requests.some(url => /^https?:/.test(url)));
    await fs.writeFile(path.join(evidence, 'parcours-chromium.json'), JSON.stringify({browser: browser.version(),offlinePortable: true,documents: lib.documents.length,templates: lib.templates.length,identities: lib.identities.length,blockMoveAndRemoval: true,clipboardTypes: clipboard.types,sourceCopiesInPlain: 2,imageRestored: true,errors}, null, 2));
    await context.close();
  } finally { await browser.close(); }
});
