const test = require('node:test');
const {chromium, open, expand, saved, state, store, assert} = require('./browser-support.cjs');
const reading = 'Lecture du fichier de travail…';
const unreadable = 'Le fichier « illisible.json » n’a pas pu être lu. Vérifiez qu’il est toujours présent sur votre poste, puis choisissez-le de nouveau ou collez son contenu dans « Importer du JSON ». Votre bibliothèque n’est pas modifiée.';
const status = page => page.evaluate(() => { const error = document.querySelector('#error'); return {error: error.hidden ? null : error.textContent, notice: document.querySelector('#notice').textContent}; });
const upload = (page, name, content) => page.locator('#project-input').setInputFiles({name, mimeType: 'application/json', buffer: Buffer.from(content)});

test('application : un fichier illisible affiche un message français, retire la notice et laisse la bibliothèque intacte', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    await page.locator('#document-name').fill('Bibliothèque à préserver'); await saved(page);
    const before = await state(page), persisted = await store(page);
    const incoming = JSON.stringify(await page.evaluate(() => MailBuilder.Model.create('Fichier synthétique')));
    await expand(page, 'Fichiers et récupération');
    await page.evaluate(() => {
      window.failRead = null;
      File.prototype.text = function() { return new Promise((resolve, reject) => { window.failRead = () => reject(new DOMException('The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired.', 'NotReadableError')); }); };
    });
    await upload(page, 'illisible.json', incoming);
    await page.waitForFunction(() => typeof failRead === 'function');
    assert.equal(await page.locator('#notice').textContent(), reading);
    await page.evaluate(() => failRead());
    await page.locator('#error').waitFor({state: 'visible'});
    assert.deepEqual(await status(page), {error: unreadable, notice: ''});
    assert.equal(await page.evaluate(() => MailBuilder.pendingInputs), 0);
    assert.deepEqual(await state(page), before); assert.deepEqual(await store(page), persisted);

    await page.evaluate(() => { delete File.prototype.text; });
    await upload(page, 'incomplet.json', '{"schema":');
    await page.waitForFunction(() => document.querySelector('#error').textContent === 'Le fichier JSON est invalide ou incomplet.');
    assert.deepEqual(await status(page), {error: 'Le fichier JSON est invalide ou incomplet.', notice: ''});
    assert.deepEqual(await state(page), before); assert.deepEqual(await store(page), persisted);

    await upload(page, 'synthetique.json', incoming);
    await page.locator('#notice').filter({hasText: 'Import ajouté à la bibliothèque'}).waitFor(); await saved(page);
    assert.deepEqual(await status(page), {error: null, notice: 'Import ajouté à la bibliothèque, avec ses images. Les compositions existantes sont conservées.'});
    const after = await state(page);
    assert.equal(after.documents.length, before.documents.length + 1);
    assert.deepEqual(after.documents.slice(0, before.documents.length), before.documents);
    assert.equal(after.documents.at(-1).name, 'Fichier synthétique');
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});
