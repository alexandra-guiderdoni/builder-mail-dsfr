const test = require('node:test');
const http = require('node:http');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {root, evidence, click, open, enterEditor, saved, expand, state, chromium, nativeAx, engineName, fs, assert} = require('./browser-support.cjs');

test('cache réel, mise à jour explicite et conservation de la bibliothèque avec serveur arrêté', async () => {
  const browser = await chromium.launch({headless: true});
  let server, generation = 1;
  try {
    const base = path.join(root, 'app/distribution/web');
    const iconDelivery = JSON.parse(execFileSync('python3', ['-c', `import sys,json,base64
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'scripts')
import build_app
original=Path.read_bytes
target=build_app.ROOT/'app/assets/icon-192.png'
with patch.object(Path,'read_bytes',lambda p: original(p)+b'\\n' if p==target else original(p)):
 result=build_app.build()
print(json.dumps({p.name:base64.b64encode(data).decode('ascii') for p,data in result.items() if p.parent==build_app.DIST/'web' and p.name in ['sw.js','icon-192.png']}))`], {cwd: root, encoding: 'utf8'}));
    server = http.createServer(async (request, response) => {
      try {
        const relative = new URL(request.url, 'http://localhost').pathname.replace(/^\/other\//, '/');
        const file = path.resolve(base, '.' + (relative === '/' ? '/index.html' : relative));
        if (!file.startsWith(base + path.sep)) { response.writeHead(403); response.end(); return; }
        let data = await fs.readFile(file);
        if (generation === 2 && iconDelivery[path.basename(file)]) data = Buffer.from(iconDelivery[path.basename(file)], 'base64');
        const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
        response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': path.basename(file) === 'sw.js' ? 'no-store' : 'public, max-age=600'}); response.end(data);
      } catch { response.writeHead(404); response.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/`, {page, context} = await open(browser);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.waitForFunction(() => window.MailBuilder?.ready && !!navigator.serviceWorker.controller);
    await enterEditor(page);
    await page.locator('#document-name').fill('Bibliothèque conservée après mise à jour');
    await expand(page, 'Identités de service'); await page.locator('#identity-name').fill('Identité de mise à jour'); await click(page, '[data-action=save-identity]'); await saved(page);
    const before = await state(page), session = nativeAx ? await context.newCDPSession(page) : null;
    const originalIcon = await fs.readFile(path.join(base, 'icon-192.png'));
    const other = await context.newPage(); await other.goto(url + 'other/'); await other.waitForFunction(() => !!navigator.serviceWorker.controller);
    const otherCache = await other.evaluate(async () => (await caches.keys()).find(key => key.includes(encodeURIComponent(location.href))));
    // Manifeste et installabilité par CDP sous Chromium ; ailleurs, le manifeste est lu par fetch et l'installabilité n'est pas évaluée (null).
    const manifest = session ? await session.send('Page.getAppManifest') : {errors: [], data: JSON.stringify(await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json()))};
    assert.equal(manifest.errors.length, 0); assert.equal(JSON.parse(manifest.data).icons.length, 2);
    const installability = session ? await session.send('Page.getInstallabilityErrors') : {installabilityErrors: null};
    generation = 2; await page.evaluate(async () => { window.previousController = navigator.serviceWorker.controller; const registration = await navigator.serviceWorker.getRegistration(); await registration.update(); });
    await page.locator('#update').waitFor({state: 'visible'});
    assert(await page.evaluate(() => navigator.serviceWorker.controller === window.previousController));
    const beforeActivation = await page.evaluate(async () => [...new Uint8Array(await (await fetch('./icon-192.png')).arrayBuffer())]);
    assert.deepEqual(Buffer.from(beforeActivation), originalIcon);
    const reload = page.waitForEvent('load'); await click(page, '#update'); await reload; await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.deepEqual(await state(page), before);
    const caches = await page.evaluate(() => window.caches.keys()); assert.equal(caches.length, 2); assert(caches.includes(otherCache));
    const cachedIcon = await page.evaluate(async () => [...new Uint8Array(await (await fetch('./icon-192.png')).arrayBuffer())]);
    assert.deepEqual(Buffer.from(cachedIcon), Buffer.concat([originalIcon, Buffer.from('\n')]));
    const preservedIcon = await other.evaluate(async () => [...new Uint8Array(await (await fetch('./icon-192.png')).arrayBuffer())]); assert.deepEqual(Buffer.from(preservedIcon), originalIcon);
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    let refused = false; try { await fetch(url); } catch { refused = true; } assert(refused, 'Le serveur répond encore');
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready); assert.deepEqual(await state(page), before);
    await enterEditor(page); await page.frameLocator('#preview').locator('img').first().waitFor({state: 'visible'});
    await fs.mkdir(evidence, {recursive: true}); await page.screenshot({path: path.join(evidence, 'application-web-hors-ligne.png'), fullPage: true});
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(evidence, `pwa-${engineName}.json`), JSON.stringify({browser: browser.version(),manifestErrors: manifest.errors,installabilityErrors: installability.installabilityErrors,updateObserved: true,libraryPreserved: true,serverStopped: true,offlineReloadObserved: true,nativeInstallation: 'NOT_VERIFIED',realHTTPS: 'NOT_VERIFIED',errors}, null, 2));
  } finally { if (server?.listening) await new Promise(resolve => server.close(resolve)); await browser.close(); }
});

test('deux installations web sur la même origine conservent chacune leur cache hors connexion', async () => {
  const browser = await chromium.launch({headless: true}); let server;
  try {
    const base = path.join(root, 'app/distribution/web');
    server = http.createServer(async (request, response) => {
      try {
        const pathname = new URL(request.url, 'http://localhost').pathname.replace(/^\/(a|b)\//, '/');
        const file = path.resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
        if (!file.startsWith(base + path.sep)) { response.writeHead(403); response.end(); return; }
        const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
        response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(await fs.readFile(file));
      } catch { response.writeHead(404); response.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`, {page, context} = await open(browser);
    await page.goto(origin + '/a/'); await page.waitForFunction(() => window.MailBuilder?.ready && !!navigator.serviceWorker.controller);
    const other = await context.newPage(); await other.goto(origin + '/b/'); await other.waitForFunction(() => window.MailBuilder?.ready && !!navigator.serviceWorker.controller);
    const keys = await other.evaluate(() => caches.keys()); assert.equal(keys.length, 2);
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await assert.rejects(fetch(origin));
    for (const tab of [page, other]) { await tab.reload(); await tab.waitForFunction(() => window.MailBuilder?.ready); assert.equal(await tab.locator('#catalogue option').count(), 52); }
    await fs.writeFile(path.join(evidence, 'pwa-scopes.json'), JSON.stringify({separateScopes: true, cacheCount: keys.length, serverStopped: true, bothReloadedOffline: true}, null, 2));
  } finally { if (server?.listening) await new Promise(resolve => server.close(resolve)); await browser.close(); }
});
