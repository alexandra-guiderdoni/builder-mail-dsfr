const test = require('node:test');
const {open, click, expand, saved, state, chromium, assert} = require('./browser-support.cjs');

// #122 (suite de #89/#115) : l’emplacement #notice est unique et sans file. Une réussite différée (annoncée après la
// sauvegarde) ne doit jamais remplacer une annonce plus récente posée pendant cette sauvegarde. Le jeton de c33d2a7
// protégeait `announce` après `flush` ; la fenêtre entre `A.notice("")` et l’appel d’`announce`, et celle des écrivains
// `.then(() => A.notice(...))`, restaient ouvertes. Ici l’écriture est retenue pour rendre la course déterministe.
const hold = page => page.evaluate(() => {
  if (!window.__real) window.__real = MailBuilder.Storage.save;
  window.__release = null;
  // Seule la première écriture est retenue ; celles qui la suivent (bloc ajouté) passent directement.
  MailBuilder.Storage = {...MailBuilder.Storage, save: (v, t) => window.__release ? window.__real(v, t) : new Promise((res, rej) => { window.__release = () => window.__real(v, t).then(res, rej); })};
});
const release = async page => { await page.waitForFunction(() => window.__release); await page.evaluate(() => window.__release()); await saved(page); };
const notice = page => page.locator('#notice').innerText();
// Dans la même tâche : l’action différée est lancée, puis un bloc est ajouté avant la fin de l’écriture.
const raceWithAddBlock = (page, action) => page.evaluate(action => {
  const select = document.getElementById('catalogue'); select.value = select.options[0].value;
  window.__pending = Promise.resolve(MailBuilder.Actions[action]());
  MailBuilder.Actions['add-block']();
  return document.getElementById('notice').textContent;
}, action);
const settled = page => page.evaluate(() => window.__pending);

const KINDS = {
  template: {open: 'Mes modèles', name: '#template-name', save: 'save-template'},
  identity: {open: 'Identités de service', name: '#identity-name', save: 'save-identity'}
};
for (const [label, kind] of Object.entries(KINDS)) {
  test(`${label} : « enregistré » n’écrase pas l’annonce d’un bloc ajouté pendant la sauvegarde`, async () => {
    const browser = await chromium.launch({headless: true});
    try {
      const {page} = await open(browser);
      await expand(page, kind.open); await page.locator(kind.name).fill('Course');
      await hold(page);
      const added = await raceWithAddBlock(page, kind.save);
      assert.match(added, /ajouté/, 'l’ajout de bloc est annoncé aussitôt');
      await release(page); await settled(page);
      assert.equal(await notice(page), added, 'la réussite différée ne remplace pas l’annonce plus récente');
      assert.equal((await state(page))[kind.save === 'save-template' ? 'templates' : 'identities'].length, 1, 'l’élément est bien enregistré');
    } finally { await browser.close(); }
  });
}

for (const rejectRead of [false, true]) test(rejectRead
  ? 'export-stored : le témoin de rejet après lecture ne devient pas un export réussi'
  : 'export-stored : la copie brute du stockage n’écrase pas une annonce plus récente', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await page.locator('#document-name').fill('État stocké'); await saved(page);
    const expected = await page.evaluate(async () => JSON.parse(JSON.stringify(await MailBuilder.Storage.load())));
    const beforeBlocks = expected.library.documents.find(d => d.id === expected.library.activeId).blocks.length;
    // Retenir aussi la sauvegarde du bloc ajouté : mémoire et enregistrement brut restent différents.
    await hold(page);
    await page.evaluate(rejectRead => {
      const real = MailBuilder.Storage.load.bind(MailBuilder.Storage);
      window.__releaseLoad = null; window.__loadedRecord = null;
      MailBuilder.Storage = {...MailBuilder.Storage, load: which => new Promise((resolve, reject) => {
        window.__releaseLoad = () => real(which).then(record => {
          window.__loadedRecord = record;
          if (rejectRead) reject(new Error('Rejet témoin après lecture du stockage'));
          else resolve(record);
        }, reject);
      })};
    }, rejectRead);
    const downloads = []; page.on('download', download => downloads.push(download));
    const event = rejectRead ? null : page.waitForEvent('download');
    // Observer le rejet de l’attente navigateur sans masquer celui de l’action surveillée.
    if (event) event.then(() => {}, () => {});
    const added = await page.evaluate(() => {
      window.__pending = Promise.resolve(MailBuilder.Actions['export-stored']()).then(
        () => ({ok: true}), cause => ({ok: false, error: cause.message})
      );
      const select = document.getElementById('catalogue'); select.value = select.options[0].value;
      MailBuilder.Actions['add-block']();
      return document.getElementById('notice').textContent;
    });
    assert.match(added, /ajouté/, 'l’ajout de bloc est annoncé aussitôt');
    assert.equal(await page.evaluate(() => MailBuilder.doc().blocks.length), beforeBlocks + 1, 'la mémoire diffère de l’enregistrement à exporter');
    await page.waitForFunction(() => typeof __releaseLoad === 'function');
    await page.evaluate(() => window.__releaseLoad());
    const outcome = await page.evaluate(() => window.__pending);
    assert.deepEqual(await page.evaluate(() => JSON.parse(JSON.stringify(window.__loadedRecord))), expected, 'lecture réelle du stockage antérieur au bloc ajouté');
    if (rejectRead) {
      assert.deepEqual(outcome, {ok: false, error: 'Rejet témoin après lecture du stockage'});
    } else {
      assert.deepEqual(outcome, {ok: true}, 'l’action export-stored doit réellement réussir');
      const download = await event, chunks = [];
      assert.equal(download.suggestedFilename(), 'recuperation.stockage.json');
      for await (const chunk of await download.createReadStream()) chunks.push(chunk);
      assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString('utf8')), expected, 'le fichier contient le record brut stocké, pas le modèle courant');
    }
    await release(page);
    assert.equal(downloads.length, rejectRead ? 0 : 1, 'le rejet témoin ne télécharge rien ; le succès télécharge une seule fois');
    assert.equal(await notice(page), added, 'le résultat différé ne remplace pas l’annonce de bloc ajouté');
  } finally { await browser.close(); }
});

test('readingTicket : une annonce extérieure entre deux imports silencie la fin de chaque import', async () => {
  // Scénario Astra constat 3 : import A → annonce extérieure → import B → fin de A → A ne doit pas annoncer
  // avec un jeton emprunté à B. Avec le compteur de reads actifs, seul le premier import pose le jeton ; une
  // annonce extérieure survenue depuis silencie la fin de chaque import.
  const browser = await chromium.launch({headless: true});
  const {state} = require('./browser-support.cjs');
  try {
    const {page} = await open(browser);
    await expand(page, 'Fichiers et récupération');
    const docA = JSON.stringify(await page.evaluate(() => MailBuilder.Model.create('Import A concurrent')));
    const docB = JSON.stringify(await page.evaluate(() => MailBuilder.Model.create('Import B concurrent')));
    await hold(page);
    await page.locator('#project-input').setInputFiles({name: 'a.json', mimeType: 'application/json', buffer: Buffer.from(docA)});
    await page.waitForFunction(() => window.__release);
    // Annonce extérieure pendant que la sauvegarde de A est suspendue : elle avance noticeTicket et doit survivre.
    await page.evaluate(() => MailBuilder.notice('Annonce extérieure durable'));
    // Import B : son mutator passe tout de suite, sa sauvegarde s'empile derrière celle de A dans la queue.
    await page.locator('#project-input').setInputFiles({name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(docB)});
    await page.waitForFunction(() => MailBuilder.library.documents.some(d => d.name === 'Import B concurrent'));
    assert.equal(await page.locator('#notice').innerText(), 'Annonce extérieure durable', 'B n’écrase pas l’annonce extérieure au départ');
    await release(page);
    await saved(page);
    assert.equal(await page.locator('#notice').innerText(), 'Annonce extérieure durable', 'ni A ni B n’écrasent l’annonce extérieure à la fin');
    const docs = (await state(page)).documents;
    assert.equal(docs.filter(d => d.name === 'Import A concurrent').length, 1, 'A ajouté');
    assert.equal(docs.filter(d => d.name === 'Import B concurrent').length, 1, 'B ajouté');
  } finally { await browser.close(); }
});

test('les réussites différées de création, modèle, import et copie n’écrasent pas une annonce plus récente', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await expand(page, 'Mes modèles'); await page.locator('#template-name').fill('Source');
    await click(page, '[data-action=save-template]'); await saved(page);
    await page.locator('#notice').filter({hasText: 'enregistré'}).waitFor();
    const templateId = (await state(page)).templates[0].id;
    const doc = await page.evaluate(() => JSON.stringify(MailBuilder.Model.create('Importée', [0])));
    const prepare = {
      'new-document': async () => {},
      'use-template': async () => { await expand(page, 'Mes modèles'); await page.locator('#saved-templates').selectOption(templateId); },
      'json-import': async () => { await expand(page, 'Importer du JSON'); await page.locator('#json-input').fill(doc); }
    };
    for (const action of Object.keys(prepare)) {
      await prepare[action]();
      await hold(page);
      // L’import lit d’abord le fichier (chargement gardé) : le bloc est ajouté une fois l’écriture engagée et retenue.
      await page.evaluate(action => { window.__error = null; window.__pending = Promise.resolve().then(() => MailBuilder.Actions[action]()).catch(e => { window.__error = e.message; }); }, action);
      await page.waitForFunction(() => window.__error || (window.__release && !MailBuilder.pendingInputs));
      assert.equal(await page.evaluate(() => window.__error), null, `${action} : l’action ne doit pas échouer`);
      const added = await page.evaluate(() => { const select = document.getElementById('catalogue'); select.value = select.options[0].value; MailBuilder.Actions['add-block'](); return document.getElementById('notice').textContent; });
      assert.match(added, /ajouté/, action);
      await release(page); await settled(page);
      assert.equal(await notice(page), added, `${action} : la réussite différée ne remplace pas l’annonce plus récente`);
    }
    // Copie d’une composition depuis la bibliothèque : même attente de la sauvegarde avant l’annonce.
    await hold(page);
    const added = await page.evaluate(() => {
      const select = document.getElementById('catalogue'); select.value = select.options[0].value;
      window.__pending = MailBuilder.Library.duplicate(MailBuilder.library.activeId);
      MailBuilder.Actions['add-block']();
      return document.getElementById('notice').textContent;
    });
    assert.match(added, /ajouté/);
    await release(page); await settled(page);
    assert.equal(await notice(page), added, 'copie : la réussite différée ne remplace pas l’annonce plus récente');
  } finally { await browser.close(); }
});
