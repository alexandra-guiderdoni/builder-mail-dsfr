const test = require('node:test');
const {chromium, open, expand, saved, state, assert} = require('./browser-support.cjs');
const engine = process.env.MAIL_BUILDER_ENGINE === 'webkit' ? require(process.env.PLAYWRIGHT_MODULE || 'playwright').webkit : chromium;
const RESIDUE = 'Alternative résiduelle synthétique';

test('import d’un article sans image : aucune alternative résiduelle dans le HTML, le texte ni le JSON réexporté', async () => {
  const browser = await engine.launch();
  try {
    const {page, observations} = await open(browser);
    const fixture = await page.evaluate(residue => {
      const doc = MailBuilder.Model.create('Lettre synthétique', [31, 31]), [bare, pictured] = doc.blocks;
      Object.assign(bare.values, {f0: '', f1: residue, f3: 'https://example.invalid/a', f4: 'Article sans image'});
      pictured.values.f1 = 'Alternative conservée synthétique';
      return doc;
    }, RESIDUE);
    await expand(page, 'Fichiers et récupération');
    await page.locator('#project-input').setInputFiles({name: 'synthetique.courriel.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture))});
    await saved(page);
    const imported = await state(page), doc = imported.documents.find(d => d.id === imported.activeId);
    assert.equal(doc.blocks[0].values.f1, '');
    assert.equal(doc.blocks[1].values.f1, 'Alternative conservée synthétique');
    const outputs = await page.evaluate(() => { const d = MailBuilder.doc(); return {html: MailBuilder.Render.html(d), plain: MailBuilder.Render.plain(d)}; });
    assert.ok(!outputs.html.includes(RESIDUE) && !outputs.plain.includes(RESIDUE));
    assert.ok(outputs.plain.includes('Alternative conservée synthétique'));
    assert.ok(!JSON.stringify(imported).includes(RESIDUE));
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});
