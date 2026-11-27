/* #238 : encadré par une page d’une autre origine, l’atelier ne démarre pas et ne montre rien du stockage. */
const test = require('node:test'), http = require('node:http'), path = require('node:path');
const playwright = require('playwright');
const {root, fs, assert} = require('./browser-support.cjs');

const web = path.join(root, 'app/distribution/web');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
async function listen(t, handle) {
  const server = http.createServer(async (request, response) => {
    try { await handle(request, response); } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return server.address().port;
}

for (const engine of ['chromium', 'webkit']) test(`#238 ${engine} : l’atelier encadré par un autre site ne démarre pas, seul il démarre`, async t => {
  const appPort = await listen(t, async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname, file = path.join(web, pathname === '/' ? 'index.html' : pathname);
    response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(await fs.readFile(file));
  });
  const target = `http://127.0.0.1:${appPort}/`;
  const hostPort = await listen(t, (request, response) => {
    response.writeHead(200, {'Content-Type': 'text/html'}); response.end(`<!doctype html><title>tiers</title><iframe src="${target}" width="1200" height="900"></iframe>`);
  });
  const browser = await playwright[engine].launch({headless: true});
  try {
    const context = await browser.newContext(), top = await context.newPage(), errors = [];
    // Seul, l’atelier démarre : une newsletter témoin est enregistrée dans ce profil.
    top.on('pageerror', error => errors.push(error.message));
    await top.goto(target); await top.waitForFunction(() => window.MailBuilder?.ready);
    await top.evaluate(() => MailBuilder.State.change(library => { library.documents[0].name = 'Temoin encadrement'; }));
    assert.equal(await top.locator('#frame-refusal').isHidden(), true);
    assert.equal(await top.locator('#workspace').isVisible(), true);

    // Encadré par une autre origine (localhost contre 127.0.0.1), il refuse.
    const outer = await context.newPage(); outer.on('pageerror', error => errors.push(error.message));
    await outer.goto(`http://localhost:${hostPort}/`);
    const frame = outer.frames().find(candidate => candidate.url() === target);
    await frame.locator('#frame-refusal').waitFor({state: 'visible', timeout: 10000});
    const framed = await frame.evaluate(() => ({ready: MailBuilder.ready, workspaceHidden: document.getElementById('workspace').hidden,
      visibleControls: [...document.querySelectorAll('#workspace button, #workspace select, #workspace input')].filter(element => element.getClientRects().length).length,
      text: document.body.innerText, link: document.getElementById('frame-refusal-link').href, target: document.getElementById('frame-refusal-link').target,
      state: document.getElementById('save-state').textContent}));
    assert.equal(framed.ready, false);
    assert.equal(framed.workspaceHidden, true);
    assert.equal(framed.visibleControls, 0);
    assert.doesNotMatch(framed.text, /Temoin encadrement/);
    assert.equal(framed.link, target); assert.equal(framed.target, '_blank');
    assert.match(framed.state, /à l’intérieur d’une autre page/);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
