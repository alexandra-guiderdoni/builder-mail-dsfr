const test = require('node:test');
const {chromium, open, click, expand, saved, state, store, assert} = require('./browser-support.cjs');
const DRAFT = 'https://exemple.invalid/ brouillon pied à conserver';
const CORRECTED = 'https://exemple.invalid/pied-corrige';
async function downloadJson(page, selector) {
  const pending = page.waitForEvent('download'); pending.then(() => {}, () => {});
  await click(page, selector); const download = await pending, chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
for (const [name, draftIndex, removedIndex] of [['précédent conservé', 0, 1], ['suivant remappé', 1, 0]]) {
  test(`pied de page : brouillon ${name} après retrait de l'autre lien, sorties toujours gardées`, async () => {
    const browser = await chromium.launch();
    try {
      const {page} = await open(browser);
      const json = await page.evaluate(() => {
        const A = MailBuilder, index = A.catalog.components.findIndex(c => c.id === 'mail-50');
        const doc = A.Model.create('Pied avec deux liens', [index]);
        doc.blocks[0].additionalLinks = [{url: 'https://exemple.invalid/premier', label: 'Premier lien valide'}, {url: 'https://exemple.invalid/second', label: 'Second lien valide'}];
        return JSON.stringify(doc);
      });
      await expand(page, 'Fichiers et récupération');
      await page.getByLabel('Importer une composition ou une bibliothèque JSON', {exact: true}).setInputFiles({name:'pied-deux-liens.courriel.json',mimeType:'application/json',buffer:Buffer.from(json)});
      await page.locator('#document-name').waitFor({state:'visible'});
      await page.waitForFunction(() => MailBuilder.doc().name === 'Pied avec deux liens'); await saved(page);
      await page.locator(`#field-footer-url-${draftIndex}`).fill(DRAFT);
      await page.waitForFunction(value => [...MailBuilder.drafts.values()].some(d => d.value === value), DRAFT);
      const before = await page.evaluate(() => ({doc:MailBuilder.doc().id,block:MailBuilder.selected}));
      await click(page, `[data-block-action=remove-footer-link][data-footer-link-index="${removedIndex}"]`);
      await page.waitForFunction(() => MailBuilder.doc().blocks.find(b=>b.id===MailBuilder.selected).additionalLinks.length === 1 && MailBuilder.State.saved());
      assert.equal(await page.locator('#field-footer-url-0').inputValue(), DRAFT, 'la vraie saisie survivante reste affichée');
      const drafts = await page.evaluate(() => [...MailBuilder.drafts.values()]);
      assert.equal(drafts.length, 1);
      assert.deepEqual({doc:drafts[0].doc,block:drafts[0].block,input:drafts[0].input,value:drafts[0].value}, {...before,input:'field-footer-url-0',value:DRAFT});
      const downloads = []; page.on('download', item => downloads.push(item.suggestedFilename()));
      for (const selector of ['[data-action=export-mail]', '[data-action=export-document]']) {
        if (selector.includes('export-document')) await expand(page, 'Fichiers et récupération');
        await click(page, selector);
        await page.locator('#error').filter({hasText:/Corrigez ce lien/}).waitFor();
        assert.equal(await page.locator('#field-footer-url-0').inputValue(), DRAFT);
        assert.equal(await page.locator('#field-footer-url-0').getAttribute('aria-invalid'), 'true');
        assert.equal(await page.locator('#check-dialog').evaluate(e=>e.open), false, 'la diffusion est refusée avant la confirmation');
        assert.deepEqual(downloads, [], 'aucune sortie normale produite pendant le brouillon');
      }
      const memory = await state(page), record = await store(page);
      assert(!JSON.stringify(memory).includes(DRAFT)); assert(!JSON.stringify(record).includes(DRAFT));
      await expand(page, 'Fichiers et récupération');
      const raw = await downloadJson(page, '[data-action=export-stored]');
      assert.deepEqual(raw, record); assert(!JSON.stringify(raw).includes(DRAFT), 'le vrai téléchargement brut reste un modèle valide');
      await page.locator('#field-footer-url-0').fill(CORRECTED); await saved(page);
      assert.equal(await page.evaluate(()=>MailBuilder.drafts.size), 0);
      const exported = await downloadJson(page, '[data-action=export-document]');
      assert.equal(exported.blocks[0].additionalLinks[0].url, CORRECTED);
      assert(!JSON.stringify(exported).includes(DRAFT));
    } finally { await browser.close(); }
  });
}
