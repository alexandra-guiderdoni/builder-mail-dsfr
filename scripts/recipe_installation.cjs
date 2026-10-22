/* Installation réelle pilotée par DevTools, dans un profil de recette isolé. */
const {chromium} = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'evidence/application', `native-install-${Date.now()}`);
const profile = path.join(directory, 'profile');
const report = {scope: 'PWA installée sur Mac via DevTools ; boucle locale uniquement', checks: [], errors: [], lifecycle: [], targets: []};
let context, server, manifestId, installed = false, phase = 'ouverture';
async function launch() {
  const browserContext = await chromium.launchPersistentContext(profile, {headless: false, viewport: {width: 1400, height: 950}});
  browserContext.on('page', page => {
    page.on('close', () => report.lifecycle.push({event: 'page fermée', phase, url: page.url()}));
    page.on('crash', () => report.lifecycle.push({event: 'page interrompue', phase, url: page.url()}));
    page.on('pageerror', error => report.errors.push(error.message));
  });
  return browserContext;
}
const ready = page => page.waitForFunction(() => window.MailBuilder?.ready);
async function launchApp(cdp) {
  const result = await cdp.send('PWA.launch', {manifestId}); let stableId;
  const diagnostic = {returned: result.targetId}; report.targets.push(diagnostic);
  for (let attempt = 0; attempt < 100; attempt++) {
    const windows = [];
    for (const candidate of context.pages()) {
      if (candidate.isClosed()) continue;
      let session;
      try {
        if (candidate.url() !== manifestId || !(await candidate.evaluate(() => !!window.MailBuilder?.ready && matchMedia('(display-mode: standalone)').matches))) continue;
        session = await context.newCDPSession(candidate); const info = await session.send('Target.getTargetInfo');
        windows.push({page: candidate, id: info.targetInfo.targetId});
      }
      catch { /* Une page provisoire peut disparaître pendant son identification. */ }
      finally { if (session) await session.detach().catch(() => {}); }
    }
    assert(windows.length <= 1, 'Plusieurs fenêtres autonomes : identification ambiguë.');
    if (windows.length === 1) {
      const current = windows[0];
      if (stableId === current.id) {
        diagnostic.observed = current.id; diagnostic.transientTargetReplaced = result.targetId !== current.id;
        const window = await cdp.send('Browser.getWindowForTarget', {targetId: current.id});
        return {page: current.page, window};
      }
      stableId = current.id;
    } else stableId = null;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Aucune fenêtre autonome stable de cette installation.');
}
(async () => {
  await fs.mkdir(directory, {recursive: true});
  try {
    const base = path.join(root, 'app/distribution/web');
    server = http.createServer(async (request, response) => {
      try {
        const pathname = new URL(request.url, 'http://localhost').pathname;
        const file = path.resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
        if (!file.startsWith(base + path.sep)) { response.writeHead(403); response.end(); return; }
        const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
        response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(await fs.readFile(file));
      } catch { response.writeHead(404); response.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    manifestId = `http://127.0.0.1:${server.address().port}/`;
    context = await launch(); report.browser = context.browser().version();
    const page = context.pages()[0]; page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(manifestId); await ready(page); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.locator('[data-action=resume-document]').press('Enter');
    await page.locator('#document-name').fill('Composition de recette installation native');
    await page.locator('[data-image-field]').first().setInputFiles(path.join(root, 'app/assets/icon-192.png'));
    await page.locator('#notice').filter({hasText: 'Image locale incorporée'}).waitFor();
    await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Bibliothèque sauvegardée dans ce navigateur.');
    const snapshot = await page.evaluate(() => JSON.parse(JSON.stringify(MailBuilder.library)));
    const cdp = await context.browser().newBrowserCDPSession();
    await cdp.send('PWA.install', {manifestId, installUrlOrBundleUrl: manifestId}); installed = true;
    await cdp.send('PWA.changeAppUserSettings', {manifestId, displayMode: 'standalone'});
    report.checks.push('Installation dans le registre du navigateur ; préférence de fenêtre autonome');
    report.osAppState = await cdp.send('PWA.getOsAppState', {manifestId});
    phase = 'premier lancement'; const first = await launchApp(cdp); report.firstWindow = first.window;
    assert.deepEqual(await first.page.evaluate(() => MailBuilder.library), snapshot);
    await first.page.screenshot({path: path.join(directory, 'installed-window.png'), fullPage: true});
    report.checks.push('Application installée lancée en fenêtre autonome ; bibliothèque et image conservées');
    phase = 'fermeture volontaire'; await context.close(); context = null;
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    await assert.rejects(fetch(manifestId));
    phase = 'relance hors connexion'; context = await launch(); const secondCDP = await context.browser().newBrowserCDPSession();
    const second = await launchApp(secondCDP); report.offlineWindow = second.window;
    assert.deepEqual(await second.page.evaluate(() => MailBuilder.library), snapshot);
    assert(await second.page.locator('#library-home').isVisible()); await second.page.locator('[data-action=resume-document]').press('Enter');
    await second.page.frameLocator('#preview').locator('img').first().waitFor({state: 'visible'});
    assert.equal(await second.page.locator('#catalogue option').count(), 52);
    await second.page.screenshot({path: path.join(directory, 'installed-offline-after-restart.png'), fullPage: true});
    report.checks.push('Navigateur redémarré, serveur arrêté et connexion refusée ; relance de l’application installée hors connexion avec 52 composants, bibliothèque et image');
    phase = 'désinstallation volontaire'; await secondCDP.send('PWA.uninstall', {manifestId}); installed = false;
    await assert.rejects(secondCDP.send('PWA.launch', {manifestId}));
    report.checks.push('Installation de recette retirée ; lancement par son identifiant désormais refusé');
    assert.deepEqual(report.errors, []); report.verdict = 'INSTALLATION_RELANCE_OBSERVEES';
    report.notVerified = ['Parcours humain du dialogue d’installation', 'Windows', 'Origine HTTPS réelle', 'Messageries métier', 'Lancement par un raccourci du système'];
  } catch (cause) { report.verdict = 'NON_VERIFIE'; report.failure = cause.message; process.exitCode = 1; }
  finally {
    phase = 'nettoyage volontaire';
    if (installed) { try { if (!context) context = await launch(); const cdp = await context.browser().newBrowserCDPSession(); await cdp.send('PWA.uninstall', {manifestId}); report.cleanup = 'Installation retirée'; } catch (cause) { report.cleanup = cause.message; } }
    if (context) await context.close();
    if (server?.listening) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    await fs.writeFile(path.join(directory, 'receipt.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({...report, receipt: path.relative(root, path.join(directory, 'receipt.json'))}));
  }
})();
