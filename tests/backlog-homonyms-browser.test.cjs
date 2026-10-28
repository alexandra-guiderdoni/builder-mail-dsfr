const test = require('node:test');
const {chromium, open, click, expand, saved, state, assert} = require('./browser-support.cjs');

test('#168 : double import UI, noms conservés et choix accessibles distincts dans liste et accueil', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const name = 'Homonyme de recette', subject = 'Objet commun synthétique';
    const input = await page.evaluate(({name, subject}) => {
      const doc = MailBuilder.Model.create(name, [19]); doc.subject = subject;
      return JSON.stringify(MailBuilder.Model.document(doc));
    }, {name, subject});
    await expand(page, 'Fichiers et récupération');
    for (const expected of [1, 2]) {
      await page.getByLabel('Importer une composition ou une bibliothèque JSON', {exact: true}).setInputFiles({name: 'homonyme.courriel.json', mimeType: 'application/json', buffer: Buffer.from(input)});
      await page.waitForFunction(({name, expected}) => MailBuilder.library.documents.filter(d => d.name === name).length === expected, {name, expected});
      await saved(page);
    }
    const docs = (await state(page)).documents.filter(d => d.name === name);
    assert.equal(docs.length, 2); assert.notEqual(docs[0].id, docs[1].id);
    assert.deepEqual(docs.map(d => d.name), [name, name], 'la distinction n’altère pas les noms du modèle');
    assert.deepEqual(docs.map(d => d.subject), [subject, subject]);
    assert.deepEqual(docs[0].blocks.map(b => b.values), docs[1].blocks.map(b => b.values));
    const labels = [`${name} (n° 1)`, `${name} (n° 2)`];
    const chooser = page.getByRole('combobox', {name: 'Composition active', exact: true});
    for (const [index, label] of labels.entries()) {
      const option = chooser.getByRole('option', {name: label, exact: true});
      assert.equal(await option.count(), 1); assert.equal(await option.getAttribute('value'), docs[index].id);
    }
    // La sélection seule n’ouvre pas la composition ; le bouton d’ouverture reste explicite.
    const activeBefore = (await state(page)).activeId;
    await chooser.selectOption({label: labels[0]});
    assert.equal((await state(page)).activeId, activeBefore);
    await click(page, '#open-document');
    await page.waitForFunction(id => MailBuilder.library.activeId === id, docs[0].id); await saved(page);
    assert.equal(await page.locator('#document-name').inputValue(), name);
    assert.equal(await chooser.inputValue(), docs[0].id);
    await click(page, '#library-back'); await page.locator('#library-home').waitFor({state: 'visible'});
    for (const [index, label] of labels.entries()) {
      const card = page.locator(`[data-document="${docs[index].id}"]`);
      assert.equal(await card.locator('h3').innerText(), label);
      assert.equal(await card.getByRole('button', {name: `Ouvrir ${label}`, exact: true}).count(), 1);
      for (const verb of ['Renommer', 'Dupliquer', 'Exporter', 'Supprimer']) {
        assert.equal(await card.getByRole('button', {name: `${verb} la composition ${label}`, exact: true}).count(), 1);
      }
    }
    // Ouvrir le second puis le premier par leur nom accessible prouve la bonne association des actions.
    for (const index of [1, 0]) {
      const button = page.getByRole('button', {name: `Ouvrir ${labels[index]}`, exact: true});
      assert.notEqual((await state(page)).activeId, docs[index].id);
      await button.focus(); await button.press('Enter');
      await page.waitForFunction(id => MailBuilder.library.activeId === id, docs[index].id); await saved(page);
      assert.equal(await page.locator('#editor-page').isVisible(), true);
      assert.equal(await page.locator('#document-name').inputValue(), name);
      if (index === 1) { await click(page, '#library-back'); await page.locator('#library-home').waitFor({state: 'visible'}); }
    }
    await page.locator('#subject').fill('Édition du premier homonyme'); await saved(page);
    const after = (await state(page)).documents.filter(d => d.name === name);
    assert.deepEqual(after.map(d => d.name), [name, name]);
    assert.equal(after.find(d => d.id === docs[0].id).subject, 'Édition du premier homonyme');
    assert.equal(after.find(d => d.id === docs[1].id).subject, subject, 'l’autre homonyme n’est pas modifié');
  } finally { await browser.close(); }
});
