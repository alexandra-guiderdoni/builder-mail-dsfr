const test = require('node:test');
const http = require('node:http');
const path = require('node:path');
const {root, click, enterEditor, saved, expand, state, chromium, fs, assert} = require('./browser-support.cjs');

const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
const WAITING = 'Ouverture de l’atelier…';
// Serveur de la variante web dont les ressources absentes et la version du service worker se pilotent par le test.
async function serve() {
  const base = path.join(root, 'app/distribution/web'), control = {missing: new Set(), worker: 0};
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname, name = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (control.missing.has(name)) { response.writeHead(404); response.end(); return; }
      const file = path.resolve(base, name);
      if (!file.startsWith(base + path.sep)) { response.writeHead(403); response.end(); return; }
      let data = await fs.readFile(file);
      if (name === 'sw.js' && control.worker) data = Buffer.concat([data, Buffer.from(`\n// version synthétique ${control.worker}\n`)]);
      response.writeHead(200, {'Content-Type': TYPES[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(data);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {server, control, url: `http://127.0.0.1:${server.address().port}/`};
}
const stop = server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
const environment = page => page.locator('#environment').textContent();
const help = async page => (await page.locator('#offline-help').isVisible()) ? await page.locator('#offline-help').textContent() : null;
// Attend que le navigateur ait abandonné ou activé l'installation en cours, puis laisse passer les événements de la page.
async function settled(page) {
  await page.waitForFunction(async () => { const r = await navigator.serviceWorker.getRegistration(); return !r || (!r.installing && (r.active || !r.waiting)); }, null, {timeout: 15000});
  await page.waitForTimeout(800);
}
async function exported(page) {
  const event = page.waitForEvent('download'); await click(page, '#offline-export');
  const result = await event, file = await result.path(); return JSON.parse(await fs.readFile(file, 'utf8'));
}

test('première installation : une ressource de précache absente sort de l’ouverture et propose le portable sans annoncer le hors connexion', async () => {
  const browser = await chromium.launch({headless: true}), {server, control, url} = await serve();
  try {
    control.missing.add('icon-512.png');
    const context = await browser.newContext({acceptDownloads: true, viewport: {width: 1600, height: 1000}}), page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.waitForFunction(() => window.MailBuilder?.ready);
    await enterEditor(page);
    await page.locator('#document-name').fill('Travail conservé malgré l’échec'); await saved(page);
    await settled(page);
    const text = await environment(page);
    assert.notEqual(text, WAITING, 'l’état d’ouverture ne doit pas durer après l’échec du précache');
    assert.doesNotMatch(text, /disponibles hors connexion|prêt hors connexion/);
    const message = await help(page);
    assert(message, 'un message explicite est attendu');
    assert.match(message, /fichier portable/); assert.match(message, /pas pu être préparé/);
    assert.match(message, /exportez/i);
    assert.equal(await page.evaluate(() => navigator.serviceWorker.controller), null);
    const before = await state(page), library = await exported(page);
    assert.deepEqual(await state(page), before, 'l’export ne modifie pas la bibliothèque');
    assert(JSON.stringify(library).includes('Travail conservé malgré l’échec'), 'l’export contient le travail');
    assert.deepEqual(errors, []);
  } finally { await stop(server); await browser.close(); }
});

test('mise à jour en échec : la version précédente reste annoncée utilisable hors connexion seulement si son cache est complet', async () => {
  const browser = await chromium.launch({headless: true}), {server, control, url} = await serve();
  try {
    const context = await browser.newContext({acceptDownloads: true, viewport: {width: 1600, height: 1000}}), page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.waitForFunction(() => window.MailBuilder?.ready && !!navigator.serviceWorker.controller);
    await page.waitForFunction(() => document.querySelector('#environment').textContent.includes('disponibles hors connexion'));
    await enterEditor(page);
    await page.locator('#document-name').fill('Travail avant mise à jour'); await saved(page);
    const before = await state(page);
    control.worker = 2; control.missing.add('icon-512.png');
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
    await settled(page);
    assert(await page.locator('#update').isHidden(), 'aucune mise à jour ne doit être proposée');
    const text = await environment(page), message = await help(page);
    assert.match(text, /mise à jour/i, 'l’échec de mise à jour doit être signalé dans l’état');
    assert(message, 'un message explicite est attendu');
    assert.match(message, /mise à jour n’a pas pu être préparée/);
    assert.match(message, /version précédente/); assert.match(message, /disponibles? hors connexion/);
    assert.doesNotMatch(message, /ne s’ouvrira pas sans connexion/, 'ce n’est pas un échec de première installation');
    await stop(server);
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.deepEqual(await state(page), before, 'la version précédente rouvre le travail hors connexion');
    assert.deepEqual(errors, []);
  } finally { if (server.listening) await stop(server); await browser.close(); }
});

test('mise à jour en échec avec cache précédent absent : aucune promesse de hors connexion et recours au portable', async () => {
  const browser = await chromium.launch({headless: true}), {server, control, url} = await serve();
  try {
    const context = await browser.newContext({acceptDownloads: true, viewport: {width: 1600, height: 1000}}), page = await context.newPage();
    await page.goto(url); await page.waitForFunction(() => window.MailBuilder?.ready && !!navigator.serviceWorker.controller);
    await page.evaluate(async () => { for (const key of await caches.keys()) await caches.delete(key); });
    control.worker = 2; control.missing.add('icon-512.png');
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
    await settled(page);
    const message = await help(page);
    assert(message, 'un message explicite est attendu');
    assert.match(message, /pas pu être vérifiées/); assert.match(message, /ne comptez pas sur le hors connexion/); assert.match(message, /fichier portable/);
    assert.doesNotMatch(message, /reste disponible|sont disponibles hors connexion/);
    assert.doesNotMatch(await environment(page), /disponibles hors connexion/);
  } finally { await stop(server); await browser.close(); }
});
