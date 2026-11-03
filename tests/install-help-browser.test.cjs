const test = require('node:test'), http = require('node:http'), path = require('node:path');
const {root, portable, chromium, fs, assert} = require('./browser-support.cjs');

// #210 : sur le site, un vrai lien de téléchargement du portable, une aide quand le navigateur ne propose pas l'installation,
// et des états lisibles qui distinguent installé, disponible hors connexion et sauvegardé. Le serveur reproduit GitHub Pages :
// la variante web à la racine et le portable publié à côté sous `atelier-portable.html`.
const web = path.join(root, 'app/distribution/web'), portableFile = path.join(root, 'app/distribution/portable.html');
async function serve() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const file = pathname === '/atelier-portable.html' ? portableFile : path.join(web, pathname === '/' ? 'index.html' : pathname);
      const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
      response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(await fs.readFile(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {server, url: `http://127.0.0.1:${server.address().port}/`};
}
async function opened(browser, url) {
  const context = await browser.newContext({acceptDownloads: true, viewport: {width: 1600, height: 1000}}), page = await context.newPage();
  await page.goto(url); await page.waitForFunction(() => window.MailBuilder?.ready); return page;
}
const visible = (page, selector) => page.locator(selector).isVisible();

test('#210 site : lien de téléchargement réel du portable et aide à l’installation sans invite du navigateur', async () => {
  const browser = await chromium.launch(), {server, url} = await serve();
  try {
    const page = await opened(browser, url);
    // #205 : à la première visite sur le site, l’aide à l’installation forme la troisième étape de l’accueil guidé.
    assert.equal(await page.locator('#welcome-install-step').isVisible(), true);
    assert.equal(await page.locator('#welcome-install #install-help').count(), 1);
    const link = page.locator('#portable-download');
    assert.equal(await link.isVisible(), true);
    assert.equal(await link.textContent(), 'Télécharger l’atelier portable');
    assert.equal(await link.getAttribute('download'), 'atelier-courriels-portable.html');
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
    assert.equal(download.suggestedFilename(), 'atelier-courriels-portable.html');
    assert((await fs.readFile(await download.path())).equals(await fs.readFile(portableFile)), 'le fichier téléchargé est le portable publié');
    assert.equal(page.url(), url, 'le portable n’est pas ouvert dans le site');
    // Aucune invite du navigateur : l'aide explique pourquoi et propose une autre voie.
    assert.equal(await visible(page, '#install'), false);
    assert.equal(await visible(page, '#install-explain'), true);
    assert.match(await page.locator('#install-explain').textContent(), /menu du navigateur/);
    // Les trois notions restent accessibles dans une aide repliable, avec l'état technique.
    const details = page.locator('#install-help details');
    assert.equal(await details.evaluate(d => d.open), false);
    await details.locator('summary').click();
    const terms = await details.textContent();
    for (const word of [/Installé/, /Disponible hors connexion/, /Sauvegardé/, /cache/]) assert.match(terms, word);
  } finally { await browser.close(); server.close(); }
});

test('#210 site : l’aide se retire quand le navigateur propose l’installation, puis quand l’atelier est installé', async () => {
  const browser = await chromium.launch(), {server, url} = await serve();
  try {
    const page = await opened(browser, url);
    // L'invite native n'est pas déclenchable sans interface : l'événement est rejoué avec la même forme.
    await page.evaluate(() => { const event = new Event('beforeinstallprompt', {cancelable: true}); event.prompt = async () => {}; event.userChoice = Promise.resolve({outcome: 'dismissed'}); window.dispatchEvent(event); });
    assert.equal(await visible(page, '#install'), true);
    assert.equal(await visible(page, '#install-explain'), false, 'le bouton est proposé : l’aide se retire');
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    assert.equal(await visible(page, '#install'), false);
    // #205 : installé, l’atelier n’a plus d’étape « Installer » dans l’accueil guidé.
    assert.equal(await visible(page, '#welcome-install-step'), false);
    assert.equal(await visible(page, '#install-explain'), false, 'l’atelier est installé : l’aide se retire');
    assert.match(await page.locator('#environment').textContent(), /installé/);
    assert.equal(await visible(page, '#portable-download'), true, 'le portable reste téléchargeable');
  } finally { await browser.close(); server.close(); }
});

test('#210 portable : ni lien de téléchargement ni aide à l’installation ; états sans jargon', async () => {
  const browser = await chromium.launch();
  try {
    const page = await opened(browser, portable);
    assert.equal(await visible(page, '#install-help'), false);
    assert.equal(await visible(page, '#portable-download'), false);
    assert.match(await page.locator('#environment').textContent(), /portable/);
    const source = await fs.readFile(path.join(root, 'app/source/pwa.js'), 'utf8');
    assert.doesNotMatch(source, /non vérifié|non préparée|Vos compositions/, 'états reformulés et vocabulaire « newsletters »');
  } finally { await browser.close(); }
});
