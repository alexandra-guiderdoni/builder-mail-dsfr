const test = require('node:test');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {root, evidence, open, click, enterEditor, expand, saved, state, download, confirmChecks, chromium, nativeAx, nativeAxTree, nativeAxNode, fs, assert} = require('./browser-support.cjs');
const pairs = [[1, 'f2'], [31, 'f4'], [33, 'f3'], [40, 'f1'], [41, 'f1'], [42, 'f1'], [43, 'f1'], [43, 'f3'], [45, 'f3'], [47, 'f2'], [48, 'f2'], [49, 'f2'], [50, 'f2']];
const directory = path.join(evidence, 'link-labels');
async function receipt(name, observations, completed) {
  await fs.mkdir(directory, {recursive: true});
  const files = ['scripts/catalogue.py', 'app/source/render.js', 'app/source/view.js', 'app/source/editor.js', 'app/source/files.js', 'app/snum/page.js', 'app/distribution/portable.html', 'app/distribution/web/index.html', 'app/distribution/snum.html'];
  const sourceSha256 = Object.fromEntries(await Promise.all(files.map(async file => [file, createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex')])));
  await fs.writeFile(path.join(directory, name + '.json'), JSON.stringify({completed, method: 'Distribution réelle, CSP conservée, profil neuf ; AX natif Chromium', screenReaderExecuted: false, humanQualification: false, sourceSha256, observations}, null, 2));
}
async function field(page, key) {
  const selector = '#field-' + key;
  const current = await page.locator(selector).evaluate(e => ({value: e.value, invalid: e.getAttribute('aria-invalid'), required: e.getAttribute('aria-required'), focused: e === document.activeElement,
    labels: [...e.labels].map(l => l.textContent.trim()), descriptions: (e.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => ({id, text: document.getElementById(id)?.textContent, visible: document.getElementById(id)?.checkVisibility()}))}));
  // Natif sous Chromium (CDP) ; ailleurs, aria-required du DOM, vrai dans tous les moteurs.
  const ax = await nativeAxNode(page, selector);
  if (nativeAx) assert(ax, 'Le champ doit figurer dans l’arbre natif.');
  current.exposedRequired = ax ? !!ax.properties?.some(p => p.name === 'required' && p.value.value === true) : current.required === 'true';
  if (ax) current.ax = ax;
  return current;
}
async function imported(page, fixture, file = false) {
  await expand(page, 'Importer du JSON');
  if (file) await page.locator('#project-input').setInputFiles({name: 'ancienne-bibliotheque.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture))});
  else { await page.locator('#json-input').fill(JSON.stringify(fixture)); await click(page, '[data-action=json-import]'); }
  await saved(page); await enterEditor(page);
}

test('les 13 intitulés sont prévisibles, refusent le vide sans perte puis se corrigent', async () => {
  const browser = await chromium.launch(), observations = []; let completed = false;
  try {
    const {page} = await open(browser);
    await imported(page, await page.evaluate(() => MailBuilder.Model.create('Contrôle des intitulés', MailBuilder.catalog.components.map(c => c.id))));
    for (const [number, key] of pairs) {
      const lib = await state(page), doc = lib.documents.find(d => d.id === lib.activeId), block = doc.blocks.find(b => b.component === `mail-${String(number).padStart(2, '0')}`);
      await click(page, `[data-select="${block.id}"]`);
      const before = await state(page), initial = await field(page, key);
      assert.equal(initial.required, 'true'); assert(initial.labels.some(s => /intitulé.*obligatoire/i.test(s)));
      assert(initial.exposedRequired);
      for (const value of ['', ' \n\t ']) {
        await page.locator('#field-' + key).fill(value);
        const current = await field(page, key); observations.push({component: block.component, key, step: 'rejected', ...current});
        assert.equal(current.invalid, 'true'); assert(current.descriptions.some(d => d.visible && /intitulé/i.test(d.text)));
        assert.deepEqual(await state(page), before); assert.equal(await page.evaluate(() => MailBuilder.invalid.size), 1);
      }
      await page.locator('#field-' + key).fill('Lire le dossier corrigé'); await saved(page);
      const current = await field(page, key); observations.push({component: block.component, key, step: 'corrected', ...current});
      assert.equal(current.invalid, null); assert.deepEqual(current.descriptions, []); assert.equal(await page.evaluate(() => MailBuilder.invalid.size), 0);
    }
    completed = true;
  } finally { await receipt('edited-fields', observations, completed); await browser.close(); }
});

test('un ancien JSON reste récupérable et corrigeable ; les sorties attendent tous les intitulés', async () => {
  const browser = await chromium.launch(), observations = []; let completed = false;
  try {
    const {page} = await open(browser);
    const fixture = await page.evaluate(pairs => {
      const M = MailBuilder.Model, lib = M.initial(), doc = M.create('Ancien JSON à réparer', [19, ...new Set(pairs.map(p => p[0]))]);
      for (const [n, key] of pairs) doc.blocks.find(b => b.component === `mail-${String(n).padStart(2, '0')}`).values[key] = '';
      lib.documents.push(doc); lib.activeId = doc.id; lib.templates.push(M.clone(doc));
      lib.identities.push({id: M.id(), name: 'Identité à réparer', blocks: M.copy(doc.blocks.filter(b => [1, 47].some(n => b.component === `mail-${String(n).padStart(2, '0')}`)))});
      return lib;
    }, pairs);
    await imported(page, fixture, true);
    const original = await state(page), currentDoc = () => original.documents.find(d => d.id === original.activeId);
    const previewBody = page.frameLocator('#preview').locator('body');
    await previewBody.locator('a:not([href])').filter({hasText: 'Intitulé du lien à renseigner'}).first().waitFor();
    const preview = await previewBody.evaluate(body => ({placeholders: [...body.querySelectorAll('a:not([href])')].filter(a => a.textContent.includes('Intitulé du lien à renseigner')).length,
      emptyLinks: [...body.querySelectorAll('a[href]')].filter(a => !a.textContent.trim()).length,
      activablePlaceholders: [...body.querySelectorAll('a:not([href])')].filter(a => { a.focus(); return body.ownerDocument.activeElement === a || a.hasAttribute('tabindex') || a.getAttribute('role') === 'link' || [...a.attributes].some(v => v.name.startsWith('on')); }).length}));
    assert.deepEqual(preview, {placeholders: 13, emptyLinks: 0, activablePlaceholders: 0});
    const previewFrame = page.frames().find(f => f.parentFrame() && f.url().startsWith('blob:'));
    const nodes = await nativeAxTree(page.context(), previewFrame);
    if (nodes) { assert(nodes.some(n => !n.ignored && n.name?.value.includes('Intitulé du lien à renseigner'))); assert.equal(nodes.filter(n => !n.ignored && n.role?.value === 'link').length, 0); }
    else { const outline = await previewFrame.locator('body').ariaSnapshot(); assert(outline.includes('Intitulé du lien à renseigner')); assert.equal(outline.split('\n').filter(l => /^\s*- link\b/.test(l)).length, 0); }
    observations.push({step: 'legacy-preview', ...preview, ...(nodes ? {nativeAXLinks: 0, nativeAXPlaceholderObserved: true} : {ariaSnapshotLinks: 0, ariaSnapshotPlaceholderObserved: true}), sandbox: await page.locator('#preview').getAttribute('sandbox')});
    assert.equal(await page.evaluate(() => MailBuilder.invalid.size), 0);
    await page.reload(); await page.waitForFunction(() => MailBuilder.ready); await enterEditor(page); assert.deepEqual(await state(page), original);
    await expand(page, 'Fichiers et récupération');
    const json = JSON.parse(await fs.readFile(await download(page, '[data-action=export-library]', 'ancienne-bibliotheque.json'), 'utf8'));
    assert.deepEqual(json, original); observations.push({step: 'import-reload-json', libraryPreserved: true, pendingInvalid: 0});
    let downloads = 0; page.on('download', () => downloads++);
    await page.evaluate(() => { window.clipboardWrites = 0; Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {write: async () => { window.clipboardWrites++; }}}); });
    for (const action of ['export-mail', 'copy']) {
      await click(page, `[data-select="${currentDoc().blocks[0].id}"]`); await click(page, `[data-action=${action}]`);
      const current = await field(page, 'f2'); observations.push({step: action + '-blocked', ...current});
      assert.equal(current.invalid, 'true'); assert(current.focused); assert(current.descriptions.some(d => /intitulé/i.test(d.text)));
      assert.equal(await page.evaluate(() => MailBuilder.invalid.size), 0); assert.deepEqual(await state(page), original);
    }
    assert.equal(downloads, 0); assert.equal(await page.evaluate(() => window.clipboardWrites), 0);
    await click(page, '[data-action=cancel-fields]'); assert.equal(await page.locator('[data-field-error]').count(), 0);
    await click(page, '[data-action=export-mail]'); assert.equal((await field(page, 'f2')).invalid, 'true'); assert.equal(downloads, 0);
    for (const [number, key] of pairs) {
      const block = currentDoc().blocks.find(b => b.component === `mail-${String(number).padStart(2, '0')}`);
      await click(page, `[data-select="${block.id}"]`); await page.locator('#field-' + key).fill('Lire le dossier réparé'); await saved(page);
    }
    assert.equal(await page.evaluate(() => MailBuilder.Render.linkIssues(MailBuilder.doc()).length), 0);
    await previewBody.locator('a[href]').first().waitFor();
    const restored = await previewBody.locator('a[href]').evaluateAll(nodes => nodes.map(a => ({label: a.textContent, url: a.getAttribute('href')})));
    const expectedURLs = await page.evaluate(() => MailBuilder.doc().blocks.flatMap(b => MailBuilder.Model.component(b.component).links.map(l => b.values[l.url])));
    assert.deepEqual(restored.map(a => a.url), expectedURLs); assert(restored.every(a => a.label.trim() === 'Lire le dossier réparé'));
    const html = await fs.readFile(await download(page, '[data-action=export-mail]', 'courriel-repare.html'), 'utf8');
    assert(html.includes('Lire le dossier réparé')); await click(page, '[data-action=copy]'); await confirmChecks(page);
    assert.equal(await page.evaluate(() => window.clipboardWrites), 1); assert.equal(await page.locator('[data-field-error]').count(), 0);
    observations.push({step: 'progressive-repair', repaired: 13, htmlDownloaded: true, clipboardWrites: 1});
    // L’autre voie d’import accepte aussi ces anciennes données sans imposer leur correction globale.
    await imported(page, fixture); assert.equal(await page.evaluate(() => MailBuilder.Render.linkIssues(MailBuilder.doc()).length), 13);
    completed = true;
  } finally { await receipt('legacy-output', observations, completed); await browser.close(); }
});

test('SNUM : la garde commune refuse une sortie altérée et conserve la récupération JSON', async () => {
  const browser = await chromium.launch(), observations = []; let completed = false;
  try {
    const context = await browser.newContext({acceptDownloads: true}), page = await context.newPage();
    await page.goto('file://' + path.join(root, 'app/distribution/snum.html')); await page.waitForFunction(() => MailBuilder.ready);
    // Contrôle négatif injecté à la frontière du convertisseur, sans prétendre reproduire une collecte normale.
    await page.evaluate(() => { const M = MailBuilder.Model, doc = M.create('Sortie altérée', [40]); doc.blocks[0].values.f1 = ''; MailBuilder.SnumAdapter = {convert: () => ({document: doc, notice: 'Contrôle négatif'})}; });
    await page.locator('#snum-input').fill('{}'); await click(page, '#convert');
    let downloads = 0; page.on('download', () => downloads++);
    for (const selector of ['#export-html', '#copy']) { await click(page, selector); assert.match(await page.locator('#error').textContent(), /JSON.*builder/); }
    assert.equal(downloads, 0);
    const recovered = JSON.parse(await fs.readFile(await download(page, '#export-json', 'snum-reparation.json'), 'utf8'));
    assert.equal(recovered.blocks[0].values.f1, ''); assert.equal(await page.locator('#preview').isVisible(), true);
    observations.push({step: 'injected-negative-converter-output', htmlBlocked: true, copyBlocked: true, jsonRecovered: true}); completed = true;
  } finally { await receipt('snum-negative', observations, completed); await browser.close(); }
});
