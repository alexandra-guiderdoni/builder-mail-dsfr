const test = require('node:test');
const {open, click, expand, saved, state, chromium, assert} = require('./browser-support.cjs');
const {webkit} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Cas d'acceptation de la création d'une composition, un par point de départ.
// Données entièrement synthétiques.
const starters = [
  {value: 'information', label: 'Information de service'},
  {value: 'lettre', label: 'Lettre d’information'},
  {value: 'invitation', label: 'Invitation'}
];
const DATED = 'Lettre d’exemple du vendredi 23 octobre 2026';
const UNDATED = 'Lettre d’exemple du service';

const home = page => page.evaluate(() => MailBuilder.Library.home());
const last = async page => { const lib = await state(page); return lib.documents.find(d => d.id === lib.activeId); };
const notice = page => page.locator('#notice').textContent();
async function create(page, value) {
  await home(page);
  await page.locator('#starter').selectOption(value);
  await click(page, '[data-action=new-document]');
  await page.locator('#editor-page').waitFor({state: 'visible'});
}
const focusOnName = page => page.evaluate(() => {
  const field = document.getElementById('document-name');
  return {focused: document.activeElement === field, selected: field.selectionStart === 0 && field.selectionEnd === field.value.length && field.value.length > 0};
});

for (const [engine, launcher] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const {value, label} of starters) {
    test(`point de départ « ${label} » : nom et objet explicites, modifiables immédiatement (${engine})`, async () => {
      const browser = await launcher.launch();
      try {
        const {page} = await open(browser);
        await create(page, value);
        let doc = await last(page);
        assert.equal(doc.name, label); assert.equal(doc.subject, label);
        assert.equal(await page.locator('#document-name').inputValue(), label);
        assert.equal(await page.locator('#subject').inputValue(), label);
        assert.match(await notice(page), /nom et l’objet/);
        assert.deepEqual(await focusOnName(page), {focused: true, selected: true});
        // Saisie immédiate, sans clic préalable : le nom proposé est remplacé.
        await page.keyboard.type('Bulletin de rentrée'); await saved(page);
        doc = await last(page);
        assert.equal(doc.name, 'Bulletin de rentrée'); assert.equal(doc.subject, label);
        // Deuxième création du même point de départ : numérotée, jamais deux fois « Nouvelle composition ».
        await create(page, value);
        assert.equal((await last(page)).name, `${label}`);
        await create(page, value);
        assert.equal((await last(page)).name, `${label} (2)`); assert.equal((await last(page)).subject, `${label} (2)`);
        assert((await state(page)).documents.every(d => d.name !== 'Nouvelle composition' && d.subject !== 'Nouvelle composition'));
      } finally { await browser.close(); }
    });
  }

  test(`point de départ « modèle enregistré » : objet daté remplacé et signalé, objet sans date conservé (${engine})`, async () => {
    const browser = await launcher.launch();
    try {
      const {page} = await open(browser);
      await expand(page, 'Mes modèles');
      for (const [name, subject] of [['Modèle daté', DATED], ['Modèle neutre', UNDATED]]) {
        await page.locator('#subject').fill(subject); await saved(page);
        await page.locator('#template-name').fill(name);
        await click(page, '[data-action=save-template]'); await saved(page);
        // Depuis #47, l’enregistrement est annoncé après la sauvegarde : attendre l’annonce évite qu’elle écrase le statut suivant.
        await page.locator('#notice').filter({hasText: new RegExp(`${name}.*enregistré dans ce navigateur`)}).waitFor();
      }
      const templates = (await state(page)).templates;
      assert.deepEqual(templates.map(t => t.subject), [DATED, UNDATED]);

      await page.locator('#saved-templates').selectOption({label: 'Modèle daté'}).catch(() => page.locator('#saved-templates').selectOption(templates[0].id));
      await click(page, '[data-action=use-template]'); await page.locator('#editor-page').waitFor({state: 'visible'});
      let doc = await last(page);
      assert.equal(doc.name, 'Modèle daté · composition');
      assert.equal(doc.subject, 'Modèle daté · composition', 'aucun objet daté hérité');
      const message = await notice(page);
      assert(message.includes(DATED) && /date/.test(message), `signalement attendu : ${message}`);
      assert.deepEqual(await focusOnName(page), {focused: true, selected: true});

      await expand(page, 'Mes modèles');
      await page.locator('#saved-templates').selectOption(templates[1].id);
      await click(page, '[data-action=use-template]'); await page.locator('#notice').filter({hasText: /^Composition créée depuis le modèle\.$/}).waitFor();
      doc = await last(page);
      assert.equal(doc.name, 'Modèle neutre · composition'); assert.equal(doc.subject, UNDATED);
      assert.equal(await notice(page), 'Composition créée depuis le modèle.', 'aucun signalement sans date');
      assert.equal((await state(page)).templates.find(t => t.id === templates[0].id).subject, DATED, 'le modèle lui-même est intact');
    } finally { await browser.close(); }
  });

  test(`point de départ « copie d’une composition » : objet daté remplacé et signalé, nom numéroté (${engine})`, async () => {
    const browser = await launcher.launch();
    try {
      const {page} = await open(browser);
      await page.locator('#document-name').fill('Édition A'); await page.locator('#subject').fill(DATED); await saved(page);
      const sourceId = (await last(page)).id;
      await home(page);
      await click(page, `[data-document="${sourceId}"] [data-library-action=duplicate]`);
      await page.locator('#notice').filter({hasText: /Copie/}).waitFor();
      let lib = await state(page), copy = lib.documents.find(d => d.id === lib.activeId);
      assert.equal(copy.name, 'Édition A · copie'); assert.equal(copy.subject, 'Édition A · copie');
      assert((await notice(page)).includes(DATED));
      await click(page, `[data-document="${sourceId}"] [data-library-action=duplicate]`);
      await page.waitForFunction(() => MailBuilder.library.documents.length === 3);
      lib = await state(page);
      assert.equal(lib.documents.find(d => d.id === lib.activeId).name, 'Édition A · copie (2)');
      assert.equal(lib.documents.find(d => d.id === sourceId).subject, DATED, 'la composition source est intacte');
      // Objet sans date : conservé tel quel, sans signalement.
      await home(page); await click(page, `[data-document="${sourceId}"] [data-library-action=open]`);
      await page.locator('#subject').fill(UNDATED); await saved(page); await home(page);
      await click(page, `[data-document="${sourceId}"] [data-library-action=duplicate]`);
      await page.waitForFunction(() => MailBuilder.library.documents.length === 4);
      lib = await state(page); copy = lib.documents.find(d => d.id === lib.activeId);
      assert.equal(copy.subject, UNDATED); assert(!(await notice(page)).includes('date'));
    } finally { await browser.close(); }
  });
}
