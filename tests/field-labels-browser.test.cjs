const test = require('node:test');
const {chromium, open, click, expand, saved, enterEditor, assert} = require('./browser-support.cjs');

const normalize = label => label.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');

test('les 178 champs affichés portent un libellé explicite, unique dans leur bloc', async () => {
  const browser = await chromium.launch();
  try {
    const {page, observations} = await open(browser);
    const fixture = await page.evaluate(() => MailBuilder.Model.create('Recette des libellés', MailBuilder.catalog.components.map(c => c.id)));
    await expand(page, 'Importer du JSON');
    await page.locator('#json-input').fill(JSON.stringify(fixture)); await click(page, '[data-action=json-import]'); await saved(page);
    await enterEditor(page);
    const blocks = await page.evaluate(() => MailBuilder.doc().blocks.map(b => ({id: b.id, component: b.component})));
    assert.equal(blocks.length, 52);
    const problems = [];
    let count = 0;
    for (const block of blocks) {
      await click(page, `[data-select="${block.id}"]`);
      const fields = await page.evaluate(id => MailBuilder.Model.component(id).fields.map(f => ({key: f.key, label: f.label})), block.component);
      const controls = await page.locator('#block-editor [data-field],#block-editor [data-image-field],#article-source,#article-source-label').evaluateAll(nodes => nodes.map(e => ({
        key: e.dataset.field || e.dataset.imageField || e.id, labels: [...e.labels].map(l => l.textContent.replace(/\s+/g, ' ').trim()),
      })));
      assert.deepEqual(controls.filter(c => /^f\d+$/.test(c.key)).map(c => c.key), fields.map(f => f.key), block.component);
      count += fields.length;
      const seen = new Map();
      for (const control of controls) {
        const [text = ''] = control.labels, label = normalize(text), field = fields.find(f => f.key === control.key);
        if (control.labels.length !== 1 || !label) problems.push(`${block.component} ${control.key} : ${control.labels.length} libellé(s)`);
        if (/(^|\s)\d+(?=\s|$)/.test(label)) problems.push(`${block.component} ${control.key} : libellé numéroté « ${text} »`);
        if (seen.has(label)) problems.push(`${block.component} ${control.key} : homonyme de ${seen.get(label)} « ${text} »`);
        seen.set(label, control.key);
        if (field && !(block.component === 'mail-31' && field.key === 'f0') && !label.startsWith(normalize(field.label))) problems.push(`${block.component} ${control.key} : « ${text} » masque le libellé du catalogue « ${field.label} »`);
      }
    }
    assert.equal(count, 178);
    assert.deepEqual(problems, []);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});
