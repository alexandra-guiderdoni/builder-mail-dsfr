const test = require('node:test');
const {chromium, open, click, assert} = require('./browser-support.cjs');
const fixtures = require('./fixtures/weight-compositions.cjs');

test('#191 : trois compositions, deux sorties, sommes exactes et champs pertinents', async () => {
  const browser = await chromium.launch();
  try {
    const {page, observations} = await open(browser, {offline: true});
    const values = await page.evaluate(fixtures);
    for (const [name, value] of Object.entries(values)) {
      const result = await page.evaluate(value => {
        const {Render: R, Files: F, Checks: C} = MailBuilder;
        return ['copy', 'export'].map(action => {
          const html = action === 'copy' ? R.clipboardHtml(value) : R.exportHtml(value), weight = {...R.weightDetails(html, value), action};
          const parsed = new DOMParser().parseFromString(html, 'text/html'), images = [...parsed.images].filter(img => img.getAttribute('src').startsWith('data:'));
          return {action, weight, actual: new TextEncoder().encode(html).length,
            styles: [...parsed.querySelectorAll('style')].reduce((sum, style) => sum + new TextEncoder().encode(style.textContent).length, 0),
            images: images.reduce((sum, img) => sum + new TextEncoder().encode(img.getAttribute('src')).length, 0),
            occurrences: images.length, distinct: new Set(images.map(img => img.getAttribute('src'))).size,
            warning: C.warnings(value, weight).find(w => w.rule === 'weight'), summary: F.weightSummary(weight, action), detail: F.weightText(weight, action)};
        });
      }, value);
      for (const item of result) {
        const {weight: w} = item;
        assert.equal(w.bytes, item.actual); assert.equal(w.parts.styles + w.parts.images + w.parts.other, w.bytes);
        assert.equal(w.parts.styles, item.styles); assert.equal(w.parts.images, item.images);
        assert.equal(w.occurrences, item.occurrences); assert.equal(w.distinct, item.distinct);
        assert.ok(item.detail.includes(item.actual.toLocaleString('fr-FR') + ' octets'));
        assert.match(item.summary, item.action === 'copy' ? /pour la copie/ : /pour le téléchargement/);
        assert.match(item.detail, /poids reçu n’est pas mesuré/);
        if (name === 'normal') { assert.equal(w.occurrences, 4); assert.equal(w.distinct, 2); assert.equal(w.variants, true); }
        else {
          assert.equal(w.dominant, name === 'text' ? 'other' : 'images');
          assert.ok(name === 'text' ? w.parts.images / w.bytes < .15 : w.parts.images / w.bytes > .5, JSON.stringify({name, action: item.action, parts:w.parts, bytes:w.bytes}));
          assert.equal(item.warning.field, w.target.field); assert.equal(item.warning.block, w.target.block);
          const block = value.blocks.find(b => b.id === w.target.block);
          const fieldType = await page.evaluate(({block, field}) => MailBuilder.Model.component(block.component).fields.find(f => 'field-' + f.key === field).type, {block, field: w.target.field});
          assert.equal(fieldType, name === 'text' ? 'text' : 'image');
          if (name === 'text') assert.doesNotMatch(item.summary + item.detail + item.warning.message, /allége.*image/i);
          else assert.match(item.warning.message, /Image incorporée la plus lourde/);
          assert.match(item.warning.message, item.action === 'copy' ? /pour la copie/ : /pour le téléchargement/);
        }
      }
      await page.evaluate(value => MailBuilder.State.change(lib => { const doc = lib.documents.find(d => d.id === lib.activeId); doc.blocks = value.blocks; }), value);
      await page.waitForFunction(() => document.getElementById('mail-weight').dataset.bytes === String(MailBuilder.Render.weight(MailBuilder.Render.clipboardHtml(MailBuilder.doc())).bytes));
      if (name !== 'normal') {
        // Vrai dialogue et vrai bouton de renvoi : le focus atteint le champ annoncé.
        await page.evaluate(() => { const A = MailBuilder; window.__weightConfirm = A.Checks.confirm('copy', A.Checks.warnings(A.doc(), A.Render.weightDetails(A.Render.clipboardHtml(A.doc()), A.doc())).filter(w => w.rule === 'weight')); });
        const target = result[0].weight.target;
        await click(page, '#check-list button');
        await page.evaluate(() => window.__weightConfirm);
        assert.equal(await page.evaluate(() => document.activeElement.id), target.field);
        assert.equal(await page.evaluate(() => MailBuilder.selected), target.block);
      }
    }
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});

test('#191 : une image répétée compte deux occurrences et un seul fichier ; aucun second rendu', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser, {offline: true});
    const measured = await page.evaluate(() => {
      const A = MailBuilder, i = A.catalog.components.findIndex(c => c.id === 'mail-26'), doc = A.Model.create('Deux images', [i, i]);
      const html = A.Render.clipboardHtml(doc), weight = A.Render.weightDetails(html, doc);
      const parse = DOMParser.prototype.parseFromString;
      DOMParser.prototype.parseFromString = () => { throw new Error('Second rendu interdit'); };
      try { return {weight, again: A.Render.weightDetails(html, doc)}; } finally { DOMParser.prototype.parseFromString = parse; }
    });
    assert.equal(measured.weight.occurrences, 2); assert.equal(measured.weight.distinct, 1);
    assert.deepEqual(measured.weight, measured.again);
  } finally { await browser.close(); }
});
