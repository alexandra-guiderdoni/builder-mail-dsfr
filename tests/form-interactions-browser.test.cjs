const test = require('node:test');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {root, evidence, open, click, enterEditor, expand, saved, state, chromium, nativeAx, nativeAxNode, fs, assert} = require('./browser-support.cjs');
const directory = path.join(evidence, 'form-interactions');
const doc = page => page.evaluate(() => JSON.parse(JSON.stringify(MailBuilder.doc())));

async function receipt(name, observations, completed) {
  await fs.mkdir(directory, {recursive: true});
  const files = ['app/source/view.js', 'app/source/shell.html', 'app/source/model.js', 'app/source/editor.js', 'app/source/library.js', 'app/distribution/portable.html', 'app/distribution/web/index.html'];
  const hashes = Object.fromEntries(await Promise.all(files.map(async file => [file, createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex')])));
  await fs.writeFile(path.join(directory, name + '.json'), JSON.stringify({method: 'Interactions dans la distribution portable réelle, CSP conservée, profil neuf', completed, screenReaderExecuted: false, humanQualification: false, sourceSha256: hashes, observations}, null, 2));
}

async function field(page, selector, native = false) {
  const result = await page.locator(selector).evaluate(e => ({id: e.id, visible: e.checkVisibility(), value: e.value,
    labels: [...e.labels].map(l => ({text: l.textContent.trim(), visible: l.checkVisibility()})),
    required: e.getAttribute('aria-required'), invalid: e.getAttribute('aria-invalid'), focused: e === document.activeElement,
    descriptions: (e.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => {
      const n = document.getElementById(id); return {id, text: n?.textContent, visible: n?.checkVisibility()};
    })}));
  if (native) {
    // Natif sous Chromium (CDP) ; ailleurs, la même propriété se lit sur les attributs ARIA et le focus du DOM, vrais dans tous les moteurs.
    const ax = await nativeAxNode(page, selector);
    if (nativeAx) { assert(ax && !ax.ignored, 'Le contrôle doit être exposé dans l’arbre natif.'); result.ax = ax; }
    result.exposed = {required: ax ? !!ax.properties?.some(p => p.name === 'required' && p.value.value === true) : result.required === 'true', focused: ax ? !!ax.properties?.some(p => p.name === 'focused' && p.value.value === true) : result.focused, source: ax ? 'arbre natif (CDP)' : 'DOM et ARIA'};
  }
  return result;
}

async function catalogue(page) {
  const fixture = await page.evaluate(() => MailBuilder.Model.create('Recette des champs', MailBuilder.catalog.components.map(c => c.id)));
  await expand(page, 'Importer du JSON');
  await page.locator('#json-input').fill(JSON.stringify(fixture)); await click(page, '[data-action=json-import]'); await saved(page);
  await enterEditor(page);
  return (await doc(page)).blocks;
}

test('les contraintes obligatoires sont visibles et exposées pour le nom et les 13 URL du catalogue', async () => {
  const browser = await chromium.launch(), observations = [];
  let completed = false;
  try {
    const {page} = await open(browser);
    observations.push({scope: 'document-name', ...await field(page, '#document-name', true)});
    const blocks = await catalogue(page);
    for (const block of blocks) {
      await click(page, `[data-select="${block.id}"]`);
      const fields = await page.evaluate(id => MailBuilder.Model.component(id).fields, block.component);
      const labels = await page.locator('#block-editor input,#block-editor textarea').evaluateAll(nodes => nodes.map(e => ({id: e.id, type: e.type, field: e.dataset.field || e.dataset.imageField,
        visible: e.checkVisibility(), labels: [...e.labels].map(l => ({text: l.textContent.trim(), visible: l.checkVisibility()}))})));
      assert(labels.every(e => e.visible && e.labels.length === 1 && e.labels[0].visible && e.labels[0].text), block.component);
      assert.deepEqual(labels.filter(e => e.field).map(e => e.field).sort(), fields.map(f => f.key).sort(), 'Chaque champ attendu possède son contrôle rendu.');
      observations.push({scope: block.component, fieldCount: fields.length, labels});
      for (const f of fields.filter(f => f.type === 'url')) observations.push({scope: block.component, key: f.key, ...await field(page, `#field-${f.key}`, true)});
      assert.equal(await page.locator('#article-source').getAttribute('aria-required'), null, 'La source reste facultative.');
      assert.equal(await page.locator('#article-source-label').getAttribute('aria-required'), null);
    }
    const required = observations.filter(o => o.exposed);
    assert.equal(blocks.length, 52); assert.equal(observations.filter(o => o.fieldCount !== undefined).reduce((n, o) => n + o.fieldCount, 0), 178);
    assert.equal(required.length, 14);
    const missing = required.filter(o => o.required !== 'true' || !o.labels.some(l => l.visible && /obligatoire/i.test(l.text)) || !o.exposed.required);
    assert.deepEqual(missing.map(o => [o.scope, o.id]), [], 'Les contraintes doivent être prévisibles avant la saisie.');
    completed = true;
  } finally { await receipt('constraints', observations, completed); await browser.close(); }
});

test('les erreurs réelles des 13 URL, du nom et de la source conservent les données puis permettent la correction', async () => {
  const browser = await chromium.launch(), observations = [];
  let completed = false;
  try {
    const {page} = await open(browser);
    const blocks = await catalogue(page);
    for (const block of blocks) {
      const urls = await page.evaluate(id => MailBuilder.Model.component(id).fields.filter(f => f.type === 'url'), block.component);
      if (!urls.length) continue;
      await click(page, `[data-select="${block.id}"]`);
      for (const f of urls) {
        const selector = `#field-${f.key}`, before = await doc(page);
        for (const value of ['', 'http://exemple.invalid/', 'https://recette:synthetique@exemple.invalid/']) {
          await page.locator(selector).fill(value);
          if (value === '') assert.equal(await page.locator(selector).getAttribute('aria-invalid'), null, 'Aucune erreur pendant la frappe.');
          await page.locator(selector).blur();
          const current = await field(page, selector, true), expectedError = value === '' ? /incomplète/ : value.startsWith('http:') ? /Protocole interdit/ : /Identifiants interdits/;
          assert.equal(current.invalid, 'true'); assert(current.descriptions.some(d => d.visible && expectedError.test(d.text)));
          assert.deepEqual(await doc(page), before, 'Une saisie refusée ne remplace pas le document valide.');
          observations.push({scope: block.component, key: f.key, step: 'rejected', ...current});
        }
        const corrected = `https://exemple.invalid/correction/${block.component}/${f.key}`;
        await page.locator(selector).fill(corrected); await saved(page);
        const current = await field(page, selector, true), expected = structuredClone(before);
        expected.blocks.find(b => b.id === block.id).values[f.key] = corrected;
        assert.deepEqual(await doc(page), expected); assert.equal(current.invalid, null); assert.deepEqual(current.descriptions, []);
        observations.push({scope: block.component, key: f.key, step: 'corrected', ...current});
      }
    }
    const beforeName = await doc(page);
    for (const value of ['', '   ']) {
      await page.locator('#document-name').fill(value);
      const current = await field(page, '#document-name', true);
      assert.equal(current.invalid, 'true'); assert(current.descriptions.some(d => d.visible && /nom/.test(d.text)));
      assert.deepEqual(await doc(page), beforeName); observations.push({step: 'name-rejected', ...current});
    }
    await page.locator('#document-name').fill('Composition corrigée'); await saved(page);
    const correctedName = await field(page, '#document-name', true), expectedName = structuredClone(beforeName);
    expectedName.name = 'Composition corrigée';
    assert.deepEqual(await doc(page), expectedName); assert.equal(correctedName.invalid, null); assert.deepEqual(correctedName.descriptions, []);
    observations.push({step: 'name-corrected', ...correctedName});
    await page.locator('#subject').fill(''); await saved(page); assert.equal((await doc(page)).subject, '');
    const sourceBlock = blocks.find(b => b.component === 'mail-19');
    await click(page, `[data-select="${sourceBlock.id}"]`);
    const beforeSource = await doc(page);
    for (const value of ['http://exemple.invalid/', 'https://recette:synthetique@exemple.invalid/', 'adresse-incomplete']) {
      await page.locator('#article-source').fill(value); await page.locator('#article-source').blur();
      const current = await field(page, '#article-source', true), expectedError = value.startsWith('http:') ? /Protocole interdit/ : value.includes('@') ? /Identifiants interdits/ : /incomplète/;
      assert.equal(current.invalid, 'true'); assert(current.descriptions.some(d => d.visible && expectedError.test(d.text)));
      assert.deepEqual(await doc(page), beforeSource); observations.push({step: 'optional-source-rejected', ...current});
      assert.equal(await page.locator('#article-source-label').getAttribute('aria-describedby'), 'source-label-help');
    }
    for (const value of ['https://exemple.invalid/source', '']) {
      await page.locator('#article-source').fill(value); await saved(page);
      const current = await field(page, '#article-source', true);
      assert.equal(current.invalid, null); assert.deepEqual(current.descriptions, []);
      assert.equal((await doc(page)).blocks.find(b => b.id === sourceBlock.id).source, value);
      observations.push({step: 'optional-source-accepted', ...current});
    }
    assert.equal(await page.locator('[data-field-error]').count(), 0);
    const persisted = await doc(page); await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.deepEqual(await doc(page), persisted); observations.push({step: 'reload', documentRestored: true});
    completed = true;
  } finally { await receipt('validation', observations, completed); await browser.close(); }
});

test('renommage : rejet du vide, correction, annulations et retour du focus sont observés séparément', async () => {
  const browser = await chromium.launch(), observations = [];
  let completed = false;
  try {
    const {page} = await open(browser); await click(page, '[data-action=library-home]');
    const before = await state(page), id = before.activeId, button = `[data-document="${id}"] [data-library-action=rename]`;
    const focusReturned = async step => {
      await page.waitForFunction(selector => document.activeElement === document.querySelector(selector), button);
      const current = await field(page, button, true);
      assert.equal(current.focused, true); assert(current.exposed.focused);
      observations.push({step, ...current});
    };
    await click(page, button);
    for (const value of ['', '   ']) {
      await page.locator('#library-name').fill(value); await click(page, '#library-confirm');
      const current = await field(page, '#library-name', true);
      assert.equal(current.invalid, 'true'); assert.equal(current.focused, true);
      assert(current.descriptions.some(d => d.id === 'library-dialog-error' && d.visible && /Renseignez un nom/.test(d.text)));
      assert(current.exposed.focused);
      assert(await page.locator('#library-dialog').evaluate(e => e.open)); assert.deepEqual(await state(page), before);
      observations.push({step: 'rename-rejected', ...current});
    }
    await page.locator('#library-name').fill('Nom corrigé'); await click(page, '#library-confirm'); await saved(page);
    assert.equal(await page.locator('#library-dialog').evaluate(e => e.open), false);
    const expected = structuredClone(before); expected.documents.find(d => d.id === id).name = 'Nom corrigé';
    assert.deepEqual(await state(page), expected); await focusReturned('rename-saved');
    for (const cancel of ['button', 'Escape']) {
      await click(page, button);
      const reopened = await field(page, '#library-name', true);
      assert.equal(reopened.invalid, null); assert(reopened.descriptions.every(d => !d.text));
      assert.equal(reopened.focused, true); observations.push({step: 'reopened-' + cancel, ...reopened});
      await page.locator('#library-name').fill('Modification annulée');
      if (cancel === 'button') await click(page, '#library-cancel'); else await page.keyboard.press('Escape');
      assert.deepEqual(await state(page), expected); await focusReturned('cancel-' + cancel);
    }
    completed = true;
  } finally { await receipt('rename', observations, completed); await browser.close(); }
});
