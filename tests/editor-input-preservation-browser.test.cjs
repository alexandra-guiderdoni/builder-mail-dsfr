const test = require('node:test');
const path = require('node:path');
const {open, click, saved, expand, state, chromium, assert, root} = require('./browser-support.cjs');
const png = path.join(root, 'app/assets/icon-192.png');

// Retarde la lecture de l’image jusqu’à la libération explicite de la promesse du test.
async function holdImage(page) {
  await page.evaluate(() => {
    const files = MailBuilder.Files;
    const gate = new Promise(resolve => { window.releaseImage = resolve; });
    MailBuilder.Files = {...files, image: async file => { await gate; MailBuilder.Files = files; return files.image(file); }};
  });
  await page.locator('[data-image-field]').first().setInputFiles(png);
  await page.waitForFunction(() => MailBuilder.pendingInputs === 1);
}
async function release(page, {persist = true} = {}) {
  await page.evaluate(() => window.releaseImage());
  await page.waitForFunction(() => MailBuilder.pendingInputs === 0);
  if (persist) await saved(page);
}
const textField = page => page.locator('#block-editor [data-field]').first();
const caret = page => page.evaluate(() => { const e = document.activeElement; return {id: e.id, start: e.selectionStart, end: e.selectionEnd}; });
const imageValue = async page => { const s = await state(page), block = s.documents.find(d => d.id === s.activeId).blocks[0]; return Object.values(block.values).find(v => String(v).startsWith('data:image/')); };

test('la fin du chargement d’une image garde le champ, le focus, le curseur et la suite de la frappe', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    await holdImage(page);
    const field = textField(page), id = await field.getAttribute('id');
    await field.focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('ABC');
    await release(page);
    assert(await imageValue(page), 'l’image chargée doit être incorporée');
    assert.deepEqual(await caret(page), {id, start: 3, end: 3});
    await page.keyboard.type('DEF');
    assert.equal(await field.inputValue(), 'ABCDEF');
    await saved(page);
    assert.equal(await field.inputValue(), 'ABCDEF');
    assert.equal(observations.errors.length, 0);
  } finally { await browser.close(); }
});

test('la fin du chargement pendant une sélection à remplacer garde la sélection', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await holdImage(page);
    const field = textField(page), id = await field.getAttribute('id');
    await field.focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('0123456789');
    await field.evaluate(e => e.setSelectionRange(2, 6));
    await release(page);
    assert.deepEqual(await caret(page), {id, start: 2, end: 6});
    await page.keyboard.type('X');
    assert.equal(await field.inputValue(), '01X6789');
  } finally { await browser.close(); }
});

test('la fin du chargement pendant une composition IME synthétique ne remplace pas le champ avant compositionend', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await holdImage(page);
    const field = textField(page), id = await field.getAttribute('id');
    await field.focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('AB');
    await field.evaluate(e => {
      window.compositionTrace = [];
      for (const type of ['compositionstart', 'input', 'compositionend', 'focusout']) e.addEventListener(type, event => window.compositionTrace.push({type, isComposing: event.isComposing, trusted: event.isTrusted, value: e.value, focused: document.activeElement === e, connected: e.isConnected}));
    });
    await field.evaluate(e => { e.__marque = true; e.dispatchEvent(new CompositionEvent('compositionstart', {bubbles: true})); });
    // insertText déclenche une composition complète sous Firefox, donc termine le scénario.
    // Ici la composition reste synthétique et explicitement ouverte jusqu’à compositionend.
    await field.evaluate(e => {
      e.setRangeText('é', e.selectionStart, e.selectionEnd, 'end');
      e.dispatchEvent(new InputEvent('input', {bubbles: true, data: 'é', inputType: 'insertCompositionText', isComposing: true}));
    });
    await release(page);
    assert(await field.evaluate(e => e.__marque === true && e.isConnected && document.activeElement === e), `le champ en composition doit rester le même nœud, focalisé : ${JSON.stringify(await page.evaluate(() => window.compositionTrace))}`);
    assert.equal(await field.inputValue(), 'ABé');
    assert.deepEqual(await caret(page), {id, start: 3, end: 3});
    await field.evaluate(e => e.dispatchEvent(new CompositionEvent('compositionend', {bubbles: true, data: 'é'})));
    await page.waitForFunction(() => document.querySelector('#block-editor [data-field]').__marque === undefined);
    assert.deepEqual(await caret(page), {id, start: 3, end: 3});
    assert.equal(await textField(page).inputValue(), 'ABé');
    assert(await imageValue(page), 'l’image doit apparaître après la composition');
    await page.keyboard.type('DEF');
    assert.equal(await textField(page).inputValue(), 'ABéDEF');
  } finally { await browser.close(); }
});

test('une saisie invalide reste visible pendant et après le chargement', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await holdImage(page);
    const source = page.locator('#article-source');
    await source.fill('https://'); await source.press('End');
    await release(page, {persist: false});
    // Contrat de #37 : l’URL invalide est un brouillon hors du modèle ; il survit au rechargement de l’éditeur
    // et son erreur apparaît au départ du champ.
    assert.equal(await source.inputValue(), 'https://');
    assert.equal(await page.evaluate(() => [...MailBuilder.drafts.values()].some(d => d.input === 'article-source')), true);
    await source.blur();
    await page.locator('[data-field-error="article-source"]').waitFor();
    assert.equal(await source.getAttribute('aria-invalid'), 'true');
  } finally { await browser.close(); }
});

test('la frappe garde les sélections de modèle et d’identité, et un identifiant disparu revient au choix vide', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await expand(page, 'Mes modèles'); await expand(page, 'Identités de service'); await page.locator('#template-name').fill('Modèle de recette'); await click(page, '[data-action=save-template]'); await saved(page);
    await page.evaluate(() => MailBuilder.State.change(lib => { lib.identities.push({id: 'identite-recette', name: 'Identité de recette', blocks: MailBuilder.Model.copy(lib.documents.find(d => d.id === lib.activeId).blocks.slice(0, 1))}); }));
    await saved(page);
    const templateId = (await state(page)).templates[0].id;
    await page.locator('#saved-templates').selectOption(templateId);
    await page.locator('#identities').selectOption('identite-recette');
    await page.locator('#subject').fill('Objet'); await page.locator('#subject').pressSequentially('s');
    await textField(page).fill('Texte');
    assert.equal(await page.locator('#saved-templates').inputValue(), templateId);
    assert.equal(await page.locator('#identities').inputValue(), 'identite-recette');
    const before = (await state(page)).documents.length;
    await click(page, '[data-action=use-template]'); await saved(page);
    assert.equal((await state(page)).documents.length, before + 1);
    // Identifiants disparus : retour au choix vide.
    await page.locator('#saved-templates').selectOption(templateId); await page.locator('#identities').selectOption('identite-recette');
    await page.evaluate(() => MailBuilder.State.change(lib => { lib.templates = []; lib.identities = []; }));
    await page.locator('#subject').pressSequentially('t');
    assert.equal(await page.locator('#saved-templates').inputValue(), '');
    assert.equal(await page.locator('#identities').inputValue(), '');
  } finally { await browser.close(); }
});
