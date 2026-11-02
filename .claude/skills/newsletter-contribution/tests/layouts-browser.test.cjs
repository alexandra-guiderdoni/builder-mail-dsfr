'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {loadBuilder} = require('../scripts/builder-document.cjs');
const {audit, starters} = require('../scripts/layouts.cjs');
const {fixture, normalize} = require('./catalogue-fixture.cjs');
const {throughChecks} = require('./browser-checks.cjs');
const {root} = require('./builder-root.cjs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || path.join(root, 'node_modules/playwright'));
// Preuves conservées dans NEWSLETTER_EVIDENCE si défini, sinon dans un dossier temporaire (CI du builder, #197).
const evidence = process.env.NEWSLETTER_EVIDENCE || require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(), 'newsletter-evidence-'));
const A = loadBuilder(root), coverage = audit(A);
const click = async (page, selector) => { await page.locator(selector).focus(); await page.locator(selector).press('Enter'); };
const saved = page => page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Newsletters sauvegardées dans ce navigateur.');
async function download(page, selector, name, action) {
  const event = page.waitForEvent('download');
  if (action) await throughChecks(page, action, () => click(page, selector)); else await click(page, selector);
  const file = await event, target = path.join(evidence, name);
  await file.saveAs(target); return target;
}

test('catalogue complet : départs, import, neuf familles éditées, réagencement, modèle et exports hors ligne', async () => {
  await fs.mkdir(evidence, {recursive: true, mode: 0o700});
  const browser = await chromium.launch({headless: true});
  const errors = [], requests = [], edited = [], presets = [];
  try {
    const context = await browser.newContext({offline: true, acceptDownloads: true, viewport: {width: 1440, height: 1000}});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message)); page.on('request', request => requests.push(request.url()));
    await page.goto(pathToFileURL(path.join(root, 'app/distribution/portable.html')).href);
    await page.waitForFunction(() => window.MailBuilder?.ready);
    for (const [key, indices] of Object.entries(starters(root))) {
      await page.locator('#starter').selectOption(key); await click(page, '[data-action=new-document]'); await saved(page);
      const actual = await page.evaluate(() => MailBuilder.doc().blocks.map(b => b.component));
      assert.deepEqual(actual, indices.map(n => `mail-${String(n).padStart(2, '0')}`));
      presets.push({key, blocks: actual.length}); await click(page, '#library-back');
    }
    const before = await page.evaluate(() => MailBuilder.library.documents.map(d => d.id));
    await page.locator('summary').filter({hasText: 'Sauvegarde et import'}).click();
    const source = fixture(A);
    assert.equal(source.blocks.length, 54, 'Les deux variantes facultatives doivent aussi être exercées.');
    await page.locator('#project-input').setInputFiles({name: 'recette-catalogue.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(source))});
    await page.waitForFunction(name => MailBuilder.doc().name === name, source.name); await saved(page);
    const imported = await page.evaluate(() => MailBuilder.doc());
    assert.ok(JSON.stringify(normalize(imported)) === JSON.stringify(normalize(source)), 'Import natif différent de la composition source.');
    const ids = await page.evaluate(() => MailBuilder.library.documents.map(d => d.id));
    assert.equal(ids.length, before.length + 1); for (const id of before) assert.ok(ids.includes(id));
    for (const group of coverage.families) {
      const definition = group.components.map(c => A.Model.component(c.id)).find(c => c.fields.some(f => f.type === 'text'));
      const block = imported.blocks.find(b => b.component === definition.id), field = definition.fields.find(f => f.type === 'text');
      await click(page, `[data-select="${block.id}"]`);
      const value = 'Édition de recette · ' + group.family;
      await page.locator(`#field-${field.key}`).fill(value); await saved(page);
      assert.equal(await page.evaluate(({id, key}) => MailBuilder.doc().blocks.find(b => b.id === id).values[key], {id: block.id, key: field.key}), value);
      edited.push({family: group.family, component: block.component, field: field.key});
    }
    const paragraph = imported.blocks.find(b => b.component === 'mail-19');
    await click(page, `[data-select="${paragraph.id}"]`);
    await click(page, '[data-block-action=duplicate]'); await saved(page);
    const clone = await page.evaluate(() => MailBuilder.doc().blocks.find(b => b.id === MailBuilder.selected));
    assert.notEqual(clone.id, paragraph.id);
    await click(page, '[data-block-action=up]'); await saved(page);
    assert.equal(await page.evaluate(id => MailBuilder.doc().blocks.findIndex(b => b.id === id), clone.id), imported.blocks.findIndex(b => b.id === paragraph.id));
    await click(page, '[data-block-action=down]'); await saved(page);
    await click(page, '[data-block-action=remove]'); await saved(page);
    const final = await page.evaluate(() => MailBuilder.doc()); assert.equal(final.blocks.length, 54);
    const jsonFile = await download(page, '[data-action=export-document]', 'composition-reexportee.json');
    assert.ok(JSON.stringify(JSON.parse(await fs.readFile(jsonFile, 'utf8'))) === JSON.stringify(final), 'Réexport JSON différent.');
    const htmlFile = await download(page, '[data-action=export-mail]', 'rendu-reexporte.html', 'export');
    // Le téléchargement passe par Render.exportHtml (#117), qui exige le DOM : comparé dans la page au document final relu.
    const html = await fs.readFile(htmlFile, 'utf8'); assert.equal(html, await page.evaluate(doc => MailBuilder.Render.exportHtml(doc), final));
    const models = page.locator('summary').filter({hasText: 'Mes modèles'});
    if (!(await models.evaluate(e => e.parentElement.open))) await models.click();
    await page.locator('#template-name').waitFor({state: 'visible'});
    await page.locator('#template-name').fill('Modèle de recette du catalogue');
    await click(page, '[data-action=save-template]'); await saved(page);
    await page.reload(); await page.waitForFunction(() => MailBuilder.ready);
    assert.deepEqual(await page.evaluate(() => MailBuilder.doc()), final);
    assert.equal(await page.evaluate(() => MailBuilder.library.templates.filter(t => t.name === 'Modèle de recette du catalogue').length), 1);
    const rendered = await context.newPage(), widths = [];
    for (const colorScheme of ['light', 'dark']) {
      await rendered.emulateMedia({colorScheme});
      for (const width of [1280, 390]) {
        await rendered.setViewportSize({width, height: 1000}); await rendered.setContent(html);
        const result = await rendered.evaluate(async () => {
          await Promise.all([...document.images].map(img => img.decode()));
          return {viewport: innerWidth, content: document.documentElement.scrollWidth, images: document.images.length,
            validImages: [...document.images].every(img => img.complete && img.naturalWidth > 0), links: document.querySelectorAll('a[href]').length};
        });
        assert.ok(result.validImages); assert.ok(result.content <= result.viewport + 1, JSON.stringify({colorScheme, ...result}));
        widths.push({colorScheme, ...result});
      }
    }
    assert.deepEqual(errors, []); assert.ok(!requests.some(url => /^https?:/.test(url)));
    await fs.writeFile(path.join(evidence, 'verification-navigateur.json'), JSON.stringify({status: 'PASS', browser: browser.version(),
      nativeComponents: 52, optionalVariants: 2, importedBlocks: 54, familiesEdited: edited, nativeStarters: presets,
      libraryPreserved: true, jsonReexportIdentical: true, htmlReexportIdentical: true, templatePersists: true,
      duplicatedMovedRemoved: true, widths, errors, externalRequests: 0}, null, 2));
  } finally { await browser.close(); }
});
