const test = require('node:test');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const {chromium, portable, assert} = require('./browser-support.cjs');
const OLD = 'c4ceadabcabd52a9184481236b39ff87b18368de';
const RAW = 'https:exemple.invalid/page-abregee';
const FIXED = 'https://exemple.invalid/destination-choisie';

async function previousLibrary(t, url = RAW) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'builder-193-owned-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const file = path.join(directory, 'ancien.html');
  await fs.writeFile(file, execFileSync('git', ['show', `${OLD}:app/distribution/portable.html`], {cwd: path.resolve(__dirname, '..'), maxBuffer: 8 * 1024 * 1024}));
  const browser = await chromium.launch(); t.after(() => browser.close());
  const context = await browser.newContext({offline: true, acceptDownloads: true}), page = await context.newPage();
  await page.goto(pathToFileURL(file).href); await page.waitForFunction(() => window.MailBuilder?.ready);
  const original = await page.evaluate(async url => {
    const A = MailBuilder, healthy = A.Model.create('Composition saine conservée', [5, 19]), legacy = A.Model.create('Composition ancienne à corriger', [40]);
    const field = A.Model.component('mail-40').fields.find(f => f.type === 'url');
    legacy.blocks[0].values[field.key] = url;
    if (A.Model.checkUrl(url)) throw new Error('Le témoin ancien doit accepter cette URL');
    await A.State.change(lib => { lib.documents = [healthy, legacy]; lib.activeId = healthy.id; });
    return await A.Storage.load();
  }, url);
  await page.goto(portable); await page.waitForFunction(() => window.MailBuilder?.ready);
  return {page, context, original};
}

async function downloadedJson(page, selector) {
  const download = page.waitForEvent('download'); await page.locator(selector).click();
  const file = await download, chunks = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

test('#193 : bibliothèque réellement enregistrée par l’ancienne version, récupération guidée puis écriture explicite', async t => {
  const {page, original} = await previousLibrary(t);
  const before = await page.evaluate(async () => ({stored: await MailBuilder.Storage.load(), documents: MailBuilder.library.documents.length, recovery: MailBuilder.recoveryOnly}));
  t.diagnostic(JSON.stringify({beforeRecovery: {memoryDocuments: before.documents, storedDocuments: before.stored.library.documents.length, recovery: before.recovery}}));
  assert.deepEqual(before.stored, original, 'aucune écriture au démarrage');
  const panel = page.locator('#legacy-url-recovery');
  assert.equal(await panel.isVisible(), true, 'les compositions anciennes doivent être proposées à la récupération, pas remplacées silencieusement');
  assert.match(await panel.innerText(), /Composition saine conservée/);
  assert.match(await panel.innerText(), /Composition ancienne à corriger/);
  assert.match(await page.locator('#library-count').innerText(), /2 compositions/);
  const input = panel.locator('input[type=url]'); assert.equal(await input.inputValue(), RAW);
  assert.equal(await panel.locator('[data-legacy-restore]').isDisabled(), true);
  assert.equal(await page.locator('#workspace').isVisible(), false, 'la bibliothèque de départ ne doit pas passer pour les données retrouvées');
  // export-mail est asynchrone : son refus est vérifié sans déclencher de téléchargement.
  assert.equal(await page.evaluate(async () => { try { await MailBuilder.Actions['export-mail'](); return false; } catch { return true; } }), true);
  assert.equal(await page.evaluate(async () => { try { await MailBuilder.Files.copy(); return false; } catch { return true; } }), true, 'refus avant toute sollicitation du presse-papiers');
  assert.deepEqual(await downloadedJson(page, '[data-legacy-export]'), original, 'vrai téléchargement du stockage original');
  await input.fill('https://exemple.invalid/ adresse invalide');
  assert.equal(await panel.locator('[data-legacy-restore]').isDisabled(), true);
  await input.fill(FIXED);
  assert.deepEqual(await page.evaluate(() => MailBuilder.Storage.load()), original, 'corriger un champ ne doit pas écrire');
  await panel.locator('[data-legacy-restore]').click();
  await page.waitForFunction(() => !document.getElementById('legacy-url-recovery'));
  const result = await page.evaluate(async () => ({stored: await MailBuilder.Storage.load(), previous: await MailBuilder.Storage.load('previous'), library: MailBuilder.library, recovery: MailBuilder.recoveryOnly, rejected: MailBuilder.Model.checkUrl('https:exemple.invalid/autre')}));
  const expected = structuredClone(original.library);
  const bad = expected.documents[1].blocks[0], key = Object.keys(bad.values).find(key => bad.values[key] === RAW); bad.values[key] = FIXED;
  assert.deepEqual(result.library, expected); assert.deepEqual(result.stored.library, expected);
  assert.deepEqual(result.previous, original, 'sauvegarde originale atomique avant remplacement');
  assert.equal(result.recovery, false); assert(result.rejected, 'nouvelle URL abrégée toujours refusée');
  await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
  assert.deepEqual(await page.evaluate(() => MailBuilder.Storage.load()), result.stored, 'relecture idempotente, aucune réécriture automatique');
  assert.equal(await page.locator('#legacy-url-recovery').count(), 0);
});

test('#193 : une écriture concurrente empêche la récupération d’écraser la nouvelle bibliothèque', async t => {
  const {page, original, context} = await previousLibrary(t);
  const other = await context.newPage(); await other.goto(portable); await other.waitForFunction(() => window.MailBuilder?.ready);
  const concurrent = await other.evaluate(async original => {
    const library = MailBuilder.Model.copy(original.library), block = library.documents[1].blocks[0];
    const key = MailBuilder.Model.component(block.component).fields.find(f => f.type === 'url').key;
    block.values[key] = 'https://exemple.invalid/choix-autre-fenetre'; library.documents[0].name = 'Travail concurrent conservé';
    return MailBuilder.Storage.save(library, original.token);
  }, original);
  assert.deepEqual(await downloadedJson(page, '[data-legacy-export]'), original, 'le secours reste celui du démarrage malgré l’écriture concurrente');
  await page.locator('#legacy-url-recovery input[type=url]').fill(FIXED);
  await page.locator('[data-legacy-restore]').click();
  await page.locator('#error').filter({hasText: 'La récupération n’a rien enregistré'}).waitFor();
  assert.deepEqual(await page.evaluate(() => MailBuilder.Storage.load()), concurrent);
  assert.deepEqual(await page.evaluate(() => MailBuilder.Storage.load('previous')), original);
  assert.equal(await page.locator('#legacy-url-recovery').isVisible(), true);
  assert.equal(await page.locator('#legacy-url-recovery input[type=url]').inputValue(), FIXED, 'correction locale conservée après refus');
});

test('#193 : une ancienne bibliothèque à URL complète reste restaurée normalement', async t => {
  const {page, original} = await previousLibrary(t, FIXED);
  assert.equal(await page.locator('#legacy-url-recovery').count(), 0);
  assert.deepEqual(await page.evaluate(() => MailBuilder.library), original.library);
  assert.deepEqual(await page.evaluate(() => MailBuilder.Storage.load()), original);
});
