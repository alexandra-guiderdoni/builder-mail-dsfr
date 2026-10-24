const test = require('node:test');
const http = require('node:http');
const path = require('node:path');
const {root, evidence, portable, click, open, enterEditor, saved, expand, download, state, store, chromium, fs, assert, engineName} = require('./browser-support.cjs');

// Données synthétiques uniquement. Le secours doit exporter la bibliothèque en mémoire, à côté du message d’échec.
const rescue = '[data-action=rescue-export]';
const promise = /récupér|restaur|état précédent|données enregistrées restent/i;
const kinds = {absent: /Stockage indisponible/, inaccessible: /inaccessible/, sature: /saturé/, conflit: /Une autre fenêtre/};
const failed = page => page.locator('#save-state').filter({hasText: 'Modifications non sauvegardées'}).waitFor();

// Quota réel de Chromium : fixé avant la première ouverture du stockage, il refuse une écriture volumineuse.
const bulky = 'Objet de remplissage synthétique. '.repeat(20000);
// Storage.overrideQuotaForOrigin est une commande CDP : hors Chromium, les tests qui en dépendent sont ignorés avec cette raison,
// jamais comptés réussis. La voie `tx.error` est couverte sur tous les moteurs par tests/storage-browser.test.cjs (#123).
const cdpOnly = engineName !== 'chromium' && 'quota réel fixé par CDP, Chromium seul';
async function limitQuota(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Storage.overrideQuotaForOrigin', {origin: 'file://', quotaSize: 400000});
}
async function saturate(page) { await page.locator('#subject').fill(bulky); await failed(page); }
async function refuseWrites(page, name) {
  await page.evaluate(name => {
    const put = IDBObjectStore.prototype.put; window.failWrites = true;
    IDBObjectStore.prototype.put = function(...args) { if (window.failWrites && this.name === 'library') throw new DOMException('Écriture refusée pour la recette', name); return put.apply(this, args); };
  }, name);
}
// Depuis #31, un conflit met la fenêtre en lecture seule : le bandeau, placé après le message, porte alors l’export de secours.
async function rescueBesideMessage(page, selector = rescue, gap = 32) {
  assert.equal(await page.locator(selector).count(), 1, 'Un secours d’export est attendu à côté du message d’échec.');
  const layout = await page.evaluate(selector => {
    const box = e => { const r = e.getBoundingClientRect(); return {top: Math.round(r.top), bottom: Math.round(r.bottom), shown: e.getClientRects().length > 0}; };
    return {scrollY: Math.round(scrollY), height: innerHeight, error: box(document.querySelector('#error')), button: box(document.querySelector(selector))};
  }, selector);
  assert(layout.error.shown && layout.button.shown, `Message et secours doivent être affichés : ${JSON.stringify(layout)}`);
  for (const item of [layout.error, layout.button]) assert(item.top >= 0 && item.bottom <= layout.height, `Message et secours doivent tenir dans la fenêtre sans défilement : ${JSON.stringify(layout)}`);
  assert(layout.button.top - layout.error.bottom >= 0 && layout.button.top - layout.error.bottom <= gap, `Le secours doit suivre le message : ${JSON.stringify(layout)}`);
  return layout;
}

test('quota réel dépassé : le secours suit le message sans défilement et exporte la bibliothèque en mémoire', {skip: cdpOnly}, async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser, {viewport: {width: 1440, height: 1000}}, limitQuota);
    await page.locator('#document-name').fill('Version sauvegardée'); await saved(page);
    const persisted = await store(page);
    await saturate(page);
    assert.match(await page.locator('#error').innerText(), kinds.sature);
    const desktop = await rescueBesideMessage(page);
    const memory = await state(page);
    const exported = JSON.parse(await fs.readFile(await download(page, rescue, 'secours-quota.json'), 'utf8'));
    assert.deepEqual(exported, memory); assert.equal(exported.documents[0].subject, bulky);
    assert.deepEqual(await store(page), persisted);
    await page.setViewportSize({width: 320, height: 568});
    await page.locator('#error').evaluate(e => e.scrollIntoView({block: 'start'}));
    const narrow = await rescueBesideMessage(page);
    await page.setViewportSize({width: 1440, height: 1000});
    await page.locator('#subject').fill('Objet allégé'); await saved(page);
    assert(await page.locator(rescue).isHidden(), 'Le secours disparaît après une sauvegarde réussie.');
    await fs.mkdir(evidence, {recursive: true});
    await fs.writeFile(path.join(evidence, 'secours-sauvegarde.json'), JSON.stringify({scenario: 'quota réel Chromium (Storage.overrideQuotaForOrigin)', desktop, narrow, exportedEqualsMemory: true, storeUnchanged: true}, null, 2));
  } finally { await browser.close(); }
});

test('stockage absent, inaccessible, saturé ou en conflit : messages distincts, secours visible, aucune récupération promise', {skip: cdpOnly}, async () => {
  const browser = await chromium.launch({headless: true}), observed = {}, problems = [];
  try {
    const absent = await open(browser, {}, page => page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', {value: undefined, configurable: true}); }));
    observed.absent = await absent.page.locator('#error').innerText();
    if (/restent dans ce navigateur/.test(await absent.page.locator('.save-panel').innerText())) problems.push('absent : le panneau promet une conservation dans le navigateur');
    await absent.page.locator('#document-name').fill('Travail sans stockage');
    const absentState = await absent.page.locator('#save-state').innerText();
    if (!/non sauvegardées/.test(absentState) || promise.test(absentState)) problems.push(`absent : état de sauvegarde inexact : ${absentState}`);
    try { await rescueBesideMessage(absent.page); const file = JSON.parse(await fs.readFile(await download(absent.page, rescue, 'secours-absent.json'), 'utf8')); if (file.documents[0].name !== 'Travail sans stockage') problems.push('absent : export différent de la mémoire'); } catch (cause) { problems.push(`absent : ${cause.message.split('\n')[0]}`); }

    const closed = await open(browser, {}, page => page.addInitScript(() => { IDBFactory.prototype.open = function() { const request = {}; queueMicrotask(() => request.onerror?.()); return request; }; }));
    observed.inaccessible = await closed.page.locator('#error').innerText();
    try { await rescueBesideMessage(closed.page); } catch (cause) { problems.push(`inaccessible : ${cause.message.split('\n')[0]}`); }

    const refused = await open(browser);
    await refused.page.locator('#document-name').fill('Avant refus'); await saved(refused.page);
    await refuseWrites(refused.page, 'UnknownError'); await refused.page.locator('#document-name').fill('Écriture refusée'); await failed(refused.page);
    observed.inaccessibleWrite = await refused.page.locator('#error').innerText();

    const first = await open(browser);
    await first.page.locator('#document-name').fill('État partagé'); await saved(first.page);
    const second = await first.context.newPage(); await second.goto(portable); await second.waitForFunction(() => window.MailBuilder?.ready); await enterEditor(second);
    await first.page.locator('#document-name').fill('Sauvegarde de la première fenêtre'); await saved(first.page);
    await second.locator('#document-name').fill('Travail de la seconde fenêtre'); await second.locator('#error').filter({hasText: 'Une autre fenêtre'}).waitFor();
    observed.conflit = await second.locator('#error').innerText();
    try { await rescueBesideMessage(second, '[data-action=read-only-export]', 400); } catch (cause) { problems.push(`conflit : ${cause.message.split('\n')[0]}`); } // #31 : lecture seule, export du bandeau

    const full = await open(browser, {}, limitQuota);
    await full.page.locator('#document-name').fill('Avant saturation'); await saved(full.page);
    await saturate(full.page);
    observed.sature = await full.page.locator('#error').innerText();
    try { await rescueBesideMessage(full.page); } catch (cause) { problems.push(`saturé : ${cause.message.split('\n')[0]}`); }

    const expected = {absent: 'absent', inaccessible: 'inaccessible', inaccessibleWrite: 'inaccessible', sature: 'sature', conflit: 'conflit'};
    for (const [scenario, kind] of Object.entries(expected)) {
      const message = observed[scenario];
      if (!kinds[kind].test(message)) problems.push(`${scenario} : le message ne nomme pas le cas « ${kind} » : ${message}`);
      for (const [other, pattern] of Object.entries(kinds)) if (other !== kind && pattern.test(message)) problems.push(`${scenario} : le message évoque aussi « ${other} » : ${message}`);
      if (promise.test(message)) problems.push(`${scenario} : le message promet une récupération non vérifiée : ${message}`);
    }
    assert.deepEqual(problems, []);
  } finally { await browser.close(); }
});

test('après un échec de sauvegarde, les changements de vue gardent le travail en mémoire ; champs invalides et chargements restent bloquants', {skip: cdpOnly}, async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser, {}, limitQuota);
    await page.locator('#document-name').fill('Version sauvegardée'); await saved(page);
    const persisted = await store(page), first = (await state(page)).activeId;
    await saturate(page); await page.locator('#document-name').fill('Travail non sauvegardé'); await failed(page);
    await click(page, '[data-action=library-home]');
    assert(await page.locator('#library-home').isVisible(), 'Le retour à Mes newsletters reste disponible après l’échec.');
    assert.match(await page.locator(`[data-document="${first}"]`).innerText(), /Travail non sauvegardé/);
    assert.doesNotMatch(await page.locator('#error').innerText(), /recharger l’application/);
    await click(page, `[data-document="${first}"] [data-library-action=duplicate]`);
    await page.locator('#notice').filter({hasText: 'Copie indépendante'}).waitFor();
    assert.match(await page.locator('#notice').innerText(), /non sauvegardée/);
    assert.doesNotMatch(await page.locator('#error').innerText(), /recharger l’application/);
    await click(page, '[data-action=new-document]'); await page.locator('#editor-page').waitFor({state: 'visible'});
    assert.equal((await state(page)).documents.length, 3);
    await click(page, '[data-action=library-home]'); await click(page, `[data-document="${first}"] [data-library-action=open]`);
    assert.equal(await page.locator('#document-name').inputValue(), 'Travail non sauvegardé');
    // Contrat de #37 : l’URL invalide reste un brouillon ; le changement de vue est refusé avec le message du lien.
    await page.locator('#article-source').fill('javascript:alert(1)'); await click(page, '[data-action=library-home]');
    assert(await page.locator('#editor-page').isVisible()); await page.locator('#error').filter({hasText: 'Corrigez ce lien'}).waitFor();
    await click(page, '[data-action=cancel-fields]');
    await page.evaluate(() => { const files = MailBuilder.Files, gate = new Promise(resolve => { window.finishImage = resolve; }); MailBuilder.Files = {...files, image: async file => { await gate; return files.image(file); }}; });
    await page.locator('[data-image-field]').first().setInputFiles(path.join(root, 'app/assets/icon-192.png')); await page.waitForFunction(() => MailBuilder.pendingInputs === 1);
    await click(page, '[data-action=library-home]'); assert(await page.locator('#editor-page').isVisible());
    await page.evaluate(() => finishImage()); await page.waitForFunction(() => MailBuilder.pendingInputs === 0);
    await click(page, '[data-action=library-home]'); assert(await page.locator('#library-home').isVisible());
    assert.deepEqual(await store(page), persisted);
    const exported = JSON.parse(await fs.readFile(await download(page, rescue, 'secours-navigation.json'), 'utf8'));
    assert.deepEqual(exported, await state(page)); assert.equal(exported.documents.length, 3);
  } finally { await browser.close(); }
});

// Décision du 24 octobre (#32 et #37) : l’export de secours n’est jamais bloqué par une URL invalide ;
// la copie et l’export HTML du courriel le restent. Le brouillon n’est pas dans le modèle, donc pas dans le secours.
test('un lien en cours de saisie bloque l’export du courriel, jamais l’export de secours', {skip: cdpOnly}, async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser, {}, limitQuota);
    await page.locator('#document-name').fill('Version sauvegardée'); await saved(page);
    await saturate(page); await rescueBesideMessage(page);
    await page.locator('#article-source').fill('https://'); await page.locator('#article-source').blur();
    await page.locator('#error-article-source').waitFor();
    let downloads = 0; page.on('download', () => { downloads++; });
    await expand(page, 'Fichiers et récupération');
    await click(page, '[data-action=export-mail]'); await page.locator('#error').filter({hasText: 'Corrigez ce lien'}).waitFor();
    assert.equal(downloads, 0, 'Le courriel n’est pas exporté avec un lien invalide.');
    const event = page.waitForEvent('download', {timeout: 5000}); await click(page, rescue);
    const file = await event.catch(() => null);
    assert(file, `L’export de secours ne dépend pas du lien en cours de saisie : ${await page.locator('#error').innerText()}`);
    const destination = path.join(evidence, 'secours-brouillon.json'); await file.saveAs(destination);
    const exported = JSON.parse(await fs.readFile(destination, 'utf8'));
    assert.deepEqual(exported, await state(page));
    assert(!JSON.stringify(exported).includes('"source":"https://"'), 'Le brouillon reste hors du secours.');
  } finally { await browser.close(); }
});

test('après un échec, le rechargement et l’activation d’une mise à jour PWA restent refusés jusqu’à une sauvegarde réussie', async () => {
  const browser = await chromium.launch({headless: true});
  let server, generation = 1;
  try {
    const base = path.join(root, 'app/distribution/web');
    server = http.createServer(async (request, response) => {
      try {
        const relative = new URL(request.url, 'http://localhost').pathname;
        const file = path.resolve(base, '.' + (relative === '/' ? '/index.html' : relative));
        if (!file.startsWith(base + path.sep)) { response.writeHead(403); response.end(); return; }
        let data = await fs.readFile(file);
        if (generation === 2 && path.basename(file) === 'sw.js') data = Buffer.concat([data, Buffer.from('\n// génération synthétique 2\n')]);
        const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
        response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(data);
      } catch { response.writeHead(404); response.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/`, {page} = await open(browser);
    await page.goto(url); await page.waitForFunction(() => window.MailBuilder?.ready && !!navigator.serviceWorker.controller);
    await enterEditor(page);
    await page.locator('#document-name').fill('Avant mise à jour'); await saved(page);
    generation = 2;
    await page.evaluate(async () => { window.previousController = navigator.serviceWorker.controller; await (await navigator.serviceWorker.getRegistration()).update(); });
    await page.locator('#update').waitFor({state: 'visible'});
    await page.evaluate(() => { window.sameDocument = true; });
    await refuseWrites(page, 'QuotaExceededError');
    await page.locator('#document-name').click(); await page.locator('#document-name').fill('Travail à protéger'); await failed(page);
    await click(page, '#update'); await page.locator('#error').filter({hasText: 'La sauvegarde doit réussir'}).waitFor();
    assert.deepEqual(await page.evaluate(async () => ({same: window.sameDocument === true, waiting: !!(await navigator.serviceWorker.getRegistration()).waiting, controller: navigator.serviceWorker.controller === window.previousController})), {same: true, waiting: true, controller: true});
    assert.equal((await store(page)).library.documents[0].name, 'Avant mise à jour');
    await assert.rejects(page.evaluate(() => MailBuilder.State.flush()), /La sauvegarde doit réussir/);
    const dialog = page.waitForEvent('dialog'); await page.close({runBeforeUnload: true}); const prompt = await dialog;
    assert.equal(prompt.type(), 'beforeunload'); await prompt.dismiss();
    assert(!page.isClosed()); assert.equal(await page.evaluate(() => window.sameDocument), true);
    assert.equal(await page.locator('#document-name').inputValue(), 'Travail à protéger');
    await page.evaluate(() => { window.failWrites = false; });
    const reload = page.waitForEvent('load'); await click(page, '#update'); await reload; await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.equal(await page.evaluate(() => window.sameDocument), undefined);
    assert.equal((await store(page)).library.documents[0].name, 'Travail à protéger');
  } finally { if (server?.listening) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await browser.close(); }
});

test('une bibliothèque de version inconnue ne promet une restauration que si un état précédent lisible existe', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    const write = entries => page.evaluate(async entries => {
      await new Promise((resolve, reject) => { const request = indexedDB.open('builder-mail-dsfr-library', 1); request.onupgradeneeded = () => request.result.createObjectStore('library'); request.onsuccess = () => { const tx = request.result.transaction('library', 'readwrite'); for (const [key, value] of entries) tx.objectStore('library').put(value, key); tx.oncomplete = () => { request.result.close(); resolve(); }; tx.onerror = reject; }; request.onerror = reject; });
    }, entries);
    const library = await state(page), unknown = {token: 'version-inconnue-synthetique', library: {...library, version: 99}};
    await write([['current', unknown]]);
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    await page.locator('#error').filter({hasText: 'Version de bibliothèque non prise en charge'}).waitFor();
    assert.doesNotMatch(await page.locator('#error').innerText(), promise);
    assert.equal(await page.locator(rescue).count(), 1); assert(await page.locator(rescue).isVisible());
    await write([['previous', {token: 'precedent-synthetique', library: {...library, documents: library.documents.map(d => ({...d, name: 'État précédent synthétique'}))}}]]);
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    await page.locator('#error').filter({hasText: 'Version de bibliothèque non prise en charge'}).waitFor();
    assert.match(await page.locator('#error').innerText(), /« Restaurer l’état précédent »/);
  } finally { await browser.close(); }
});
