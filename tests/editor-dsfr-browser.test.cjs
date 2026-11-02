const test = require('node:test');
const path = require('node:path');
const {open, enterEditor, click, saved, expand, download, confirmChecks, selectBlock, state, chromium, fs, evidence, assert} = require('./browser-support.cjs');

test('intitulé source : saisie, aperçu, presse-papiers, fichier, rechargement et transfert hors connexion', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser, {offline: true, permissions: ['clipboard-read', 'clipboard-write']});
    const id = await page.evaluate(() => MailBuilder.doc().blocks.find(b => b.component === 'mail-19').id);
    await selectBlock(page, id);
    const url = 'https://exemple.invalid/dossier', label = 'Lire « État & numérique » <dossier>';
    await page.locator('#article-source').fill(url); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'article-source-label');
    await page.locator('#article-source-label').fill(label); await saved(page);
    await page.locator('#preview').scrollIntoViewIfNeeded();
    const link = page.frameLocator('#preview').locator(`a[href="${url}"]`);
    await link.waitFor({state: 'visible'}); assert.equal(await link.textContent(), label);
    await click(page, '[data-action=copy]'); await confirmChecks(page);
    await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
    const copied = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return {html: await (await item.getType('text/html')).text(), plain: await (await item.getType('text/plain')).text()};
    });
    assert(copied.html.includes('Lire « État &amp; numérique » &lt;dossier&gt;'));
    assert(copied.plain.includes(label + '\n' + url));
    const mail = await download(page, '[data-action=export-mail]', 'intitule-courriel.html');
    assert((await fs.readFile(mail, 'utf8')).includes('Lire « État &amp; numérique » &lt;dossier&gt;</a>'));
    await page.locator('#article-source').fill(''); await saved(page);
    assert.equal(await page.locator('#article-source-label').inputValue(), label);
    await page.waitForFunction(() => !MailBuilder.doc().blocks.find(b => b.component === 'mail-19').source);
    await page.locator('#article-source').fill(url); await saved(page);
    await page.reload(); await page.waitForFunction(() => MailBuilder.ready); await enterEditor(page); await selectBlock(page, id);
    assert.equal(await page.locator('#article-source-label').inputValue(), label);
    await page.locator('#preview').scrollIntoViewIfNeeded();
    await page.frameLocator('#preview').locator(`a[href="${url}"]`).waitFor({state: 'visible'});
    await expand(page, 'Fichiers et récupération');
    const file = await download(page, '[data-action=export-document]', 'intitule-composition.json');
    const project = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.equal(project.blocks.find(b => b.id === id).sourceLabel, label);
    const fresh = await open(browser, {offline: true}); await expand(fresh.page, 'Fichiers et récupération');
    await fresh.page.locator('#project-input').setInputFiles(file); await saved(fresh.page);
    const restored = await state(fresh.page), block = restored.documents.find(d => d.id === restored.activeId).blocks.find(b => b.source === url);
    assert.equal(block.sourceLabel, label); await selectBlock(fresh.page, block.id);
    assert.equal(await fresh.page.locator('#article-source-label').inputValue(), label);
    assert.deepEqual(observations.errors, []); assert(!observations.requests.some(u => /^https?:/.test(u)));
  } finally { await browser.close(); }
});

test('ressources DSFR locales : Marianne, conteneurs communs, grille et repli à cinq largeurs', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser, {offline: true}), checks = [];
    for (const width of [320, 768, 992, 1248, 1440]) {
      await page.setViewportSize({width, height: 1000});
      const value = await page.evaluate(() => {
        const box = e => { const r = e.getBoundingClientRect(); return {x: r.x, width: r.width, top: r.top}; };
        return {viewport: innerWidth, scroll: document.documentElement.scrollWidth,
          containers: [...document.querySelectorAll('.app-header>.fr-container,main.fr-container,.app-footer>.fr-container')].map(box),
          columns: [...document.querySelectorAll('.composition-panel,.preview-panel')].map(box),
          gutter: getComputedStyle(document.querySelector('.composition-panel')).paddingLeft,
          panelPadding: getComputedStyle(document.querySelector('.composition-panel>.app-panel')).paddingLeft,
          font: getComputedStyle(document.body).fontFamily, fonts: [...document.fonts].map(f => ({family: f.family, weight: f.weight, status: f.status}))};
      });
      assert.equal(value.scroll, width); assert(value.font.startsWith('Marianne'));
      assert(value.fonts.filter(f => f.family === 'Marianne' && f.status === 'loaded').length === 3);
      for (const container of value.containers) { assert.equal(container.width, Math.min(width, 1248)); assert.equal(container.x, Math.max(0, (width - 1248) / 2)); }
      assert.equal(value.gutter, width < 992 ? '8px' : '12px'); assert.equal(value.panelPadding, width < 576 ? '16px' : '24px');
      const [editor, preview] = value.columns;
      if (width >= 992) { assert(Math.abs(editor.width / preview.width - 5 / 7) < .001); assert.equal(editor.top, preview.top); }
      else { assert.equal(editor.width, preview.width); assert(preview.top > editor.top); }
      await page.frameLocator('#preview').locator('img').first().waitFor({state: 'visible'});
      await click(page, '[data-action=library-home]');
      const card = await page.locator('#newsletter-list>li').first().evaluate(e => ({width: e.getBoundingClientRect().width, row: e.parentElement.getBoundingClientRect().width}));
      assert(Math.abs(card.width / card.row - (width < 768 ? 1 : .5)) < .001);
      await enterEditor(page); checks.push(value);
    }
    await page.screenshot({path: path.join(evidence, 'editeur-dsfr-1440.png'), fullPage: true});
    await page.setViewportSize({width: 320, height: 1000});
    const summary = page.locator('summary').filter({hasText: 'Mes modèles'});
    await summary.focus(); await page.keyboard.press('Enter'); assert(await summary.evaluate(e => e.parentElement.open));
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'template-name');
    await page.screenshot({path: path.join(evidence, 'editeur-dsfr-320.png'), fullPage: true});
    assert.deepEqual(observations.errors, []); assert(!observations.requests.some(u => /^https?:/.test(u)));
    await fs.writeFile(path.join(evidence, 'editeur-dsfr.json'), JSON.stringify({checks, portableOffline: true, keyboardSummary: true, errors: observations.errors}, null, 2));
  } finally { await browser.close(); }
});

// Modèles et identités : chaque champ et chaque liste forment un groupe DSFR (1,5 rem dessous), le bouton
// d'enregistrement ne touche ni le champ qui le précède ni le libellé qui le suit.
test('modèles et identités : champ, bouton et liste espacés selon les groupes DSFR', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    for (const [summary, input, action, select] of [['Mes modèles', 'template-name', 'save-template', 'saved-templates'], ['Identités de service', 'identity-name', 'save-identity', 'identities']]) {
      await expand(page, summary);
      const gaps = await page.evaluate(([input, action, select]) => {
        const box = element => element.getBoundingClientRect(), field = document.getElementById(input), button = document.querySelector(`[data-action=${action}]`);
        const label = document.querySelector(`label[for=${select}]`), rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        return {afterField: (box(button).top - box(field).bottom) / rem, beforeList: (box(label).top - box(button).bottom) / rem,
          groups: [field.closest('.fr-input-group')?.contains(document.querySelector(`label[for=${input}]`)), document.getElementById(select).closest('.fr-select-group')?.contains(label)]};
      }, [input, action, select]);
      assert.deepEqual(gaps.groups, [true, true], summary);
      assert.ok(gaps.afterField >= 1.5, `${summary} : ${gaps.afterField} rem sous le champ`);
      assert.ok(gaps.beforeList >= 1, `${summary} : ${gaps.beforeList} rem avant la liste`);
    }
  } finally { await browser.close(); }
});

// Composants du courriel : la liste ordonnée reste une liste (rôle explicite, conservé par WebKit sans puce),
// sans numéro DSFR en marge, puisque chaque bouton porte déjà « n. ». Champ image : le trait du détail
// « Traitement de l'image » ne touche pas le champ fichier.
test('composants du courriel sans numéro redondant ; trait du champ image espacé', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await page.evaluate(async () => { const A = MailBuilder, doc = A.Model.create('Espacements', [2, 5]); await A.State.change(lib => { lib.documents = [doc]; lib.activeId = doc.id; }); });
    const list = await page.locator('#block-list').evaluate(ol => ({tag: ol.tagName, role: ol.getAttribute('role'),
      markers: [...ol.children].map(li => getComputedStyle(li, '::marker').content), texts: [...ol.querySelectorAll('button > span')].map(s => s.textContent)}));
    assert.equal(list.tag, 'OL'); assert.equal(list.role, 'list');
    assert.deepEqual(list.markers, ['none', 'none']);
    assert.match(list.texts[0], /^1\. /); assert.match(list.texts[1], /^2\. /);
    const id = await page.evaluate(() => MailBuilder.doc().blocks[0].id);
    await selectBlock(page, id); await page.locator('#field-f2').waitFor();
    const gaps = await page.evaluate(() => ['f0', 'f2'].map(key => (document.querySelector(`[data-image-details=${key}]`).getBoundingClientRect().top - document.getElementById(`field-${key}`).getBoundingClientRect().bottom) / parseFloat(getComputedStyle(document.documentElement).fontSize)));
    for (const gap of gaps) assert.ok(gap >= 1, `${gap} rem entre le champ fichier et le trait`);
  } finally { await browser.close(); }
});

// Champs fichier : nommés par leur <label for> et, en renfort, par aria-labelledby vers ce même libellé. Certains
// outils d'audit (Tanaguru) ne lisent l'étiquette que pour les champs texte ; le nom calculé doit rester identique.
test('champs fichier : aria-labelledby vers leur libellé, nom accessible inchangé', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await page.evaluate(async () => { const A = MailBuilder, doc = A.Model.create('Nom des champs fichier', [2]); await A.State.change(lib => { lib.documents = [doc]; lib.activeId = doc.id; }); });
    await selectBlock(page, await page.evaluate(() => MailBuilder.doc().blocks[0].id)); await page.locator('#field-f2').waitFor();
    const fields = await page.evaluate(() => [...document.querySelectorAll('input[type=file][data-image-field]')].map(input => {
      const ids = (input.getAttribute('aria-labelledby') || '').split(' ').filter(Boolean), label = input.labels[0];
      return {id: input.id, labelledby: ids.map(id => document.getElementById(id)?.textContent), label: label?.textContent, sameLabel: ids.length === 1 && document.getElementById(ids[0]) === label};
    }));
    assert.equal(fields.length, 2);
    for (const field of fields) { assert.equal(field.sameLabel, true, JSON.stringify(field)); assert.deepEqual(field.labelledby, [field.label]); }
    const cdp = await page.context().newCDPSession(page);
    for (const field of fields) {
      const {result} = await cdp.send('Runtime.evaluate', {expression: `document.getElementById(${JSON.stringify(field.id)})`});
      const {node} = await cdp.send('DOM.describeNode', {objectId: result.objectId});
      const {nodes} = await cdp.send('Accessibility.getPartialAXTree', {backendNodeId: node.backendNodeId, fetchRelatives: false});
      assert.equal(nodes[0].name.value, field.label, field.id);
    }
  } finally { await browser.close(); }
});
