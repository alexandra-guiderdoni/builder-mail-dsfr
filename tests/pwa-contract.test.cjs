const test = require('node:test');
const vm = require('node:vm');
const native = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {root, chromium, fs, assert} = require('./browser-support.cjs');
test('un prompt consommé disparaît après annulation, acceptation ou rejet ; un nouvel événement le réactive', async () => {
  for (const outcome of ['dismissed', 'accepted', 'rejected']) {
    const listeners = {}, elements = Object.fromEntries(['environment', 'install', 'update'].map(id => [id, {hidden: true, addEventListener(type, action) { this[type] = action; }}]));
    const scope = {document: {querySelector: () => ({}), getElementById: id => elements[id]}, location: {protocol: 'https:'}, navigator: {}, addEventListener: (type, action) => { listeners[type] = action; }};
    scope.window = scope; scope.MailBuilder = {error: message => { scope.error = message; }, notice: message => { scope.notice = message; }};
    vm.runInNewContext(native.readFileSync(path.join(root, 'app/source/pwa.js'), 'utf8'), scope);
    let prompts = 0;
    const emit = () => listeners.beforeinstallprompt({preventDefault() {}, prompt: async () => { prompts++; if (outcome === 'rejected') throw new Error('Refus du navigateur'); }, userChoice: Promise.resolve({outcome})});
    emit(); assert(!elements.install.hidden); await elements.install.click();
    assert(elements.install.hidden, outcome); await elements.install.click(); assert.equal(prompts, 1);
    emit(); assert(!elements.install.hidden); await elements.install.click(); assert.equal(prompts, 2);
  }
});
async function serve(base, portable = false) {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    requests.push(request.url);
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/outside.txt') { response.end('NETWORK'); return; }
      const relative = url.pathname.replace(/^\/(a|b)\//, '/');
      const file = path.resolve(base, '.' + (relative === '/' ? (portable ? '/portable.html' : '/index.html') : relative));
      if (!file.startsWith(base + path.sep)) { response.writeHead(403); response.end(); return; }
      const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
      response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(await fs.readFile(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {server, requests, origin: `http://127.0.0.1:${server.address().port}`};
}
for (const family of ['prototype', 'app']) test(`${family} : caches par scope, aucune réponse étrangère et favori paramétré hors connexion`, async () => {
  const browser = await chromium.launch({headless: true}); let server;
  try {
    const served = await serve(path.join(root, family, 'distribution/web')); server = served.server;
    const {origin} = served, context = await browser.newContext(), page = await context.newPage();
    await page.goto(origin + '/a/'); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const other = await context.newPage(); await other.goto(origin + '/b/'); await other.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert.equal((await page.evaluate(() => caches.keys())).length, 2);
    await page.evaluate(async () => { const cache = await caches.open('foreign-cache'); await cache.put('/outside.txt', new Response('CACHED')); await cache.put('/a/not-precache.txt', new Response('CACHED')); });
    assert.equal(await page.evaluate(() => fetch('/outside.txt').then(r => r.text())), 'NETWORK');
    assert.equal(await page.evaluate(() => fetch('/a/not-precache.txt').then(r => r.status)), 404);
    // Le témoin traverse le worker vers le serveur avant la coupure. setOffline seul
    // ne coupe pas ce chemin sous Firefox : fermer réellement notre serveur privé.
    for (const tab of [page, other]) {
      const probe = new URL('icon.svg?missing=1', tab.url()).pathname + '?missing=1';
      assert(await tab.evaluate(() => fetch('./icon.svg?missing=1', {cache: 'no-store'}).then(r => r.ok)));
      assert(served.requests.includes(probe), `Le serveur doit recevoir le témoin ${probe}`);
    }
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    assert.equal(server.listening, false);
    await assert.rejects(fetch(origin + '/a/icon.svg?missing=1', {cache: 'no-store'}));
    const requestCount = served.requests.length;
    for (const tab of [page, other]) {
      const url = tab.url(); await tab.goto(url + 'index.html?edition=1');
      await tab.waitForFunction(() => document.querySelector('#save-state').textContent !== '');
      assert.equal(await tab.locator('#environment').count(), 1);
      assert(await tab.evaluate(async () => { try { await fetch('./icon.svg?missing=1'); return false; } catch { return true; } }));
      for (const resource of ['/outside.txt', '/a/not-precache.txt']) assert(await tab.evaluate(async resource => { try { await fetch(resource); return false; } catch { return true; } }, resource), `${resource} ne doit pas sortir d’un cache étranger`);
    }
    await assert.rejects(page.goto(origin + '/a/inconnue.html'));
    await assert.rejects(other.goto(origin + '/hors-perimetre.html'));
    assert.equal(served.requests.length, requestCount, 'Aucune requête ne rejoint le serveur fermé pendant les contrôles hors ligne');
  } finally { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } await browser.close(); }
});
test('le portable servi par HTTP reste autonome et ne tente pas d’inscrire un worker', async () => {
  const browser = await chromium.launch({headless: true}); let server;
  try {
    const served = await serve(path.join(root, 'app/distribution'), true); server = served.server;
    const page = await browser.newPage(), errors = [], requests = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); }); page.on('request', request => requests.push(request.url()));
    await page.goto(served.origin + '/'); await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.match(await page.locator('#environment').innerText(), /portable/);
    assert.equal((await page.evaluate(() => navigator.serviceWorker.getRegistrations())).length, 0);
    assert(!requests.some(url => url.endsWith('/sw.js'))); assert(!errors.some(message => /worker|Content Security Policy/.test(message)));
  } finally { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } await browser.close(); }
});
test('la liste de ressources vérifiée par la page est celle que le service worker précache', () => {
  const list = text => text.match(/\[("\.[^\]]*)\]/)[1].split(',').map(item => item.trim().replace(/^"|"$/g, ''));
  const worker = list(native.readFileSync(path.join(root, 'app/source/sw.js'), 'utf8').split('\n').find(line => line.startsWith('const FILES')));
  const page = list(native.readFileSync(path.join(root, 'app/source/pwa.js'), 'utf8').split('\n').find(line => line.includes('const PRECACHED')).replace('const PRECACHED = ', ''));
  assert.deepEqual(page, worker); assert(worker.length >= 6);
});
