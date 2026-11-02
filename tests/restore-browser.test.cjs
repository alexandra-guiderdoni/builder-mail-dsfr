const test = require('node:test');
const {open, saved, expand, state, store, chromium, assert} = require('./browser-support.cjs');

// #200 : « Restaurer une sauvegarde » remplace toute la bibliothèque par un export de bibliothèque, après confirmation,
// sans doublon, par le point d'entrée commun (#208). Les autres fichiers sont refusés avant toute fenêtre, sans rien changer.
const dialog = '#restore-dialog';
async function library(page, names) {
  await page.evaluate(async names => {
    const A = MailBuilder, docs = names.map(name => A.Model.create(name));
    await A.State.change(lib => { lib.documents = docs; lib.activeId = docs[0].id; });
  }, names);
  await saved(page);
}
const backup = (page, names) => page.evaluate(names => {
  const A = MailBuilder, lib = A.Model.initial(); lib.documents = names.map(name => A.Model.create(name)); lib.activeId = lib.documents[0].id;
  return JSON.stringify(A.Model.library(lib));
}, names);
async function choose(page, name, content) {
  await expand(page, 'Sauvegarde et import');
  await page.locator('#restore-input').setInputFiles({name, mimeType: 'application/json', buffer: Buffer.from(content)});
}
const names = async page => (await state(page)).documents.map(d => d.name);

test('#200 restaurer : remplace sans doublon après confirmation, l’ancienne bibliothèque reste l’état précédent', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await library(page, ['Actuelle A', 'Actuelle B']);
    await choose(page, 'sauvegarde.json', await backup(page, ['Sauvegardée 1', 'Sauvegardée 2', 'Sauvegardée 3']));
    await page.locator(dialog).waitFor({state: 'visible'});
    const description = await page.locator('#restore-dialog-description').textContent();
    assert.match(description, /3 newsletters/); assert.match(description, /2 newsletters/);
    assert.deepEqual(await names(page), ['Actuelle A', 'Actuelle B'], 'rien ne change avant la confirmation');
    await page.locator('#restore-confirm').click();
    await page.locator(dialog).waitFor({state: 'hidden'});
    assert.deepEqual(await names(page), ['Sauvegardée 1', 'Sauvegardée 2', 'Sauvegardée 3']);
    assert.deepEqual((await store(page)).library.documents.map(d => d.name), ['Sauvegardée 1', 'Sauvegardée 2', 'Sauvegardée 3']);
    const previous = await page.evaluate(() => MailBuilder.Storage.load('previous'));
    assert.deepEqual(previous.library.documents.map(d => d.name), ['Actuelle A', 'Actuelle B']);
    assert.match(await page.locator('#notice').textContent(), /restaurée/);
  } finally { await browser.close(); }
});

test('#200 annuler, ou exporter d’abord : la bibliothèque actuelle reste intacte jusqu’à la confirmation', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await library(page, ['Actuelle A']);
    await choose(page, 'sauvegarde.json', await backup(page, ['Sauvegardée']));
    await page.locator(dialog).waitFor({state: 'visible'});
    const download = page.waitForEvent('download'); await page.locator('#restore-export').click();
    assert.match((await download).suggestedFilename(), /bibliotheque-courriels/);
    assert.equal(await page.locator(dialog).isVisible(), true, 'exporter n’est pas confirmer');
    await page.locator('#restore-cancel').click(); await page.locator(dialog).waitFor({state: 'hidden'});
    assert.deepEqual(await names(page), ['Actuelle A']);
    assert.deepEqual((await store(page)).library.documents.map(d => d.name), ['Actuelle A']);
  } finally { await browser.close(); }
});

test('#200 refus sans modification : composition seule, données brutes, JSON invalide, autre catalogue', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await library(page, ['Actuelle A']);
    const composition = await page.evaluate(() => JSON.stringify(MailBuilder.doc()));
    const raw = JSON.stringify(await store(page));
    const other = JSON.parse(await backup(page, ['Autre'])); other.catalogue = '0'.repeat(64);
    for (const [file, content, message] of [['composition.json', composition, /seule newsletter.*Importer/], ['brut.json', raw, /données enregistrées brutes/],
      ['casse.json', '{"schema":', /JSON est invalide/], ['autre.json', JSON.stringify(other), /autre catalogue/]]) {
      await page.evaluate(() => MailBuilder.error(''));
      await choose(page, file, content);
      await page.locator('#error').filter({hasText: message}).waitFor({timeout: 5000});
      assert.equal(await page.locator(dialog).isVisible(), false, `${file} : aucune confirmation proposée`);
      assert.deepEqual(await names(page), ['Actuelle A'], file);
    }
    assert.deepEqual((await store(page)).library.documents.map(d => d.name), ['Actuelle A']);
  } finally { await browser.close(); }
});

test('#200 échec d’écriture pendant la restauration : la bibliothèque actuelle reste affichée et enregistrée', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await library(page, ['Actuelle A']);
    await choose(page, 'sauvegarde.json', await backup(page, ['Sauvegardée']));
    await page.locator(dialog).waitFor({state: 'visible'});
    await page.evaluate(() => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function(...args) { if (this.name === 'library') throw new DOMException('Quota de recette', 'QuotaExceededError'); return put.apply(this, args); }; });
    await page.locator('#restore-confirm').click();
    await page.locator('#restore-dialog-error').filter({hasText: /saturé/}).waitFor({timeout: 5000});
    assert.deepEqual(await names(page), ['Actuelle A']);
    assert.doesNotMatch(await page.locator('#notice').textContent(), /restaurée/);
  } finally { await browser.close(); }
});
