const test = require('node:test');
const http = require('node:http');
const path = require('node:path');
const {root, click, chromium, fs, assert} = require('./browser-support.cjs');
// Deux pages réelles d'un même contexte partagent un service worker servi en local ; une troisième génération du worker est publiée.
test('mise à jour activée par un autre onglet : l’action disparaît et la page invite à recharger sans recharger seule', async () => {
  const browser = await chromium.launch({headless: true}); let server, generation = 1;
  try {
    const base = path.join(root, 'app/distribution/web');
    server = http.createServer(async (request, response) => {
      try {
        const relative = new URL(request.url, 'http://localhost').pathname;
        const file = path.resolve(base, '.' + (relative === '/' ? '/index.html' : relative));
        if (!file.startsWith(base + path.sep)) { response.writeHead(403); response.end(); return; }
        let data = await fs.readFile(file);
        if (generation === 2 && path.basename(file) === 'sw.js') data = Buffer.concat([data, Buffer.from('\n// seconde génération\n')]);
        const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
        response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(data);
      } catch { response.writeHead(404); response.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/`, context = await browser.newContext({viewport: {width: 1400, height: 900}});
    const first = await context.newPage(), second = await context.newPage(), errors = [];
    for (const tab of [first, second]) { tab.on('pageerror', e => errors.push(e.message)); await tab.goto(url); await tab.waitForFunction(() => window.MailBuilder?.ready && !!navigator.serviceWorker.controller); }
    // Une première installation qui prend le contrôle d'une page ne doit rien annoncer.
    assert.equal(await first.locator('#update').isHidden(), true); assert.doesNotMatch(await first.locator('#notice').innerText(), /Rechargez/);
    await second.evaluate(() => { window.untouched = 'onglet-2'; });
    generation = 2;
    await first.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await first.locator('#update').waitFor({state: 'visible'}); await second.locator('#update').waitFor({state: 'visible'});
    const reload = first.waitForEvent('load'); await click(first, '#update'); await reload; await first.waitForFunction(() => window.MailBuilder?.ready);
    // L'onglet 2 n'a plus de mise à jour en attente : l'action disparaît et un message dit quoi faire.
    await second.locator('#update').waitFor({state: 'hidden'});
    assert.equal(await second.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.waiting)), null);
    assert.match(await second.locator('#notice').innerText(), /autre onglet.*Rechargez cette page.*protections de sauvegarde/s);
    // Aucun rechargement automatique : la page garde son état, le rechargement reste à l'initiative de la personne.
    assert.equal(await second.evaluate(() => window.untouched), 'onglet-2');
    await new Promise(resolve => setTimeout(resolve, 500));
    assert.equal(await second.evaluate(() => window.untouched), 'onglet-2');
    assert.deepEqual(errors, []);
  } finally { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } await browser.close(); }
});
test('clic sur l’action alors qu’aucune mise à jour n’attend : l’action disparaît avec un message, sans activation', async () => {
  const vm = require('node:vm'), elements = {};
  const element = id => elements[id] ||= {id, hidden: true, addEventListener(type, action) { this[type] = action; }};
  const posted = [], notices = [], registration = {waiting: null, addEventListener() {}};
  const scope = {document: {querySelector: () => ({}), getElementById: element}, location: {protocol: 'https:', reload() {}}, addEventListener() {},
    navigator: {serviceWorker: {controller: {}, addEventListener() {}, register: async () => registration, ready: Promise.resolve({active: {}})}}};
  scope.window = scope; scope.MailBuilder = {error() {}, notice: message => notices.push(message), State: {save: async () => {}, flush: async () => {}}};
  vm.runInNewContext(require('node:fs').readFileSync(path.join(root, 'app/source/pwa.js'), 'utf8'), scope);
  await new Promise(resolve => setImmediate(resolve)); element('update').hidden = false;
  await element('update').click();
  assert.equal(element('update').hidden, true); assert.equal(posted.length, 0);
  assert.match(notices.at(-1), /Rechargez cette page.*protections de sauvegarde/s);
});
