const test = require('node:test');
const {chromium, open, portable, enterEditor, click, expand, saved, state, store, assert} = require('./browser-support.cjs');
const DRAFT = 'https://exemple.invalid/ brouillon à préserver';
const CORRECTED = 'https://exemple.invalid/brouillon-corrige';
const READ_ONLY = '#read-only';
const TAKE_OVER = '[data-action=take-over]';
const EXPORT_MEMORY = '[data-action=read-only-export]';
const RELOAD = '[data-action=reload-page]';
async function secondPage(context) {
  const page = await context.newPage(); await page.goto(portable);
  await page.waitForFunction(() => window.MailBuilder?.ready); await enterEditor(page); return page;
}
async function jsonDownload(page, selector) {
  const event = page.waitForEvent('download'); event.then(() => {}, () => {});
  await click(page, selector); const download = await event, chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function enterDraft(page) {
  const input = page.locator('#article-source');
  await input.click(); await input.fill(DRAFT);
  await page.waitForFunction(value => [...MailBuilder.drafts.values()].some(d => d.input === 'article-source' && d.value === value), DRAFT);
  assert.equal(await input.inputValue(), DRAFT);
  assert.equal(await page.evaluate(() => MailBuilder.doc().blocks.find(b => b.id === MailBuilder.selected).source), '');
}
function excludesDraft(library) {
  assert(!JSON.stringify(library).includes(DRAFT), 'le modèle JSON valide ne contient jamais le brouillon');
}

test('#162 : reprise réelle entre onglets, brouillon remappé et corrigeable sans contaminer le modèle', async () => {
  const browser = await chromium.launch();
  try {
    const {page: owner, context} = await open(browser);
    await owner.locator('#document-name').fill('Newsletter source partagée'); await saved(owner);
    const other = await secondPage(context);
    const before = await other.evaluate(() => ({doc: MailBuilder.doc().id, block: MailBuilder.selected}));
    // Préparer le secours avant la saisie : sa première ouverture n’est pas l’objet de cette course.
    await expand(other, 'Fichiers et récupération');
    await enterDraft(other);
    await owner.locator('#subject').fill('Sujet propriétaire enregistré'); await saved(owner);
    const ownerRecord = await store(owner);
    // Une sauvegarde UI découvre le jeton périmé ; aucun conflit simulé ni BroadcastChannel remplacé.
    await click(other, '[data-action=save-now]');
    await other.locator(READ_ONLY).waitFor({state: 'visible'});
    assert.match(await other.locator('#read-only-message').innerText(), /autre fenêtre/);
    const exported = await jsonDownload(other, EXPORT_MEMORY); excludesDraft(exported);
    assert.deepEqual(exported, await state(other));
    await click(other, TAKE_OVER); await other.locator(READ_ONLY).waitFor({state: 'hidden'});
    await other.locator('#save-state').filter({hasText: 'les champs invalides restent non enregistrés'}).waitFor();
    assert.equal(await other.locator(READ_ONLY).isVisible(), false);
    const after = await other.evaluate(() => ({doc: MailBuilder.doc().id, block: MailBuilder.selected, drafts: [...MailBuilder.drafts.values()], library: MailBuilder.Model.library(MailBuilder.library)}));
    assert.notEqual(after.doc, before.doc, 'la composition récupérable a un nouvel identifiant');
    assert.notEqual(after.block, before.block, 'le bloc de la copie a un nouvel identifiant');
    assert.equal(after.drafts.length, 1);
    assert.deepEqual({doc: after.drafts[0].doc, block: after.drafts[0].block, input: after.drafts[0].input, value: after.drafts[0].value}, {doc: after.doc, block: after.block, input: 'article-source', value: DRAFT});
    assert.equal(await other.locator('#article-source').inputValue(), DRAFT, 'la saisie remappée reste dans le champ');
    excludesDraft(after.library);
    const storedAfter = await store(other); excludesDraft(storedAfter.library);
    assert.deepEqual(storedAfter.library.documents.find(d => d.id === before.doc), ownerRecord.library.documents.find(d => d.id === before.doc), 'la version propriétaire reste intacte');
    await other.locator('#article-source').fill(CORRECTED); await saved(other);
    assert.equal(await other.evaluate(() => MailBuilder.drafts.size), 0);
    assert.equal(await other.locator('#article-source').inputValue(), CORRECTED);
    const recovered = (await store(other)).library.documents.find(d => d.id === after.doc);
    assert.equal(recovered.blocks.find(b => b.id === after.block).source, CORRECTED, 'la correction est réellement enregistrée sur la copie');
    assert.deepEqual(await jsonDownload(other, '[data-action=export-library]'), await state(other));
  } finally { await browser.close(); }
});

test('#162 : exporter le modèle ne supprime pas la vraie confirmation beforeunload du brouillon', async t => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await page.locator('#document-name').fill('Rechargement avec brouillon'); await saved(page);
    await enterDraft(page);
    await page.evaluate(() => { window.__draftReloadWitness = 'document initial'; MailBuilder.State.outdated(); });
    t.diagnostic('Transition version injectée par State.outdated ; les dialogues beforeunload et le rechargement sont réels. Aucune preuve de mise à jour SW nouvelle.');
    await page.locator(RELOAD).waitFor({state: 'visible'});
    const exported = await jsonDownload(page, EXPORT_MEMORY); excludesDraft(exported);
    assert.equal(await page.evaluate(() => MailBuilder.drafts.size), 1);
    const initialStored = await store(page);
    const button = page.locator(RELOAD);
    await button.focus();
    const firstDialogEvent = page.waitForEvent('dialog');
    const firstActivation = button.press('Enter', {noWaitAfter: true}); firstActivation.then(() => {}, () => {});
    const firstDialog = await firstDialogEvent;
    assert.equal(firstDialog.type(), 'beforeunload'); await firstDialog.dismiss(); await firstActivation;
    assert.equal(await page.evaluate(() => window.__draftReloadWitness), 'document initial', 'annuler préserve le document réel');
    assert.equal(await page.locator('#article-source').inputValue(), DRAFT);
    assert.equal(await page.evaluate(() => MailBuilder.drafts.size), 1);
    assert.deepEqual(await store(page), initialStored, 'le refus de navigation n’écrit rien');
    const secondDialogEvent = page.waitForEvent('dialog'), navigation = page.waitForEvent('load');
    const secondActivation = button.press('Enter', {noWaitAfter: true}); secondActivation.then(() => {}, () => {});
    const secondDialog = await secondDialogEvent;
    assert.equal(secondDialog.type(), 'beforeunload'); await secondDialog.accept(); await secondActivation; await navigation;
    await page.waitForFunction(() => window.MailBuilder?.ready); await enterEditor(page);
    assert.equal(await page.evaluate(() => window.__draftReloadWitness), undefined, 'accepter abandonne l’ancien document');
    assert.equal(await page.evaluate(() => MailBuilder.drafts.size), 0);
    assert.equal(await page.locator('#article-source').inputValue(), '', 'le modèle valide est relu, pas le brouillon abandonné');
    assert.deepEqual(await store(page), initialStored);
  } finally { await browser.close(); }
});

test('#166 : suppression IndexedDB réelle, diagnostic stockage, export mémoire et reprise cohérents', async () => {
  const browser = await chromium.launch();
  try {
    const {page, context} = await open(browser);
    await page.locator('#document-name').fill('Bibliothèque avant suppression'); await saved(page);
    const previous = await store(page); assert(previous.token);
    const eraser = await secondPage(context);
    const deletion = await eraser.evaluate(async () => {
      const witness = await new Promise((resolve, reject) => {
        const request = indexedDB.open('builder-mail-dsfr-library', 1);
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      let versionChanges = 0;
      witness.onversionchange = () => { versionChanges++; witness.close(); };
      try {
        await new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase('builder-mail-dsfr-library');
          request.onsuccess = resolve; request.onerror = () => reject(request.error);
          request.onblocked = () => reject(new Error('Suppression de la base de recette bloquée'));
        });
        return {deleted: true, versionChanges};
      } finally { witness.close(); }
    });
    assert.deepEqual(deletion, {deleted: true, versionChanges: 1}, 'suppression et versionchange sont réellement observés');
    await page.locator('#subject').fill('Travail conservé après disparition du stockage');
    await page.locator(READ_ONLY).waitFor({state: 'visible'});
    const messages = [await page.locator('#error').innerText(), await page.locator('#read-only-message').innerText()];
    for (const text of messages) { assert.match(text, /stockage/); assert.doesNotMatch(text, /autre fenêtre|copies horodatées/); }
    assert.equal(await store(page), undefined, 'aucun record n’est recréé silencieusement lors du refus');
    const memory = await state(page); excludesDraft(memory);
    assert.equal(memory.documents.find(d => d.id === memory.activeId).subject, 'Travail conservé après disparition du stockage');
    assert.deepEqual(await jsonDownload(page, EXPORT_MEMORY), memory, 'le téléchargement réel contient le travail en mémoire');
    await click(page, TAKE_OVER); await saved(page);
    assert.equal(await page.locator(READ_ONLY).isVisible(), false);
    assert.deepEqual((await store(page)).library, memory);
    assert.match(await page.locator('#notice').innerText(), /bibliothèque en mémoire.*enregistrée de nouveau/);
    assert.doesNotMatch(await page.locator('#notice').innerText(), /copie horodatée|autre fenêtre/);
    assert.equal(await page.locator('#subject').inputValue(), 'Travail conservé après disparition du stockage');
  } finally { await browser.close(); }
});
