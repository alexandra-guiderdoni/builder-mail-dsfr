const test = require('node:test'), http = require('node:http'), path = require('node:path');
const {root, portable, saved, chromium, fs, assert} = require('./browser-support.cjs');

// #207 : les quatre états d'entrée de #205, dans le portable et dans la version web servie comme GitHub Pages :
// première visite, newsletters existantes, retour après « Tout effacer », stockage illisible.
const web = path.join(root, 'app/distribution/web');
async function serve() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname, file = path.join(web, pathname === '/' ? 'index.html' : pathname);
      const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
      response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(await fs.readFile(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {server, url: `http://127.0.0.1:${server.address().port}/`};
}
const view = page => page.evaluate(() => {
  const shown = id => { const e = document.getElementById(id); return !e.closest('[hidden]') && e.getClientRects().length > 0; };
  return {home: shown('library-home'), welcome: shown('welcome'), list: shown('newsletter-list'), resume: shown('resume-document'), reset: shown('reset-zone'),
    error: shown('error') ? document.getElementById('error').textContent : '', names: MailBuilder.library.documents.map(d => d.name)};
});
const ready = page => page.waitForFunction(() => window.MailBuilder?.ready);

for (const variant of ['portable', 'web']) {
  test(`#207 ${variant} : quatre états d’entrée, de la première visite au stockage illisible`, async () => {
    const browser = await chromium.launch({headless: true}), served = variant === 'web' ? await serve() : null;
    try {
      const context = await browser.newContext({viewport: {width: 1600, height: 1000}}), page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(served ? served.url : portable); await ready(page);

      const first = await view(page);
      assert.deepEqual([first.home, first.welcome, first.list, first.resume, first.reset, first.error], [true, true, false, false, false, ''], 'première visite : accueil guidé');

      await page.locator('[data-example=information] [data-example-action=create]').click(); await saved(page);
      await page.reload(); await ready(page);
      const existing = await view(page);
      assert.deepEqual([existing.home, existing.welcome, existing.list, existing.resume, existing.reset, existing.error], [true, false, true, true, true, ''], 'newsletters existantes : accueil habituel');
      assert.deepEqual(existing.names, ['Information de service']);

      await page.locator('[data-action=reset-library]').click(); await page.locator('#reset-confirm').click();
      await page.locator('#reset-dialog').waitFor({state: 'hidden'});
      await page.reload(); await ready(page);
      const erased = await view(page);
      assert.deepEqual([erased.welcome, erased.list, erased.resume, erased.reset], [true, false, false, false], 'après « Tout effacer », rechargement compris : accueil guidé');

      await page.evaluate(async () => {
        const record = await MailBuilder.Storage.load(); record.token = 'version-inconnue-de-recette'; record.library.version = 99;
        await new Promise((resolve, reject) => { const request = indexedDB.open('builder-mail-dsfr-library', 1); request.onsuccess = () => { const tx = request.result.transaction('library', 'readwrite'); tx.objectStore('library').put(record, 'current'); tx.oncomplete = () => { request.result.close(); resolve(); }; tx.onerror = reject; }; request.onerror = reject; });
      });
      await page.reload(); await ready(page);
      const unreadable = await view(page);
      assert.equal(unreadable.welcome, false, 'stockage illisible : pas d’accueil de bienvenue');
      assert.match(unreadable.error, /Version de sauvegarde non prise en charge/);
      assert.equal(await page.locator('[data-action=export-stored]').count(), 1, 'la copie de diagnostic reste proposée');
      assert.deepEqual(errors, []);
    } finally { await browser.close(); served?.server.close(); }
  });
}
