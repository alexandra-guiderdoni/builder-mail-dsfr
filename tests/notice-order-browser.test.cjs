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

test('export-stored : la copie brute du stockage n’écrase pas une annonce plus récente', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await page.locator('#document-name').fill('État stocké'); await saved(page);
    // Suspendre A.Storage.load pour fenêtrer l'annonce différée de export-stored.
    await page.evaluate(() => {
      const real = MailBuilder.Storage.load.bind(MailBuilder.Storage);
      window.__releaseLoad = null;
      MailBuilder.Storage = {...MailBuilder.Storage, load: (which) => new Promise((res, rej) => { window.__releaseLoad = () => real(which).then(res, rej); })};
    });
    const added = await page.evaluate(() => {
      window.__pending = Promise.resolve(MailBuilder.Actions['export-stored']()).catch(() => {});
      const select = document.getElementById('catalogue'); select.value = select.options[0].value;
      MailBuilder.Actions['add-block']();
      return document.getElementById('notice').textContent;
    });
    assert.match(added, /ajouté/, 'l’ajout de bloc est annoncé aussitôt');
    await page.waitForFunction(() => typeof __releaseLoad === 'function');
    await page.evaluate(() => window.__releaseLoad());
    await page.evaluate(() => window.__pending);
    await saved(page);
    assert.equal(await page.locator('#notice').innerText(), added, 'la copie brute ne remplace pas l’annonce de bloc ajouté');
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
