const test = require('node:test');
const {open, click, established, chromium, assert} = require('./browser-support.cjs');

// Écarts du préaudit RGAA du 6 novembre 2026 (docs/accessibilite/preaudit-20261106/RAPPORT.md).
const focused = page => page.evaluate(() => { const e = document.activeElement; return e.id || e.dataset.action || e.tagName.toLowerCase(); });
const described = (page, selector) => page.locator(selector).evaluate(e => (e.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => document.getElementById(id)?.textContent.trim() || `#${id} absent`));

test('11.11 : un nom de newsletter vide demande le nom, sans jargon interne', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await page.locator('#document-name').fill('');
    assert.equal(await page.locator('#document-name').getAttribute('aria-invalid'), 'true');
    assert.deepEqual(await described(page, '#document-name'), ['Erreur : Renseignez le nom de la newsletter.']);
    assert.doesNotMatch(await page.locator('#error').textContent(), /Identifiant/);
  } finally { await browser.close(); }
});

test('10.4 : avec le texte à 200 %, les composants du catalogue restent lisibles en entier', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser, {viewport: {width: 1280, height: 900}});
    await click(page, 'summary:has-text("Ajouter un composant")');
    await page.addStyleTag({content: 'html { font-size: 200% !important; }'});
    const list = await page.locator('#catalogue').evaluate(s => ({client: s.clientWidth, scroll: s.scrollWidth, overflowX: getComputedStyle(s).overflowX}));
    // Les options passent à la ligne ; un moteur qui ne le permet pas garde un défilement horizontal, jamais une coupure.
    assert(list.scroll <= list.client || /auto|scroll/.test(list.overflowX), JSON.stringify(list));
    if (process.env.MAIL_BUILDER_ENGINE === undefined || process.env.MAIL_BUILDER_ENGINE === 'chromium') assert(list.scroll <= list.client, JSON.stringify(list));
  } finally { await browser.close(); }
});

test('7.1 : annuler « Supprimer la newsletter » rend le focus au bouton', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); await established(page);
    for (const cancel of ['button', 'Escape']) {
      await click(page, '[data-action=remove-document]'); await page.locator('#library-dialog[open]').waitFor();
      if (cancel === 'button') await click(page, '#library-cancel'); else await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.getElementById('library-dialog').open);
      // L'événement « close » suit la fermeture : laisser passer sa tâche avant de lire le focus.
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 50)));
      assert.equal(await focused(page), 'remove-document', `fermeture par ${cancel}`);
    }
  } finally { await browser.close(); }
});

test('11.10 : un JSON invalide signale le champ concerné et efface l’annonce précédente', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await page.evaluate(() => MailBuilder.notice('Annonce précédente.'));
    await click(page, 'summary:has-text("Importer du JSON")');
    await page.locator('#json-input').fill('{ pas du json');
    await click(page, '[data-action=json-import]');
    await page.waitForFunction(() => !document.getElementById('error').hidden);
    assert.equal(await page.locator('#json-input').getAttribute('aria-invalid'), 'true');
    const [message] = await described(page, '#json-input');
    assert.match(message, /^Erreur : /);
    assert.equal(await focused(page), 'json-input');
    assert.equal(await page.locator('#notice').textContent(), '');
    // Une nouvelle saisie retire le signalement.
    await page.locator('#json-input').fill('{}');
    assert.equal(await page.locator('#json-input').getAttribute('aria-invalid'), null);
    assert.deepEqual(await described(page, '#json-input'), []);
  } finally { await browser.close(); }
});

test('11.9 : chaque « Aller au bloc » du contrôle avant copie est décrit par son avertissement', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser, {permissions: ['clipboard-read', 'clipboard-write']});
    await click(page, '[data-action=copy]'); await page.locator('#check-dialog[open]').waitFor();
    const items = await page.locator('#check-list li').evaluateAll(list => list.map(li => ({message: li.querySelector('p').textContent.trim(), description: (li.querySelector('button').getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent.trim()).join(' ')})));
    assert(items.length > 1, JSON.stringify(items));
    for (const item of items) assert.equal(item.description, item.message);
  } finally { await browser.close(); }
});
