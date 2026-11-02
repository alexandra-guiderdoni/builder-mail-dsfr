const test = require('node:test');
const http = require('node:http');
const path = require('node:path');
const {root, portable, open, enterEditor, saved, state, store, chromium, fs, assert} = require('./browser-support.cjs');

// #201 : « Tout effacer » vide la bibliothèque par le point d'entrée commun (#208) et ramène à l'état visible d'un
// navigateur neuf, sans état précédent récupérable ; le programme hors connexion reste en place.
const dialog = '#reset-dialog', fresh = 'Aucune sauvegarde : créez ou personnalisez une composition.';
async function filled(page) {
  await page.evaluate(async () => {
    const A = MailBuilder, docs = ['Lettre A', 'Lettre B'].map(name => A.Model.create(name));
    await A.State.change(lib => {
      lib.documents = docs; lib.activeId = docs[0].id;
      lib.templates = [A.Model.clone(docs[0], 'Modèle A')];
      lib.identities = [{id: A.Model.id(), name: 'Identité A', blocks: docs[0].blocks.slice(0, 1).map(b => ({...A.Model.copy(b), id: A.Model.id()}))}];
    });
    A.removed.set(A.library.activeId, {block: A.doc().blocks[0], index: 0});
  });
  await saved(page);
}
async function home(page) { await page.locator('[data-action=library-home]').click(); await page.locator('#library-home').waitFor(); }
const visible = page => page.evaluate(() => ({save: document.querySelector('#save-state').textContent, count: document.querySelector('#library-count').textContent,
  documents: MailBuilder.library.documents.map(d => ({name: d.name, components: d.blocks.map(b => b.component)})), templates: MailBuilder.library.templates.length, identities: MailBuilder.library.identities.length}));

test('#201 tout effacer : fenêtre avec export préalable, puis état visible d’un navigateur neuf, sans état précédent', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await filled(page); await home(page);
    await page.locator('[data-action=reset-library]').click(); await page.locator(dialog).waitFor({state: 'visible'});
    assert.match(await page.locator('#reset-dialog-description').textContent(), /2 compositions, 1 modèle, 1 identité/);
    const download = page.waitForEvent('download'); await page.locator('#reset-export').click();
    assert.match((await download).suggestedFilename(), /bibliotheque-courriels/);
    assert.equal(await page.locator(dialog).isVisible(), true, 'exporter n’est pas confirmer');
    await page.locator('#reset-cancel').click(); await page.locator(dialog).waitFor({state: 'hidden'});
    assert.deepEqual((await state(page)).documents.map(d => d.name), ['Lettre A', 'Lettre B'], 'annuler ne change rien');
    await page.locator('[data-action=reset-library]').click(); await page.locator(dialog).waitFor({state: 'visible'});
    await page.locator('#reset-confirm').click(); await page.locator(dialog).waitFor({state: 'hidden'});
    const after = await visible(page);
    const neuf = await browser.newContext().then(async context => { const p = await context.newPage(); await p.goto(portable); await p.waitForFunction(() => window.MailBuilder?.ready); const v = await visible(p); await context.close(); return v; });
    assert.deepEqual(after, neuf, 'état visible identique à un navigateur neuf');
    assert.equal(after.save, fresh);
    assert.equal(await page.evaluate(() => MailBuilder.Storage.load('previous')), undefined);
    assert.match(await page.evaluate(() => MailBuilder.State.recover().then(() => 'relu', cause => cause.message)), /Aucun état précédent/);
    assert.equal(await page.evaluate(() => MailBuilder.removed.size), 0);
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.deepEqual(await visible(page), neuf, 'après rechargement aussi');
  } finally { await browser.close(); }
});

test('#201 tout effacer sur la version web : le programme hors connexion reste en place', async () => {
  const browser = await chromium.launch({headless: true});
  const base = path.join(root, 'app/distribution/web'), types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
  let online = true;
  const server = http.createServer(async (request, response) => {
    if (!online) { request.socket.destroy(); return; }
    try {
      const relative = new URL(request.url, 'http://localhost').pathname, file = path.resolve(base, '.' + (relative === '/' ? '/index.html' : relative));
      if (!file.startsWith(base + path.sep)) { response.writeHead(403); response.end(); return; }
      response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(await fs.readFile(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/`, {page} = await open(browser);
    await page.goto(url); await page.waitForFunction(() => window.MailBuilder?.ready && !!navigator.serviceWorker.controller);
    await page.waitForFunction(() => document.querySelector('#environment').textContent.includes('disponibles hors connexion'));
    await enterEditor(page); await filled(page);
    const caches = () => page.evaluate(async () => Promise.all((await caches.keys()).map(async key => [key, (await (await caches.open(key)).keys()).length])));
    const before = await caches();
    await home(page); await page.locator('[data-action=reset-library]').click(); await page.locator(dialog).waitFor({state: 'visible'});
    await page.locator('#reset-confirm').click(); await page.locator(dialog).waitFor({state: 'hidden'});
    assert.deepEqual(await caches(), before);
    online = false;
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.equal(await page.locator('#save-state').textContent(), fresh);
    assert.deepEqual((await store(page)).library.documents.map(d => d.name), ['Mon premier courriel']);
  } finally { await browser.close(); server.close(); }
});
