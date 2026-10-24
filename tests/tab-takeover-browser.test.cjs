const test = require('node:test');
const http = require('node:http');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {root, portable, click, open, enterEditor, saved, expand, download, state, store, chromium, fs, assert} = require('./browser-support.cjs');

// Données synthétiques uniquement. Chaque test constate séparément la mémoire, le stockage et l’export.
const banner = '#read-only', takeOver = '[data-action=take-over]', rescue = '[data-action=read-only-export]', reload = '[data-action=reload-page]';
const copyName = name => new RegExp(`^${name} · copie à \\d{1,2} h \\d{2}$`);
async function expectReadOnly(page, label) {
  await page.locator(banner).waitFor({state: 'visible', timeout: 5000}).catch(() => {});
  assert(await page.locator(banner).isVisible(), `${label} : un bandeau de lecture seule est attendu.`);
  assert(await page.locator('#document-name').isDisabled(), `${label} : la saisie doit être désactivée en lecture seule.`);
}
async function expectWritable(page, label) {
  assert(await page.locator(banner).isHidden(), `${label} : le bandeau de lecture seule doit disparaître.`);
  assert(await page.locator('#document-name').isEnabled(), `${label} : la saisie doit être de nouveau possible.`);
}
const exported = async (page, filename) => JSON.parse(await fs.readFile(await download(page, rescue, filename), 'utf8'));
async function failWrites(page) {
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put; window.failWrites = true;
    IDBObjectStore.prototype.put = function(...args) { if (window.failWrites && this.name === 'library') throw new DOMException('Quota de recette', 'QuotaExceededError'); return put.apply(this, args); };
  });
}
async function second(context, url = portable) {
  const page = await context.newPage(); await page.goto(url); await page.waitForFunction(() => window.MailBuilder?.ready); await enterEditor(page); return page;
}
// La première fenêtre enregistre après l’ouverture de la seconde : la saisie suivante de celle-ci entre en conflit.
async function conflict(browser) {
  const {page: first, context} = await open(browser);
  await first.locator('#document-name').fill('Composition commune'); await saved(first);
  const other = await second(context);
  await first.locator('#document-name').fill('Version de la première fenêtre'); await saved(first);
  await other.locator('#document-name').fill('Version de la seconde fenêtre'); await other.locator('#error').filter({hasText: 'Une autre fenêtre'}).waitFor();
  return {context, first, other};
}

test('reprendre la main ajoute les compositions divergentes en copies horodatées ; l’ancien onglet passe en lecture seule puis se ferme sans rien écrire', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {context, first, other} = await conflict(browser), errors = [];
    for (const page of [first, other]) page.on('pageerror', e => errors.push(e.message));
    await expectReadOnly(other, 'fenêtre en conflit');
    assert(await other.locator(takeOver).isVisible(), 'Le bandeau propose « Reprendre la main ».');
    const storedBefore = await store(first), firstMemory = await state(first), otherMemory = await state(other);
    assert.deepEqual(storedBefore.library, firstMemory);
    assert.equal(otherMemory.documents[0].name, 'Version de la seconde fenêtre');
    assert.deepEqual(await exported(other, 'reprise-avant.json'), otherMemory, 'L’export porte sur la mémoire de la fenêtre en lecture seule.');
    assert.deepEqual(await store(first), storedBefore, 'Le bandeau n’écrit rien avant la reprise.');

    await click(other, takeOver); await saved(other);
    const merged = await state(other), storedAfter = await store(other);
    assert.deepEqual(storedAfter.library, merged, 'Après la reprise, le stockage égale la mémoire de la fenêtre qui a repris la main.');
    assert.equal(merged.documents.length, 2);
    assert.deepEqual(merged.documents[0], storedBefore.library.documents[0], 'La composition de l’autre fenêtre reste intacte, avec son identifiant.');
    assert.match(merged.documents[1].name, copyName('Version de la seconde fenêtre'));
    assert.notEqual(merged.documents[1].id, otherMemory.documents[0].id);
    assert.deepEqual(merged.documents[1].blocks.map(b => b.values), otherMemory.documents[0].blocks.map(b => b.values));
    assert.equal(merged.activeId, merged.documents[1].id);
    await expectWritable(other, 'fenêtre qui a repris la main');
    assert.match(await other.locator('#notice').innerText(), /copie/);

    await expectReadOnly(first, 'ancien onglet');
    assert(await first.locator(takeOver).isVisible());
    assert.match(await first.locator('#save-state').innerText(), /^Lecture seule/, 'Le statut ne doit plus annoncer une sauvegarde dans l’ancien onglet.');
    assert.deepEqual(await state(first), firstMemory, 'La mémoire de l’ancien onglet est inchangée.');
    assert.deepEqual(await exported(first, 'ancien-onglet.json'), firstMemory);

    let dialogs = 0; first.on('dialog', async dialog => { dialogs++; await dialog.accept(); });
    await Promise.all([first.waitForEvent('close'), first.close({runBeforeUnload: true})]);
    assert.equal(dialogs, 0, 'L’ancien onglet sans travail non enregistré se ferme sans avertissement.');
    assert.deepEqual((await store(other)).library, merged, 'La fermeture de l’ancien onglet n’écrit rien.');
    await other.locator('#subject').fill('Objet après la reprise'); await saved(other);
    assert.equal((await store(other)).library.documents[1].subject, 'Objet après la reprise');
    const reopened = await second(context);
    assert.deepEqual(await state(reopened), await state(other));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('l’ancien onglet reprend la main à son tour sans dupliquer une composition qu’il n’a pas modifiée', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {first, other} = await conflict(browser);
    await expectReadOnly(other, 'fenêtre en conflit'); await click(other, takeOver); await saved(other);
    await expectReadOnly(first, 'ancien onglet');
    const storedBefore = await store(other), otherMemory = await state(other);
    await click(first, takeOver); await saved(first);
    const storedAfter = await store(first), firstMemory = await state(first);
    assert.deepEqual(storedAfter.library.documents, storedBefore.library.documents, 'Aucune copie ni perte quand rien n’a divergé.');
    assert.deepEqual(storedAfter.library, firstMemory);
    await expectWritable(first, 'ancien onglet après reprise');
    await expectReadOnly(other, 'fenêtre dépossédée');
    assert.deepEqual(await state(other), otherMemory);
  } finally { await browser.close(); }
});

test('un modèle et une identité créés dans la fenêtre en conflit rejoignent aussi la bibliothèque en copies, sans copier la composition inchangée', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page: first, context} = await open(browser);
    await first.locator('#document-name').fill('Composition commune'); await saved(first);
    const other = await second(context);
    await first.locator('#document-name').fill('Version de la première fenêtre'); await saved(first);
    await other.evaluate(() => MailBuilder.State.change(lib => {
      const M = MailBuilder.Model, doc = lib.documents[0];
      lib.templates.push(M.clone(doc, 'Modèle de recette'));
      lib.identities.push({id: M.id(), name: 'Identité de recette', blocks: M.copy(doc.blocks.filter(b => ['En-têtes', 'Pieds de page'].includes(M.component(b.component).family)))});
    }));
    await expectReadOnly(other, 'fenêtre en conflit');
    const storedBefore = await store(first), otherMemory = await state(other);
    await click(other, takeOver); await saved(other);
    const merged = await state(other);
    assert.deepEqual((await store(other)).library, merged);
    assert.deepEqual(merged.documents, storedBefore.library.documents, 'La composition que cette fenêtre n’a pas modifiée n’est pas copiée.');
    assert.equal(merged.templates.length, 1); assert.match(merged.templates[0].name, copyName('Modèle de recette'));
    assert.deepEqual(merged.templates[0].blocks.map(b => b.values), otherMemory.templates[0].blocks.map(b => b.values));
    assert.equal(merged.identities.length, 1); assert.match(merged.identities[0].name, copyName('Identité de recette'));
    assert.notEqual(merged.identities[0].id, otherMemory.identities[0].id);
    assert.deepEqual(merged.identities[0].blocks.map(b => b.values), otherMemory.identities[0].blocks.map(b => b.values));
  } finally { await browser.close(); }
});

test('un échec du stockage pendant la reprise n’écrit rien, garde la mémoire et propose l’export', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {first, other} = await conflict(browser);
    await expectReadOnly(other, 'fenêtre en conflit');
    const storedBefore = await store(first), otherMemory = await state(other);
    await failWrites(other);
    await click(other, takeOver);
    await other.locator('#save-state').filter({hasText: 'Reprise impossible'}).waitFor({timeout: 5000});
    assert.match(await other.locator('#error').innerText(), /export/i);
    assert.deepEqual(await store(first), storedBefore, 'Rien n’est écrit quand le stockage échoue pendant la reprise.');
    assert.deepEqual(await state(other), otherMemory, 'La mémoire reste celle de la fenêtre en conflit.');
    await expectReadOnly(other, 'reprise échouée');
    assert.deepEqual(await exported(other, 'reprise-echouee.json'), otherMemory);
    assert(await first.locator(banner).isHidden(), 'L’autre fenêtre garde la main après une reprise échouée.');
    await first.locator('#subject').fill('La première fenêtre enregistre toujours'); await saved(first);
    await other.evaluate(() => { window.failWrites = false; });
    await click(other, takeOver); await saved(other);
    const merged = await state(other);
    assert.equal(merged.documents[0].subject, 'La première fenêtre enregistre toujours');
    assert.match(merged.documents[1].name, copyName('Version de la seconde fenêtre'));
    assert.deepEqual((await store(other)).library, merged);
  } finally { await browser.close(); }
});

test('une bibliothèque enregistrée par une autre version de l’application refuse la reprise sans rien écrire', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {first, other} = await conflict(browser);
    await expectReadOnly(other, 'fenêtre en conflit');
    await first.evaluate(async () => {
      const record = await MailBuilder.Storage.load(); record.app = 'version-de-recette-distincte'; record.token = 'jeton-de-recette';
      await new Promise((resolve, reject) => { const request = indexedDB.open('builder-mail-dsfr-library', 1); request.onsuccess = () => { const tx = request.result.transaction('library', 'readwrite'); tx.objectStore('library').put(record, 'current'); tx.oncomplete = () => { request.result.close(); resolve(); }; tx.onerror = reject; }; });
    });
    const storedBefore = await store(first), otherMemory = await state(other);
    await click(other, takeOver);
    await other.locator('#error').filter({hasText: 'version'}).waitFor({timeout: 5000});
    assert.deepEqual(await store(first), storedBefore); assert.deepEqual(await state(other), otherMemory);
    assert(await other.locator(reload).isVisible(), 'L’onglet doit proposer le rechargement après export.');
    assert(await other.locator(takeOver).isHidden());
    assert.deepEqual(await exported(other, 'autre-version.json'), otherMemory);
  } finally { await browser.close(); }
});

test('deux versions ouvertes pendant une mise à jour : l’onglet en retard exporte puis se recharge avant de reprendre', async () => {
  const browser = await chromium.launch({headless: true}); let server, generation = 1;
  try {
    const base = path.join(root, 'app/distribution/web');
    // Seconde livraison synthétique : même catalogue, code de l’application modifié par un commentaire.
    const next = JSON.parse(execFileSync('python3', ['-c', `import sys,json,base64
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'scripts')
import build_app
original=Path.read_text
target=build_app.SOURCE/'state.js'
with patch.object(Path,'read_text',lambda p,*a,**k: original(p,*a,**k)+('\\n/* livraison de recette suivante */' if p==target else '')):
 result=build_app.build()
print(json.dumps({p.name:base64.b64encode(data).decode('ascii') for p,data in result.items() if p.parent==build_app.DIST/'web' and p.name in ['sw.js','index.html']}))`], {cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}));
    server = http.createServer(async (request, response) => {
      try {
        const relative = new URL(request.url, 'http://localhost').pathname, file = path.resolve(base, '.' + (relative === '/' ? '/index.html' : relative));
        if (!file.startsWith(base + path.sep)) { response.writeHead(403); response.end(); return; }
        const data = generation === 2 && next[path.basename(file)] ? Buffer.from(next[path.basename(file)], 'base64') : await fs.readFile(file);
        const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
        response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(data);
      } catch { response.writeHead(404); response.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/`, {page: first, context} = await open(browser);
    await first.goto(url); await first.waitForFunction(() => window.MailBuilder?.ready && !!navigator.serviceWorker.controller); await enterEditor(first);
    await first.locator('#document-name').fill('Avant la mise à jour'); await saved(first);
    const late = await second(context, url); await late.waitForFunction(() => !!navigator.serviceWorker.controller);
    await first.locator('#document-name').fill('Enregistré avant la mise à jour'); await saved(first);
    await late.locator('#subject').fill('Travail non enregistré de la fenêtre en retard'); await late.locator('#error').filter({hasText: 'Une autre fenêtre'}).waitFor();
    await expectReadOnly(late, 'fenêtre en conflit avant la mise à jour');
    const oldVersion = await late.evaluate(() => MailBuilder.Storage.version);
    assert.match(oldVersion, /^[0-9a-f]{16}$/, 'La page porte la version de son application.');

    generation = 2;
    await first.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration.update(); });
    await first.locator('#update').waitFor({state: 'visible'});
    const reloaded = first.waitForEvent('load'); await click(first, '#update'); await reloaded; await first.waitForFunction(() => window.MailBuilder?.ready);
    const newVersion = await first.evaluate(() => MailBuilder.Storage.version);
    assert.notEqual(newVersion, oldVersion, 'La fenêtre mise à jour exécute la nouvelle version.');

    await late.locator(reload).waitFor({state: 'visible', timeout: 5000}).catch(() => {});
    assert(await late.locator(reload).isVisible(), 'L’onglet en retard propose le rechargement.');
    assert(await late.locator(takeOver).isHidden(), 'L’onglet en retard ne peut pas reprendre la main avant rechargement.');
    assert.match(await late.locator(banner).innerText(), /version/);
    await enterEditor(first); await first.locator('#document-name').fill('Écrit par la nouvelle version'); await saved(first);
    const storedBefore = await store(first), lateMemory = await state(late);
    assert.equal(storedBefore.app, newVersion, 'Le stockage nomme la version qui l’a écrit.');
    assert.equal(lateMemory.documents[0].subject, 'Travail non enregistré de la fenêtre en retard');
    assert.notEqual(storedBefore.library.documents[0].subject, lateMemory.documents[0].subject);

    assert.match(await late.evaluate(() => MailBuilder.State.takeOver().then(() => 'reprise acceptée', e => e.message)), /version/);
    assert.deepEqual(await store(first), storedBefore); assert.deepEqual(await state(late), lateMemory);
    await late.evaluate(() => { window.sameDocument = true; });
    await click(late, reload); await late.locator('#error').filter({hasText: 'Exportez'}).waitFor({timeout: 5000});
    assert(await late.evaluate(() => window.sameDocument), 'Le rechargement attend l’export du travail non enregistré.');
    const rescued = await exported(late, 'onglet-en-retard.json');
    assert.deepEqual(rescued, lateMemory, 'L’export de l’onglet en retard contient son travail non enregistré.');
    const navigation = late.waitForEvent('load'); await click(late, reload); await navigation; await late.waitForFunction(() => window.MailBuilder?.ready);
    assert.equal(await late.evaluate(() => MailBuilder.Storage.version), newVersion);
    assert.deepEqual(await state(late), storedBefore.library, 'Après rechargement, la mémoire est la bibliothèque stockée.');
    assert.equal(await late.locator(banner).isHidden(), true);
    assert.deepEqual(await store(first), storedBefore, 'Le rechargement n’écrit rien.');
  } finally { if (server?.listening) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await browser.close(); }
});

test('une image en cours de lecture bloque la reprise : elle n’est jamais versée dans la composition de l’autre fenêtre', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page: first, context} = await open(browser);
    await first.locator('#document-name').fill('Composition commune'); await saved(first);
    const other = await second(context), image = other.locator('[data-image-field]').first(), field = await image.getAttribute('data-image-field');
    await first.locator('#document-name').fill('Version de la première fenêtre'); await saved(first);
    await other.evaluate(() => { const files = MailBuilder.Files, gate = new Promise(resolve => { window.finishImage = resolve; }); MailBuilder.Files = {...files, image: async file => { await gate; MailBuilder.Files = files; return files.image(file); }}; });
    await image.setInputFiles(path.join(root, 'app/assets/icon-192.png')); await other.waitForFunction(() => MailBuilder.pendingInputs === 1);
    await other.locator('#document-name').fill('Version de la seconde fenêtre'); await expectReadOnly(other, 'fenêtre en conflit pendant la lecture d’une image');
    const storedBefore = await store(first), otherMemory = await state(other);
    assert.match(await other.evaluate(() => MailBuilder.State.takeOver().then(() => 'reprise acceptée', e => e.message)), /chargement/);
    assert.deepEqual(await store(first), storedBefore, 'Aucune reprise pendant la lecture d’un fichier.'); assert.deepEqual(await state(other), otherMemory);
    await other.evaluate(() => window.finishImage()); await other.waitForFunction(() => MailBuilder.pendingInputs === 0);
    await click(other, takeOver); await saved(other);
    const merged = await state(other);
    assert.deepEqual(merged.documents[0], storedBefore.library.documents[0], 'La composition de l’autre fenêtre ne reçoit pas l’image.');
    assert.equal(merged.documents[1].blocks[0].values[field], otherMemory.documents[0].blocks[0].values[field]);
    assert.deepEqual((await store(other)).library, merged);
  } finally { await browser.close(); }
});

test('un retard de version signalé pendant la reprise l’annule sans écrire et garde la lecture seule', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {first, other} = await conflict(browser);
    await expectReadOnly(other, 'fenêtre en conflit');
    const storedBefore = await store(first), otherMemory = await state(other);
    const outcome = await other.evaluate(() => { const taking = MailBuilder.State.takeOver(); MailBuilder.State.outdated(); return taking.then(() => 'reprise acceptée', e => e.message); });
    assert.match(outcome, /version/);
    assert.deepEqual(await store(first), storedBefore); assert.deepEqual(await state(other), otherMemory);
    await expectReadOnly(other, 'fenêtre en retard');
    assert(await other.locator(reload).isVisible()); assert(await other.locator(takeOver).isHidden());
  } finally { await browser.close(); }
});

test('une restauration refusée par le jeton passe la fenêtre en lecture seule avec export et reprise', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page: first, context} = await open(browser);
    await first.locator('#document-name').fill('Composition commune'); await saved(first);
    const other = await second(context);
    await first.locator('#document-name').fill('Version de la première fenêtre'); await saved(first);
    const storedBefore = await store(first), otherMemory = await state(other);
    await expand(other, 'Fichiers et récupération'); await click(other, '[data-action=recover]');
    await other.locator('#error').filter({hasText: 'Une autre fenêtre'}).waitFor();
    assert.deepEqual(await store(first), storedBefore); assert.deepEqual(await state(other), otherMemory);
    await expectReadOnly(other, 'restauration refusée');
    assert(await other.locator(takeOver).isVisible());
  } finally { await browser.close(); }
});
