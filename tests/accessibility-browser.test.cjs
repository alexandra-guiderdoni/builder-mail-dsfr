const test = require('node:test');
const {chromium, open, click, expand, assert, nativeAx, nativeAxNode} = require('./browser-support.cjs');

test('dialogues : noms présents au repos, puis intitulés précis avant ouverture', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    for (const id of ['library-dialog-title', 'identity-dialog-title', 'library-confirm']) {
      assert.ok((await page.locator(`#${id}`).textContent()).trim(), `${id} ne reste pas vide dans le document`);
    }
    await page.evaluate(() => MailBuilder.Library.ask('rename', MailBuilder.library.activeId));
    assert.equal(await page.locator('#library-dialog').isVisible(), true);
    assert.equal(await page.locator('#library-dialog-title').textContent(), 'Renommer la composition');
    assert.equal(await page.locator('#library-confirm').textContent(), 'Enregistrer le nom');
    if (nativeAx) {
      const dialog = await nativeAxNode(page, '#library-dialog');
      const confirm = await nativeAxNode(page, '#library-confirm');
      assert.ok(dialog && confirm);
      assert.equal(dialog.name.value, 'Renommer la composition');
      assert.equal(confirm.name.value, 'Enregistrer le nom');
    }
    await click(page, '#library-cancel');
    assert.equal(await page.locator('#library-dialog').isVisible(), false);
  } finally { await browser.close(); }
});

test('import JSON : nom explicite cohérent avec le libellé visible et description de la page', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const description = page.locator('meta[name=description]');
    assert.equal(await description.count(), 1);
    assert.match(await description.getAttribute('content'), /newsletters.*DSFR.*HTML.*JSON/);
    await expand(page, 'Fichiers et récupération');
    const input = page.locator('#project-input');
    const label = await page.locator('label[for=project-input]').textContent();
    assert.equal(await page.locator('label[for=project-input]').isVisible(), true);
    assert.equal(await input.isVisible(), true);
    assert.equal(await input.getAttribute('aria-label'), label);
    assert.equal(await page.getByLabel(label, {exact: true}).getAttribute('id'), 'project-input');
    assert.equal(await input.getAttribute('accept'), 'application/json,.json');
    if (nativeAx) {
      const node = await nativeAxNode(page, '#project-input');
      assert.ok(node);
      assert.equal(node.ignored, false);
      assert.equal(node.name.value, label);
    }
  } finally { await browser.close(); }
});

test('les sections ouvertes restent dans la fenêtre avec les espacements de texte augmentés', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser, {viewport: {width: 320, height: 1000}});
    for (const title of ['Mes modèles', 'Identités de service', 'Ajouter un composant', 'Fichiers et récupération', 'Importer du JSON']) await expand(page, title);
    await page.addStyleTag({content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});
    for (const width of [320, 640, 1280]) {
      await page.setViewportSize({width, height: 1000});
      const measured = await page.evaluate(() => ({viewport: innerWidth, scroll: document.documentElement.scrollWidth,
        outside: [...document.querySelectorAll('input,select,textarea,summary')].filter(e => {const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1);}).map(e => e.id)}));
      assert.equal(measured.scroll, width, JSON.stringify(measured)); assert.deepEqual(measured.outside, []);
    }
  } finally { await browser.close(); }
});

test('les erreurs de champs restent associées à chacun et disparaissent après correction ou annulation', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await page.locator('#article-source').fill('http://exemple.invalid/'); await page.locator('#article-source').blur();
    await page.locator('#document-name').fill('');
    const described = selector => page.locator(selector).evaluate(e => ({invalid: e.getAttribute('aria-invalid'),
      text: (e.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ')}));
    assert.match((await described('#article-source')).text, /HTTPS/);
    assert.match((await described('#document-name')).text, /nom/i);
    await page.locator('#article-source').fill('https://exemple.invalid/');
    assert.equal((await described('#article-source')).invalid, null);
    assert.match((await described('#document-name')).text, /nom/i);
    await click(page, '[data-action=cancel-fields]');
    assert.equal(await page.locator('[data-field-error]').count(), 0);
    assert.equal((await described('#document-name')).invalid, null);
    await click(page, '[data-action=library-home]'); await click(page, '[data-library-action=rename]');
    await page.locator('#library-name').fill(''); await click(page, '#library-confirm');
    assert.match((await described('#library-name')).text, /Renseignez un nom/);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'library-name');
  } finally { await browser.close(); }
});

// Une région de statut retirée de l’arbre lorsqu’elle est vide peut perdre sa première annonce.
// Cette garde vérifie la présence native ; la preuve vocale VoiceOver reste une recette distincte.
test('la région notice reste accessible avant et après un message sans déplacer le focus', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await page.locator('#document-name').focus();
    for (const message of ['', 'Annonce de vérification', 'Annonce de remplacement', '', 'Nouvelle annonce après effacement']) {
      await page.evaluate(text => MailBuilder.notice(text), message);
      const region = await page.locator('#notice').evaluate(element => ({
        role: element.getAttribute('role'), live: element.getAttribute('aria-live'),
        display: getComputedStyle(element).display, hidden: element.hidden,
        text: element.textContent, focus: document.activeElement.id
      }));
      assert.equal(region.role, 'status');
      assert.equal(region.live, 'polite');
      assert.notEqual(region.display, 'none', 'la région reste présente même vide');
      assert.equal(region.hidden, false);
      assert.equal(region.text, message);
      assert.equal(region.focus, 'document-name');
      if (nativeAx) {
        const ax = await nativeAxNode(page, '#notice');
        assert.ok(ax, 'Chromium doit fournir le nœud natif de la région notice');
        assert.equal(ax.ignored, false, 'le statut reste exposé dans l’arbre natif');
        assert.equal(ax.role.value, 'status');
        assert.equal(ax.properties.find(property => property.name === 'live')?.value.value, 'polite');
      }
    }
  } finally { await browser.close(); }
});
