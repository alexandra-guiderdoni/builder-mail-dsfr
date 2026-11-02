const test = require('node:test'), http = require('node:http'), path = require('node:path');
const {root, open, saved, chromium, fs, assert} = require('./browser-support.cjs');

// #202 : espace « Exemples » distinct de Mes newsletters. Quatre newsletters remplies au contenu fictif, construites depuis
// le catalogue courant et embarquées dans l’atelier ; aperçu en lecture seule et copie indépendante dans Mes newsletters.
const LABELS = ['Information de service', 'Lettre d’information', 'Invitation', 'Revue de presse'];
async function home(page) { await page.locator('[data-action=library-home]').click(); await page.locator('#library-home').waitFor({state: 'visible'}); }
const item = (page, label) => page.locator('#examples-list li').filter({has: page.getByRole('heading', {name: label, exact: true})});

test('#202 accueil : quatre exemples, aperçu en lecture seule, retour du focus', async () => {
  const browser = await chromium.launch();
  try {
    const {page, observations} = await open(browser); await home(page);
    assert.deepEqual(await page.locator('#examples-list h4').allTextContents(), LABELS);
    const before = await page.evaluate(() => MailBuilder.library.documents.length);
    const preview = item(page, 'Invitation').getByRole('button', {name: 'Prévisualiser l’exemple « Invitation »'});
    await preview.click();
    const dialog = page.locator('#example-dialog');
    assert.equal(await dialog.evaluate(d => d.open), true);
    assert.equal(await page.locator('#example-dialog-title').textContent(), 'Exemple : Invitation');
    assert.equal(await page.locator('#example-preview').getAttribute('sandbox'), '');
    const frame = page.frameLocator('#example-preview');
    await frame.getByText('Rencontre régionale des partenaires', {exact: false}).first().waitFor();
    await page.locator('#example-close').click();
    assert.equal(await dialog.evaluate(d => d.open), false);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Prévisualiser l’exemple « Invitation »');
    assert.equal(await page.evaluate(() => MailBuilder.library.documents.length), before, 'l’aperçu n’ajoute rien');
    assert.deepEqual(observations.requests.filter(url => /^https?:/.test(url)), [], 'aucune ressource réseau');
  } finally { await browser.close(); }
});

test('#202 créer à partir d’un exemple : copie indépendante, l’exemple reste inchangé ; « Tout effacer » n’y touche pas', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); await home(page);
    const reference = await page.evaluate(() => JSON.stringify(MailBuilder.Examples.build('lettre')));
    await item(page, 'Lettre d’information').getByRole('button', {name: 'Créer à partir de cet exemple « Lettre d’information »'}).click();
    await page.locator('#editor-page').waitFor({state: 'visible'}); await saved(page);
    assert.equal(await page.locator('#document-name').inputValue(), 'Lettre d’information');
    assert.match(await page.locator('#notice').textContent(), /exemple « Lettre d’information ».*fictifs/);
    const copy = await page.evaluate(() => MailBuilder.doc());
    assert.equal(copy.subject, 'La lettre des partenaires · novembre 2026');
    await page.locator('#document-name').fill('Ma lettre'); await saved(page);
    const again = await page.evaluate(() => MailBuilder.Examples.build('lettre'));
    const strip = doc => JSON.stringify({...doc, id: '', blocks: doc.blocks.map(b => ({...b, id: ''}))});
    assert.equal(strip(again), strip(JSON.parse(reference)), 'l’exemple est inchangé après modification de la copie');
    assert.notEqual(copy.id, again.id);
    // « Tout effacer » vide Mes newsletters ; les exemples restent proposés et utilisables.
    await page.evaluate(() => MailBuilder.State.replaceLibrary(MailBuilder.Model.initial(), {reason: 'effacement', keepPrevious: false}));
    await home(page);
    assert.deepEqual(await page.locator('#examples-list h4').allTextContents(), LABELS);
    await item(page, 'Revue de presse').getByRole('button', {name: 'Créer à partir de cet exemple « Revue de presse »'}).click();
    await page.locator('#editor-page').waitFor({state: 'visible'});
    assert.equal(await page.locator('#document-name').inputValue(), 'Revue de presse');
    // Le contrôle avant copie signale les textes d’exemple restés tels quels.
    const rules = await page.evaluate(() => MailBuilder.Checks.warnings(MailBuilder.doc(), {bytes: 1000, level: 'ok'}).map(w => w.rule));
    assert.ok(rules.includes('example-text') && rules.includes('demo-domain'), JSON.stringify(rules));
  } finally { await browser.close(); }
});

test('#202 poids : chaque exemple et chaque départ reste sous le repère de 90 Kio en HTML de copie', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const weights = await page.evaluate(() => {
      const A = MailBuilder, measure = doc => { const w = A.Render.weightDetails(A.Render.clipboardHtml(doc), doc); return [w.level, w.bytes]; };
      return {examples: A.Examples.list.map(e => [e.key, ...measure(A.Examples.build(e.key))]), starters: A.Starters.keys.map(key => [key, ...measure(A.Starters.create(key, key))])};
    });
    for (const [key, level, bytes] of [...weights.examples, ...weights.starters]) assert.equal(level, 'ok', `${key} : ${bytes} octets`);
    assert.equal(weights.examples.length, 4); assert.equal(weights.starters.length, 3);
  } finally { await browser.close(); }
});

test('#202 départs alignés : aucun composant n’exige d’illustration en dehors des logos', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const required = await page.evaluate(() => {
      const A = MailBuilder, logos = new Set(['mail-02', 'mail-03', 'mail-47', 'mail-48']);
      const used = [...A.Starters.keys.map(key => A.Starters.create(key, key)), ...A.Examples.list.map(e => A.Examples.build(e.key))].flatMap(d => d.blocks.map(b => b.component));
      // Un composant dont l'image ne peut pas être vide est refusé par le moteur une fois l'image vidée.
      return [...new Set(used)].filter(id => !logos.has(id)).filter(id => {
        const doc = A.Model.create('x', [id]), block = doc.blocks[0];
        for (const f of A.Model.component(id).fields) if (f.type === 'image') block.values[f.key] = '';
        try { A.Model.document(doc); return false; } catch { return true; }
      });
    });
    assert.deepEqual(required, []);
    assert.deepEqual(await page.evaluate(() => MailBuilder.Examples.build('invitation').blocks.map(b => b.component)), ['mail-02', 'mail-05', 'mail-19', 'mail-40', 'mail-39', 'mail-47', 'mail-49'], 'bouton avant contact');
  } finally { await browser.close(); }
});

test('#202 version web préparée hors connexion : aperçu et création sans réseau', async () => {
  const web = path.join(root, 'app/distribution/web');
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname, file = path.join(web, pathname === '/' ? 'index.html' : pathname);
      const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
      response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(await fs.readFile(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext(), page = await context.newPage(), url = `http://127.0.0.1:${server.address().port}/`;
    await page.goto(url); await page.waitForFunction(() => window.MailBuilder?.ready && !!navigator.serviceWorker.controller);
    await page.waitForFunction(() => document.querySelector('#environment').textContent.includes('disponible hors connexion'));
    await context.setOffline(true); server.close();
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    await page.locator('#library-home').waitFor({state: 'visible'});
    await item(page, 'Lettre d’information').getByRole('button', {name: 'Prévisualiser l’exemple « Lettre d’information »'}).click();
    await page.frameLocator('#example-preview').getByText('La lettre des partenaires', {exact: false}).first().waitFor();
    await page.locator('#example-create').click();
    await page.locator('#editor-page').waitFor({state: 'visible'});
    assert.equal(await page.locator('#document-name').inputValue(), 'Lettre d’information');
  } finally { await browser.close(); server.close(); }
});

test('#202 double clic : une seule copie par création, depuis un exemple comme depuis un départ', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); await home(page);
    const count = () => page.evaluate(() => MailBuilder.library.documents.length), before = await count();
    await item(page, 'Invitation').getByRole('button', {name: 'Créer à partir de cet exemple « Invitation »'}).dblclick();
    await page.locator('#editor-page').waitFor({state: 'visible'}); await saved(page);
    assert.equal(await count(), before + 1, 'exemple');
    await home(page);
    await page.locator('[data-action=new-document]').dblclick();
    await page.locator('#editor-page').waitFor({state: 'visible'}); await saved(page);
    assert.equal(await count(), before + 2, 'départ');
  } finally { await browser.close(); }
});
