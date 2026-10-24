const test = require('node:test');
const {open, click, expand, saved, state, store, chromium, assert} = require('./browser-support.cjs');

const KINDS = {
  template: {open: 'Mes modèles', name: '#template-name', save: 'save-template', select: '#saved-templates', remove: 'remove-template', list: 'templates', other: 'identities', saved: n => `Modèle « ${n} » enregistré`, gone: n => `Modèle « ${n} » retiré`, dialog: n => `Retirer le modèle « ${n} » ?`},
  identity: {open: 'Identités de service', name: '#identity-name', save: 'save-identity', select: '#identities', remove: 'remove-identity', list: 'identities', other: 'templates', saved: n => `Identité « ${n} » enregistrée`, gone: n => `Identité « ${n} » retirée`, dialog: n => `Retirer l’identité « ${n} » ?`}
};
const create = async (page, kind, name) => { await expand(page, kind.open); await page.locator(kind.name).fill(name); await click(page, `[data-action=${kind.save}]`); };
const names = (library, kind) => library[kind.list].map(x => x.name);
const rejected = async (page, kind, name) => {
  const before = await state(page), stored = await store(page);
  await create(page, kind, name);
  await page.locator('#error').filter({hasText: 'existe déjà'}).waitFor();
  assert.deepEqual(await state(page), before); assert.deepEqual(await store(page), stored);
  assert.equal(await page.locator('#notice').innerText(), '');
};
// Importe une bibliothèque contenant des homonymes, comme un fichier venu d’ailleurs.
async function importHomonyms(page, kind) {
  await create(page, kind, 'Base');
  await saved(page);
  const json = await page.evaluate(list => { const lib = JSON.parse(JSON.stringify(MailBuilder.library)); lib[list].push(JSON.parse(JSON.stringify(lib[list][0]))); lib[list][1].id = 'import-homonyme'; return JSON.stringify(lib); }, kind.list);
  await expand(page, 'Importer du JSON'); await page.locator('#json-input').fill(json); await click(page, '[data-action=json-import]');
  await page.locator('#notice').filter({hasText: 'Composition ou bibliothèque JSON ajoutée'}).waitFor(); await saved(page);
  await click(page, '[data-action=library-home]'); await click(page, '[data-action=resume-document]'); await expand(page, kind.open);
}

for (const [label, kind] of Object.entries(KINDS)) {
  test(`${label} : un nom déjà présent est refusé après normalisation des espaces, de la casse et d’Unicode`, async () => {
    const browser = await chromium.launch({headless: true});
    try {
      const {page} = await open(browser);
      await create(page, kind, 'Modèle Été'); await saved(page);
      assert.deepEqual(names(await state(page), kind), ['Modèle Été']);
      // Un nom déjà enregistré avec des espaces périphériques (import) compte aussi comme présent.
      await page.evaluate(list => MailBuilder.State.change(lib => { lib[list][0].name = '  Modèle Été \t'; }), kind.list); await saved(page);
      for (const variant of ['  Modèle Été  ', 'MODÈLE ÉTÉ', 'modèle été', ' modèle été\t']) await rejected(page, kind, variant);
      assert.deepEqual(names(await state(page), kind).map(n => n.trim()), ['Modèle Été']);
      await create(page, kind, 'Modèle Hiver'); await saved(page);
      assert.deepEqual(names(await state(page), kind).map(n => n.trim()), ['Modèle Été', 'Modèle Hiver']);
    } finally { await browser.close(); }
  });

  test(`${label} : « enregistré » n’est annoncé qu’après une sauvegarde réussie`, async () => {
    const browser = await chromium.launch({headless: true});
    try {
      const {page} = await open(browser);
      await page.evaluate(() => { const real = MailBuilder.Storage.save; window.__release = null; MailBuilder.Storage = {...MailBuilder.Storage, save: (v, t) => new Promise((res, rej) => { window.__release = () => real(v, t).then(res, rej); }), real}; });
      await create(page, kind, 'Annonce');
      await page.waitForFunction(() => window.__release);
      assert.doesNotMatch(await page.locator('#notice').innerText(), /enregistré/);
      await page.evaluate(() => window.__release()); await saved(page);
      await page.locator('#notice').filter({hasText: kind.saved('Annonce')}).waitFor();
      // Échec : aucune annonce de réussite.
      await page.evaluate(() => { MailBuilder.Storage = {...MailBuilder.Storage, save: async () => { throw new Error('Quota de recette'); }}; });
      await page.locator(kind.name).fill('Perdu'); await click(page, `[data-action=${kind.save}]`);
      await page.locator('#error').filter({hasText: 'Quota de recette'}).waitFor();
      assert.doesNotMatch(await page.locator('#notice').innerText(), /enregistré/);
    } finally { await browser.close(); }
  });

  test(`${label} : le retrait se confirme en nommant l’élément ; annuler ne change rien`, async () => {
    const browser = await chromium.launch({headless: true});
    try {
      const {page} = await open(browser);
      const other = KINDS[label === 'template' ? 'identity' : 'template'];
      await create(page, other, 'Témoin'); await create(page, kind, 'Garder'); await create(page, kind, 'Retirer'); await saved(page);
      assert.equal((await state(page))[kind.other].length, 1);
      // Composition dérivée avant retrait.
      await page.locator(kind.select).selectOption({label: 'Retirer'});
      if (label === 'identity') await click(page, '[data-action=use-identity]'); else { await click(page, '[data-action=use-template]'); await page.locator('#editor-page').waitFor({state: 'visible'}); await expand(page, kind.open); }
      await saved(page);
      await page.locator(kind.select).selectOption({label: 'Retirer'});
      const before = await state(page), stored = await store(page);
      await click(page, `[data-action=${kind.remove}]`);
      await page.locator('#library-dialog[open]').waitFor();
      assert.equal(await page.locator('#library-dialog-title').innerText(), kind.dialog('Retirer'));
      assert.deepEqual(await state(page), before); assert.deepEqual(await store(page), stored);
      await click(page, '#library-cancel');
      assert.deepEqual(await state(page), before); assert.deepEqual(await store(page), stored);
      await page.waitForFunction(sel => document.querySelector(sel) === document.activeElement, `[data-action=${kind.remove}]`);
      // Confirmation par Échap : équivalent à annuler.
      await click(page, `[data-action=${kind.remove}]`); await page.keyboard.press('Escape');
      assert.deepEqual(await state(page), before); assert.deepEqual(await store(page), stored);
      // Confirmation.
      await click(page, `[data-action=${kind.remove}]`); await click(page, '#library-confirm'); await saved(page);
      await page.locator('#notice').filter({hasText: kind.gone('Retirer')}).waitFor();
      const after = await state(page);
      assert.deepEqual(names(after, kind), ['Garder']);
      assert.deepEqual(after[kind.other], before[kind.other]);
      assert.deepEqual(after.documents, before.documents, 'Les compositions dérivées restent intactes.');
      assert.equal(after.activeId, before.activeId);
      await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
      const reopened = await state(page), persisted = (await store(page)).library;
      assert.deepEqual(names(reopened, kind), ['Garder']); assert.deepEqual(names(persisted, kind), ['Garder']);
      assert.deepEqual(reopened.documents, before.documents); assert.deepEqual(reopened[kind.other], before[kind.other]);
    } finally { await browser.close(); }
  });

  test(`${label} : « retiré » n’est annoncé qu’après une sauvegarde réussie`, async () => {
    const browser = await chromium.launch({headless: true});
    try {
      const {page} = await open(browser);
      await create(page, kind, 'Cible'); await create(page, kind, 'Seconde'); await saved(page);
      await page.evaluate(() => { const real = MailBuilder.Storage.save; window.__real = real; window.__release = null; MailBuilder.Storage = {...MailBuilder.Storage, save: (v, t) => new Promise((res, rej) => { window.__release = () => real(v, t).then(res, rej); })}; });
      await page.locator(kind.select).selectOption({label: 'Cible'});
      await click(page, `[data-action=${kind.remove}]`); await click(page, '#library-confirm');
      await page.waitForFunction(() => window.__release);
      assert.doesNotMatch(await page.locator('#notice').innerText(), /retiré/);
      await page.evaluate(() => window.__release()); await saved(page);
      await page.locator('#notice').filter({hasText: kind.gone('Cible')}).waitFor();
      // Échec de sauvegarde : aucune annonce de réussite.
      await page.evaluate(() => { MailBuilder.Storage = {...MailBuilder.Storage, save: async () => { throw new Error('Quota de recette'); }}; });
      await page.locator(kind.select).selectOption({label: 'Seconde'});
      await click(page, `[data-action=${kind.remove}]`); await click(page, '#library-confirm');
      await page.locator('#error').filter({hasText: 'Quota de recette'}).waitFor();
      assert.doesNotMatch(await page.locator('#notice').innerText(), /retiré/);
    } finally { await browser.close(); }
  });

  test(`${label} : des homonymes importés restent distinguables et se retirent un par un par identifiant`, async () => {
    const browser = await chromium.launch({headless: true});
    try {
      const {page} = await open(browser);
      await importHomonyms(page, kind);
      const lib = await state(page), ids = lib[kind.list].map(x => x.id);
      assert.equal(ids.length, 3); assert.equal(new Set(lib[kind.list].map(x => x.name)).size, 1);
      const options = await page.locator(`${kind.select} option`).allInnerTexts();
      assert.equal(new Set(options).size, options.length, 'Les homonymes ont des libellés distincts.');
      const target = ids[1];
      await page.locator(kind.select).selectOption(target);
      await click(page, `[data-action=${kind.remove}]`); await click(page, '#library-confirm'); await saved(page);
      const after = await state(page);
      assert.deepEqual(after[kind.list].map(x => x.id), [ids[0], ids[2]]);
      assert.deepEqual(after[kind.list].map(x => x.name), ['Base', 'Base']);
      assert.deepEqual(after[kind.other], lib[kind.other]);
    } finally { await browser.close(); }
  });
}
