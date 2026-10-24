const test = require('node:test');
const {open, click, expand, saved, state, store, assert} = require('./browser-support.cjs');
// Moteur au choix pour une vérification ciblée : MAIL_BUILDER_ENGINE=webkit node --test tests/identity-confirmation-browser.test.cjs
const engine = require(process.env.PLAYWRIGHT_MODULE || 'playwright')[process.env.MAIL_BUILDER_ENGINE || 'chromium'];

const family = (page, blocks) => page.evaluate(list => list.map(b => MailBuilder.Model.component(b.component).family), blocks);
const frame = name => ['En-têtes', 'Pieds de page'].includes(name);
const without = (b, keys = ['id']) => Object.fromEntries(Object.entries(b).filter(([key]) => !keys.includes(key)));

async function importDocument(page, build) {
  const json = await page.evaluate(`(${build})(MailBuilder.Model)`);
  await expand(page, 'Importer du JSON'); await page.locator('#json-input').fill(json);
  // La notice précédente est effacée : elle ne réapparaît qu’après l’import, l’ouverture et la sauvegarde.
  await page.evaluate(() => MailBuilder.notice(''));
  await click(page, '[data-action=json-import]');
  await page.locator('#notice').filter({hasText: 'Composition ou bibliothèque JSON ajoutée'}).waitFor();
  await saved(page);
}

async function saveIdentity(page, name) {
  await expand(page, 'Identités de service'); await page.locator('#identity-name').fill(name);
  await click(page, '[data-action=save-identity]');
  await page.waitForFunction(label => MailBuilder.library.identities.some(i => i.name === label), name, {timeout: 5000}); await saved(page);
}

// Attend l’effet du bouton « Appliquer » : soit la confirmation s’ouvre, soit la composition change.
async function apply(page, identity) {
  const before = JSON.stringify(await page.evaluate(() => MailBuilder.doc().blocks));
  await page.locator('#identities').selectOption({label: identity});
  await click(page, '[data-action=use-identity]');
  await page.waitForFunction(previous => document.querySelector('#identity-dialog')?.open || JSON.stringify(MailBuilder.doc().blocks) !== previous, before, {timeout: 5000});
}

const dialogOpen = page => page.evaluate(() => Boolean(document.querySelector('#identity-dialog')?.open));
const listed = page => page.locator('#identity-dialog-blocks li').allInnerTexts();
const focused = (page, selector) => page.waitForFunction(target => document.activeElement === document.querySelector(target), selector, {timeout: 3000});

test('identité : confirmation listant les blocs modifiés, annulation sans effet, remplacement confirmé', async () => {
  const browser = await engine.launch({headless: true});
  try {
    const {page, observations: {errors}} = await open(browser);
    await importDocument(page, M => {
      const d = M.create('Source de l’identité', [2, 19, 47, 50]);
      d.blocks[0].values.f4 = 'Direction de démonstration';
      d.blocks[2].values.f1 = 'mailto:contact@example.invalid?subject=Identit%C3%A9%20de%20d%C3%A9monstration'; d.blocks[2].values.f2 = 'Écrire au service de démonstration';
      d.blocks[3].values.f1 = 'mailto:gestion@example.invalid'; d.blocks[3].additionalLinks = [{url: 'mailto:abonnements@example.invalid?subject=Abonnement', label: 'Gérer par courriel'}, {url: 'https://example.invalid/aide', label: 'Aide aux abonnés'}];
      return JSON.stringify(d);
    });
    await saveIdentity(page, 'Identité de démonstration');
    const identity = (await state(page)).identities[0];

    await importDocument(page, M => {
      const d = M.create('Composition cible', [1, 2, 19, 40, 47, 50]);
      d.blocks[1].values.f4 = 'Service cible modifié';
      d.blocks[2].values.f0 = 'Corps central à conserver'; d.blocks[2].source = 'https://example.invalid/article';
      d.blocks[3].values.f1 = 'Bouton conservé';
      d.blocks[5].values.f1 = 'mailto:ancienne-gestion@example.invalid'; d.blocks[5].additionalLinks = [{url: 'mailto:ancien@example.invalid', label: 'Ancien lien de pied'}];
      return JSON.stringify(d);
    });
    const before = await state(page), stored = await store(page), doc = before.documents.find(d => d.id === before.activeId);
    const families = await family(page, doc.blocks), body = doc.blocks.filter((b, i) => !frame(families[i]));

    // Deux blocs non intacts (2 et 6) seraient remplacés : la composition ne change pas avant confirmation.
    await apply(page, 'Identité de démonstration');
    assert.deepEqual(await state(page), before, 'Aucun remplacement avant confirmation.');
    assert.equal(await dialogOpen(page), true, 'Une confirmation est attendue.');
    const items = await listed(page);
    assert.equal(items.length, 2, items.join(' | '));
    assert.match(items[0], /^2\. En-tête Marianne/); assert.match(items[0], /Service cible modifié/);
    assert.match(items[1], /^6\. Gestion des abonnements/);
    assert.match(await page.locator('#identity-dialog-title').innerText(), /Identité de démonstration/);
    await focused(page, '#identity-cancel');

    // Annuler, par le bouton puis par Échap : composition, sélection et stockage strictement identiques.
    await click(page, '#identity-cancel');
    assert.equal(await dialogOpen(page), false);
    assert.deepEqual(await state(page), before); assert.deepEqual(await store(page), stored);
    await focused(page, '[data-action=use-identity]');
    await apply(page, 'Identité de démonstration'); await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#identity-dialog').open, null, {timeout: 3000});
    assert.deepEqual(await state(page), before); assert.deepEqual(await store(page), stored);

    // Confirmer : en-têtes et pieds de l’identité, corps central conservé à l’identique.
    await apply(page, 'Identité de démonstration'); await click(page, '#identity-confirm'); await saved(page);
    assert.equal(await dialogOpen(page), false);
    const after = await state(page), result = after.documents.find(d => d.id === after.activeId);
    const resultFamilies = await family(page, result.blocks);
    assert.deepEqual(result.blocks.filter((b, i) => !frame(resultFamilies[i])), body, 'Le corps central est conservé, identifiants compris.');
    assert.deepEqual(result.blocks.map(b => b.component), ['mail-02', 'mail-19', 'mail-40', 'mail-47', 'mail-50']);
    assert.deepEqual(result.blocks.filter((b, i) => frame(resultFamilies[i])).map(b => without(b)), identity.blocks.map(b => without(b)));
    assert(result.blocks.every(b => !identity.blocks.some(x => x.id === b.id)), 'Les blocs appliqués reçoivent de nouveaux identifiants.');
    assert.deepEqual(after.identities, before.identities, 'L’identité enregistrée reste inchangée.');
    const footer = result.blocks.find(b => b.component === 'mail-50');
    assert.equal(footer.values.f1, 'mailto:gestion@example.invalid');
    assert.deepEqual(footer.additionalLinks, identity.blocks.find(b => b.component === 'mail-50').additionalLinks);
    await page.frameLocator('#preview').locator('a[href^="mailto:"]').first().waitFor();
    const hrefs = await page.frameLocator('#preview').locator('a[href]').evaluateAll(links => links.map(a => a.getAttribute('href')));
    for (const expected of ['mailto:contact@example.invalid?subject=Identit%C3%A9%20de%20d%C3%A9monstration', 'mailto:gestion@example.invalid', 'mailto:abonnements@example.invalid?subject=Abonnement', 'https://example.invalid/aide', 'https://example.invalid/article']) assert(hrefs.includes(expected), expected);
    assert(!hrefs.some(href => /ancien/.test(href)), hrefs.join(' '));
    assert.match(await page.locator('#notice').innerText(), /Identité de démonstration/);
    await focused(page, '[data-action=use-identity]');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('identité : aucune confirmation quand les blocs remplacés sont intacts, quel que soit leur identifiant', async () => {
  const browser = await engine.launch({headless: true});
  try {
    const {page, observations: {errors}} = await open(browser);
    await importDocument(page, M => {
      const d = M.create('Source intacte', [2, 47]); d.blocks[0].values.f4 = 'Direction appliquée sans question';
      return JSON.stringify(d);
    });
    await saveIdentity(page, 'Identité directe');
    // Composition neuve : en-tête et pieds aux valeurs initiales, identifiants différents de ceux du catalogue.
    await importDocument(page, M => {
      const d = M.create('Composition intacte', [0, 2, 19, 47, 49, 50]);
      d.blocks[2].values.f0 = 'Corps modifié, hors identité';
      d.blocks[5].additionalLinks = []; d.blocks[4].sourceLabel = '';
      return JSON.stringify(d);
    });
    const before = await state(page), doc = before.documents.find(d => d.id === before.activeId);
    await apply(page, 'Identité directe'); await saved(page);
    assert.equal(await dialogOpen(page), false, 'Aucune confirmation pour des blocs intacts.');
    const after = await state(page), result = after.documents.find(d => d.id === after.activeId);
    assert.deepEqual(result.blocks.map(b => b.component), ['mail-02', 'mail-19', 'mail-47']);
    assert.equal(result.blocks[0].values.f4, 'Direction appliquée sans question');
    assert.deepEqual(result.blocks[1], doc.blocks[2]);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('identité : confirmation utilisable pendant une sauvegarde lente et notice propre à chaque application', async () => {
  const browser = await engine.launch({headless: true});
  try {
    const {page, observations: {errors}} = await open(browser);
    await importDocument(page, M => { const d = M.create('Source A', [2, 47]); d.blocks[0].values.f4 = 'Direction A'; return JSON.stringify(d); });
    await saveIdentity(page, 'Identité A');
    await importDocument(page, M => JSON.stringify(M.create('Source B', [3, 48])));
    await saveIdentity(page, 'Identité B');
    await importDocument(page, M => { const d = M.create('Composition lente', [2, 19, 47]); d.blocks[0].values.f4 = 'Service local'; return JSON.stringify(d); });
    // La sauvegarde suivante reste en attente jusqu’à libération explicite.
    await page.evaluate(() => { const storage = MailBuilder.Storage; MailBuilder.Storage = {...storage, save: (...args) => new Promise(resolve => { window.releaseSave = () => { MailBuilder.Storage = storage; resolve(); }; }).then(() => storage.save(...args))}; });
    await apply(page, 'Identité A'); await click(page, '#identity-confirm');
    await page.locator('#save-state').filter({hasText: 'Sauvegarde en cours'}).waitFor();
    assert.match(await page.locator('#notice').innerText(), /Identité « Identité A » appliquée/);
    const applied = await state(page);
    await apply(page, 'Identité A');
    assert.equal(await dialogOpen(page), true);
    assert.deepEqual(await page.evaluate(() => ['#identity-confirm', '#identity-cancel'].map(s => document.querySelector(s).disabled)), [false, false], 'Les boutons restent actifs pendant la sauvegarde.');
    await focused(page, '#identity-cancel');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#identity-dialog').open, null, {timeout: 3000});
    assert.deepEqual(await state(page), applied);
    await page.evaluate(() => window.releaseSave()); await saved(page);
    // Application directe sur une composition neuve : la notice nomme l’identité appliquée.
    await importDocument(page, M => JSON.stringify(M.create('Composition neuve', [2, 19, 47])));
    await apply(page, 'Identité B'); await saved(page);
    assert.equal(await dialogOpen(page), false);
    assert.match(await page.locator('#notice').innerText(), /Identité « Identité B » appliquée/);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('identité : une composition changée pendant la confirmation est signalée sans modification', async () => {
  const browser = await engine.launch({headless: true});
  try {
    const {page, observations: {errors}} = await open(browser);
    await importDocument(page, M => { const d = M.create('Source', [2, 47]); d.blocks[0].values.f4 = 'Direction source'; return JSON.stringify(d); });
    await saveIdentity(page, 'Identité source');
    await importDocument(page, M => { const d = M.create('Composition visée', [2, 19, 47]); d.blocks[0].values.f4 = 'Service visé'; return JSON.stringify(d); });
    await apply(page, 'Identité source'); assert.equal(await dialogOpen(page), true);
    // Changement programmatique de la composition active pendant que la boîte modale est ouverte.
    await page.evaluate(() => MailBuilder.State.change(lib => { lib.activeId = lib.documents.find(d => d.id !== lib.activeId).id; }));
    const before = await state(page);
    await click(page, '#identity-confirm');
    await page.locator('#error').filter({hasText: 'La composition ou l’identité a changé'}).waitFor();
    assert.equal(await dialogOpen(page), false);
    assert.deepEqual(await state(page), before);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('identité : chaque écart aux valeurs initiales rend un en-tête ou un pied non intact', async () => {
  const browser = await engine.launch({headless: true});
  try {
    const {page, observations: {errors}} = await open(browser);
    await importDocument(page, M => JSON.stringify(M.create('Source témoin', [3, 48])));
    await saveIdentity(page, 'Identité témoin');
    await importDocument(page, M => JSON.stringify(M.create('Composition témoin', [2, 19, 47, 49, 50])));
    const cases = [
      ['texte éditorial', 0, b => { b.values.f4 = 'Votre service, version locale'; }],
      ['texte alternatif', 0, b => { b.values.f1 = 'Marianne modifiée'; }],
      ['image', 0, (b, M) => { b.values.f0 = M.createBlock(3).values.f4; }],
      ['lien mailto', 2, b => { b.values.f1 = 'mailto:contact@example.invalid'; }],
      ['source', 3, b => { b.source = 'https://example.invalid/source'; }],
      ['intitulé de source', 3, b => { b.sourceLabel = 'Intitulé conservé'; }],
      ['liens supplémentaires', 4, b => { b.additionalLinks = [{url: 'https://example.invalid/', label: 'Lien ajouté'}]; }]
    ];
    for (const [label, index, mutate] of cases) {
      const reference = await state(page);
      await page.evaluate(`MailBuilder.State.change(lib => (${mutate})(lib.documents.find(d => d.id === lib.activeId).blocks[${index}], MailBuilder.Model))`);
      await saved(page);
      const before = await state(page);
      assert.notDeepEqual(before, reference, label);
      await apply(page, 'Identité témoin');
      assert.equal(await dialogOpen(page), true, `Confirmation attendue : ${label}`);
      const items = await listed(page);
      assert.equal(items.length, 1, `${label} : ${items.join(' | ')}`); assert.match(items[0], new RegExp(`^${index + 1}\\. `), label);
      await click(page, '#identity-cancel'); assert.deepEqual(await state(page), before, label);
      await page.evaluate(([i, original]) => MailBuilder.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).blocks[i] = original; }), [index, reference.documents.find(d => d.id === reference.activeId).blocks[index]]);
      await saved(page);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
