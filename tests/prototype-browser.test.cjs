const test = require('node:test');
const path = require('node:path');
const {root, click, chromium, assert} = require('./browser-support.cjs');
const portable = 'file://' + (process.env.MAIL_BUILDER_PROTOTYPE_HTML || path.join(root, 'prototype/distribution/portable.html'));
async function prototype(browser) {
  const context = await browser.newContext({offline: true, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write']});
  const page = await context.newPage(); await page.goto(portable);
  await page.waitForFunction(() => document.querySelector('#save-state').textContent !== '');
  return {page, context};
}
test('prototype : le lien source d’un paragraphe est éditable et conservé dans les sorties', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await prototype(browser), source = page.locator('#block-0-url');
    assert.equal(await source.count(), 1);
    await source.fill('https://exemple.invalid/source-modifiee');
    await page.waitForFunction(async () => (await PrototypeDraft.load())?.doc.blocks[0].url.endsWith('source-modifiee'));
    await click(page, '[data-id=texte-1] [data-duplicate]'); await click(page, '[data-id=texte-1] [data-move="1"]');
    const doc = (await page.evaluate(() => PrototypeDraft.load())).doc;
    const result = await page.evaluate(doc => ({html: MailRender.html(MailDocument.parse(JSON.stringify(doc))), plain: MailRender.plain(doc)}), doc);
    for (const value of Object.values(result)) assert.equal(value.split('https://exemple.invalid/source-modifiee').length - 1, 2);
    assert.equal(doc.blocks.filter(b => b.url.endsWith('source-modifiee')).length, 2);
    await click(page, 'section[aria-labelledby=preview-title] [data-action=copy]');
    await page.locator('#status').filter({hasText: 'Mail copié en HTML et texte.'}).waitFor();
    const copied = await page.evaluate(async () => { const [item] = await navigator.clipboard.read(); return [await (await item.getType('text/html')).text(), await (await item.getType('text/plain')).text()]; });
    assert(copied.every(text => text.split('https://exemple.invalid/source-modifiee').length - 1 === 2));
    await page.locator('#block-0-url').fill(''); await page.waitForFunction(async () => (await PrototypeDraft.load()).doc.blocks[0].url === '');
    assert.equal(await page.evaluate(async () => MailRender.plain((await PrototypeDraft.load()).doc).split('https://exemple.invalid/source-modifiee').length - 1), 1);
  } finally { await browser.close(); }
});
test('prototype : une saisie postérieure et le dernier import gagnent sur une ancienne lecture', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await prototype(browser);
    const doc = await page.evaluate(() => MailDocument.initial()); doc.subject = 'Import ancien';
    await page.evaluate(() => { const read = File.prototype.text; window.importReads = []; File.prototype.text = function() { return new Promise(resolve => importReads.push(async () => resolve(await read.call(this)))); }; });
    const upload = subject => page.locator('#project-input').setInputFiles({name: 'composition.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({...doc, subject}))});
    await upload('Import ancien'); await page.waitForFunction(() => importReads.length === 1);
    await page.locator('#subject').fill('Saisie plus récente'); await page.evaluate(() => importReads[0]());
    await page.waitForFunction(() => document.querySelector('#error').textContent.includes('obsolète') || document.querySelector('#subject').value === 'Import ancien');
    assert.equal(await page.locator('#subject').inputValue(), 'Saisie plus récente');
    await upload('Premier import'); await upload('Dernier import');
    await page.waitForFunction(() => importReads.length === 3); await page.evaluate(() => importReads[2]());
    await page.waitForFunction(() => document.querySelector('#subject').value === 'Dernier import');
    await page.evaluate(() => importReads[1]());
    await page.waitForFunction(() => document.querySelector('#error').textContent.includes('obsolète') || document.querySelector('#subject').value === 'Premier import');
    assert.equal(await page.locator('#subject').inputValue(), 'Dernier import');
    assert(!(await page.locator('#status').innerText()).includes('Premier import'));
  } finally { await browser.close(); }
});

test('prototype : deux fenêtres conservent leurs travaux et refusent une sauvegarde obsolète', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await prototype(browser);
    const saved = p => p.waitForFunction(() => document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.');
    await page.locator('#subject').fill('Version commune'); await saved(page);
    const other = await context.newPage(); await other.goto(portable);
    await other.waitForFunction(() => document.querySelector('#subject').value === 'Version commune');
    await page.locator('#subject').fill('Premier travail'); await saved(page);
    await other.locator('#subject').fill('Second travail');
    await other.waitForFunction(() => document.querySelector('#error').textContent.includes('autre fenêtre') || document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.');
    assert.equal((await page.evaluate(() => PrototypeDraft.load())).doc.subject, 'Premier travail');
    assert.equal(await other.locator('#subject').inputValue(), 'Second travail');
    assert.match(await other.locator('#error').innerText(), /autre fenêtre/);
    const event = other.waitForEvent('download'); await click(other, 'section[aria-labelledby=preview-title] [data-action=project]');
    const download = await event, stream = await download.createReadStream(); let text = '';
    for await (const chunk of stream) text += chunk;
    assert.equal(JSON.parse(text).subject, 'Second travail');
  } finally { await browser.close(); }
});
test('prototype : restaurer après une file active ne réautorise aucun ancien snapshot', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await prototype(browser);
    await page.locator('#subject').fill('État commun'); await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.');
    const other = await context.newPage(); await other.goto(portable); await other.waitForFunction(() => document.querySelector('#subject').value === 'État commun');
    await page.evaluate(() => { const storage = PrototypeDraft, gate = new Promise(resolve => { window.releaseWrites = resolve; }); window.writesFinished = 0; window.restoreReads = 0; window.PrototypeDraft = {...storage, load: (...args) => { restoreReads++; return storage.load(...args); }, save: async (...args) => { window.writing = true; await gate; try { return await storage.save(...args); } finally { writesFinished++; } }}; });
    for (const name of ['Local A', 'Local B', 'Local C']) await page.locator('#subject').fill(name);
    await page.waitForFunction(() => window.writing);
    await other.locator('#subject').fill('Travail externe'); await other.waitForFunction(() => document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.');
    await click(page, 'section[aria-labelledby=identity-title] [data-action=restore]');
    assert.equal(await page.evaluate(() => restoreReads), 0, 'La restauration doit attendre les écritures déjà demandées avant de relire un jeton.');
    await page.evaluate(() => releaseWrites());
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Brouillon relu'));
    await page.waitForFunction(() => writesFinished === 3);
    assert.equal(await page.locator('#subject').inputValue(), 'Travail externe');
    assert.equal((await page.evaluate(() => PrototypeDraft.load())).doc.subject, 'Travail externe');
  } finally { await browser.close(); }
});

test('prototype : la restauration différée ne remplace pas une saisie plus récente', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await prototype(browser);
    await page.locator('#subject').fill('Brouillon enregistré');
    await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.');
    await page.evaluate(async () => {
      const stored = await PrototypeDraft.load(); window.restorePending = false;
      window.PrototypeDraft = {...PrototypeDraft, load: () => new Promise(resolve => { window.restorePending = true; window.finishRestore = () => resolve(stored); })};
    });
    await click(page, 'section[aria-labelledby=identity-title] [data-action=restore]');
    await page.waitForFunction(() => restorePending); await page.locator('#subject').fill('Saisie pendant la lecture');
    await page.evaluate(() => finishRestore());
    await page.waitForFunction(() => document.querySelector('#error').textContent.includes('restauration') || document.querySelector('#subject').value === 'Brouillon enregistré');
    assert.equal(await page.locator('#subject').inputValue(), 'Saisie pendant la lecture');
    assert.match(await page.locator('#error').innerText(), /ignorée|modifié|obsolète/);
  } finally { await browser.close(); }
});

test('prototype : une image ancienne ignore un nouveau document et le dernier choix gagne', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await prototype(browser);
    const expected = await page.evaluate(() => MailDocument.initial().blocks.find(b => b.type === 'image').image);
    const fs = require('node:fs');
    const imageA = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'app/assets/icon-192.png')).toString('base64');
    const imageB = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'app/assets/icon-512.png')).toString('base64');
    await page.evaluate(() => {
      const decode = Image.prototype.decode; window.imageReads = [];
      Image.prototype.decode = function() { const image = this; return new Promise((resolve, reject) => imageReads.push(async () => { try { await decode.call(image); resolve(); } catch (e) { reject(e); } })); };
    });
    await page.locator('[data-image]').setInputFiles(path.join(root, 'app/assets/icon-192.png'));
    await page.waitForFunction(() => imageReads.length === 1);
    await click(page, 'section[aria-labelledby=identity-title] [data-action=demo]');
    await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.');
    await page.evaluate(() => imageReads[0]());
    await page.waitForFunction(async value => document.querySelector('#status').textContent.includes('Image obsolète') || (await PrototypeDraft.load()).doc.blocks.find(b => b.type === 'image').image === value, imageA);
    assert.equal((await page.evaluate(() => PrototypeDraft.load())).doc.blocks.find(b => b.type === 'image').image, expected);
    await page.locator('[data-image]').setInputFiles(path.join(root, 'app/assets/icon-192.png'));
    await page.waitForFunction(() => imageReads.length === 2);
    await page.locator('[data-image]').setInputFiles(path.join(root, 'app/assets/icon-512.png'));
    await page.waitForFunction(() => imageReads.length === 3); await page.evaluate(() => imageReads[2]());
    await page.waitForFunction(async value => (await PrototypeDraft.load()).doc.blocks.find(b => b.type === 'image').image === value, imageB);
    await page.evaluate(() => imageReads[1]());
    await page.waitForFunction(async value => document.querySelector('#status').textContent.includes('Image obsolète') || (await PrototypeDraft.load()).doc.blocks.find(b => b.type === 'image').image === value, imageA);
    assert.equal((await page.evaluate(() => PrototypeDraft.load())).doc.blocks.find(b => b.type === 'image').image, imageB);
  } finally { await browser.close(); }
});

test('prototype : une image tronquée dans le fichier ne remplace ni le document ni le brouillon', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await prototype(browser);
    await page.locator('#subject').fill('Composition à conserver');
    await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Brouillon sauvegardé dans ce navigateur.');
    const before = await page.evaluate(() => PrototypeDraft.load());
    const bad = structuredClone(before.doc); bad.subject = 'Import tronqué';
    bad.logo = 'data:image/png;base64,' + require('node:fs').readFileSync(path.join(root, 'app/assets/icon-192.png')).subarray(0, 40).toString('base64');
    await page.locator('#project-input').setInputFiles({name: 'tronque.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad))});
    await page.waitForFunction(() => !document.querySelector('#error').hidden || document.querySelector('#subject').value === 'Import tronqué');
    assert.equal(await page.locator('#subject').inputValue(), 'Composition à conserver');
    assert.deepEqual(await page.evaluate(() => PrototypeDraft.load()), before);
    assert.match(await page.locator('#error').innerText(), /logo|image/i);
  } finally { await browser.close(); }
});

test('prototype : une URL invalide reste signalée et bloque la diffusion jusqu’à correction', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await prototype(browser), field = page.locator('#block-2-url');
    await field.fill('https://'); await page.locator('#service').fill('Autre saisie valide');
    await page.evaluate(() => {
      window.outputAttempts = {download: 0, clipboard: 0}; const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() { if (this.download) outputAttempts.download++; return click.call(this); };
      Object.defineProperty(navigator, 'clipboard', {value: {write: async () => { outputAttempts.clipboard++; }}});
    });
    for (const action of ['mail', 'project', 'copy']) {
      await click(page, `section[aria-labelledby=preview-title] [data-action=${action}]`);
      assert.deepEqual(await page.evaluate(() => outputAttempts), {download: 0, clipboard: 0}, action);
    }
    assert.equal(await field.getAttribute('aria-invalid'), 'true'); assert.equal(await field.getAttribute('aria-describedby'), 'error');
    assert.match(await page.locator('#error').innerText(), /bloc 3/i);
    await field.fill('https://exemple.invalid/corrige');
    assert.equal(await field.getAttribute('aria-invalid'), null);
    const event = page.waitForEvent('download'); await click(page, 'section[aria-labelledby=preview-title] [data-action=mail]');
    const stream = await (await event).createReadStream(); let html = ''; for await (const chunk of stream) html += chunk;
    assert(html.includes('https://exemple.invalid/corrige'));
    assert.equal((await page.evaluate(() => PrototypeDraft.load())).doc.blocks[2].url, 'https://exemple.invalid/corrige');
  } finally { await browser.close(); }
});

test('prototype : déplacement, duplication et retrait gardent un repère clavier pertinent', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await prototype(browser);
    const focusedBlock = () => page.evaluate(() => document.activeElement.closest('[data-id]')?.dataset.id);
    await click(page, '[data-id=image-1] [data-move="1"]'); assert.equal(await focusedBlock(), 'image-1');
    await click(page, '[data-id=image-1] [data-duplicate]');
    const clone = await focusedBlock(); assert(clone && clone !== 'image-1');
    await page.keyboard.press('Enter'); assert.equal(await page.locator('[data-id]').count(), 4, 'Entrée sur le repère ne duplique pas un autre bloc.');
    await click(page, `[data-id="${clone}"] [data-remove]`); assert.equal(await focusedBlock(), 'image-1');
    while (await page.locator('[data-id]').count()) await click(page, '#blocks [data-id]:first-child [data-remove]');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.add), 'text');
    await page.keyboard.press('Enter'); assert.equal(await page.locator('[data-id]').count(), 1);
  } finally { await browser.close(); }
});
