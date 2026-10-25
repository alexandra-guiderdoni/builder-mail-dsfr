const test = require('node:test');
const path = require('node:path');
const {root, open, click, saved, state, store, chromium, portable, enterEditor, assert} = require('./browser-support.cjs');

// #122 : les écrivains différés de #notice protégés par le jeton `since`. L’écriture lente est retenue pour rendre la
// course déterministe, un bloc est ajouté entre-temps, puis la lente est relâchée : son annonce doit se taire.

const notice = page => page.locator('#notice').innerText();

// Hold sur Storage.save : utilisé par les actions qui finissent par State.change.
const holdSave = page => page.evaluate(() => {
  if (!window.__real) window.__real = MailBuilder.Storage.save;
  window.__release = null;
  MailBuilder.Storage = {...MailBuilder.Storage, save: (v, t) => window.__release ? window.__real(v, t) : new Promise((res, rej) => { window.__release = () => window.__real(v, t).then(res, rej); })};
});
const releaseSave = async page => { await page.waitForFunction(() => window.__release); await page.evaluate(() => window.__release()); await saved(page); };

// Un ajout de bloc écrit « ajouté » dans #notice immédiatement.
const addBlockNow = page => page.evaluate(() => {
  const select = document.getElementById('catalogue'); select.value = select.options[0].value;
  MailBuilder.Actions['add-block']();
  return document.getElementById('notice').textContent;
});

test('import de projet : « Import ajouté » n’écrase pas une annonce plus récente', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await page.locator('#document-name').fill('Avant import'); await saved(page);
    // Fichier synthétique : composition minimale, le même format qu’un export JSON.
    const payload = await page.evaluate(() => JSON.stringify(MailBuilder.Model.document(MailBuilder.Model.create('Composition importée', [0]))));
    await holdSave(page);
    // L’événement change du project-input doit tenir le File en main : passage par un DataTransfer synthétique.
    await page.evaluate(payload => {
      const file = new File([payload], 'import.courriel.json', {type: 'application/json'});
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.getElementById('project-input'); input.files = dt.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }, payload);
    // Attente que l’import ait engagé l’écriture retenue.
    await page.waitForFunction(() => !!window.__release);
    const added = await addBlockNow(page);
    assert.match(added, /ajouté/, 'l’ajout de bloc est annoncé aussitôt');
    await releaseSave(page);
    assert.equal(await notice(page), added, 'la réussite différée de l’import ne remplace pas l’annonce plus récente');
    assert.equal((await state(page)).documents.length, 2, 'l’import est bien enregistré');
  } finally { await browser.close(); }
});

test('chargement d’image : la description différée n’écrase pas une annonce plus récente', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await page.locator('#document-name').fill('Image différée'); await saved(page);
    // Interception du chargement d’image : la lecture est retenue jusqu’à la libération.
    await page.evaluate(() => {
      const files = MailBuilder.Files, gate = new Promise(resolve => { window.finishImage = resolve; });
      MailBuilder.Files = {...files, image: async (file, display) => { await gate; return files.image(file, display); }};
    });
    await page.locator('[data-image-field]').first().setInputFiles(path.join(root, 'app/assets/icon-192.png'));
    await page.waitForFunction(() => MailBuilder.pendingInputs === 1);
    // Pendant le chargement, A.pendingInputs est à 1 et guardEdit refuse toute action State.change. L’annonce
    // concurrente est une écriture directe depuis une source non gardée (par exemple un événement de PWA).
    const other = 'Mise à jour prête : course synthétique.';
    await page.evaluate(message => MailBuilder.notice(message), other);
    assert.equal(await notice(page), other, 'l’annonce concurrente est écrite aussitôt');
    await page.evaluate(() => window.finishImage());
    await page.waitForFunction(() => MailBuilder.pendingInputs === 0);
    await saved(page);
    assert.equal(await notice(page), other, 'la description différée de l’image ne remplace pas l’annonce plus récente');
  } finally { await browser.close(); }
});

test('copie du courriel : « Courriel copié » n’écrase pas une annonce plus récente', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser, {permissions: ['clipboard-read', 'clipboard-write']});
    await page.locator('#document-name').fill('Copie différée'); await saved(page);
    // Stub de Checks pour éviter la boîte de confirmation sur du contenu de démonstration.
    await page.evaluate(() => { MailBuilder.Checks = {...MailBuilder.Checks, confirm: () => Promise.resolve(true)}; });
    // L’écriture du presse-papiers est retenue pour que l’annonce « copié » soit différée.
    await page.evaluate(() => {
      const original = navigator.clipboard.write.bind(navigator.clipboard);
      const gate = new Promise(resolve => { window.finishCopy = resolve; });
      navigator.clipboard.write = async items => { await gate; return original(items); };
    });
    // Déclenche la copie sans l’attendre, puis ajoute un bloc avant la libération.
    await page.evaluate(() => { window.__copying = MailBuilder.Files.copy().catch(e => { window.__copyError = e.message; }); });
    // La copie passe par A.notice("") avant d’attendre l’écriture : on attend que #notice soit vide.
    await page.waitForFunction(() => document.getElementById('notice').textContent === '');
    const added = await addBlockNow(page);
    assert.match(added, /ajouté/, 'l’ajout de bloc est annoncé aussitôt pendant la copie');
    await page.evaluate(() => window.finishCopy());
    await page.evaluate(() => window.__copying);
    assert.equal(await page.evaluate(() => window.__copyError), undefined, 'la copie n’a pas échoué');
    assert.equal(await notice(page), added, 'l’annonce de copie ne remplace pas l’annonce plus récente');
  } finally { await browser.close(); }
});

// Préparation d’un état précédent dans IndexedDB : la restauration le relit puis le réécrit comme nouveau courant.
const writePrevious = (page, entries) => page.evaluate(entries => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('builder-mail-dsfr-library', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('library');
    request.onsuccess = () => {
      const tx = request.result.transaction('library', 'readwrite');
      for (const [key, value] of entries) tx.objectStore('library').put(value, key);
      tx.oncomplete = () => { request.result.close(); resolve(); };
      tx.onerror = reject;
    };
    request.onerror = reject;
  });
}, entries);

test('récupération d’un état précédent : « État précédent relu » n’écrase pas une annonce plus récente', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await page.locator('#document-name').fill('État de départ'); await saved(page);
    const base = await state(page);
    const previous = {token: 'precedent-synthetique', library: {...base, documents: base.documents.map(d => ({...d, name: 'État précédent synthétique'}))}};
    await writePrevious(page, [['previous', previous]]);
    await holdSave(page);
    // Lance la récupération sans l’attendre : la relecture puis l’écriture passent par Storage.save.
    await page.evaluate(() => { window.__pending = MailBuilder.State.recover().catch(e => { window.__error = e.message; }); });
    await page.waitForFunction(() => !!window.__release);
    // restoring=true pendant recover : seules les écritures directes de #notice passent (ici une source non gardée).
    const other = 'Course synthétique pendant la récupération.';
    await page.evaluate(message => MailBuilder.notice(message), other);
    assert.equal(await notice(page), other);
    await releaseSave(page);
    await page.evaluate(() => window.__pending);
    assert.equal(await notice(page), other, 'l’annonce « État précédent relu » ne remplace pas l’annonce plus récente');
    assert.match((await state(page)).documents[0].name, /précédent synthétique/, 'la récupération a bien réécrit l’état courant');
  } finally { await browser.close(); }
});

test('reprise de la main : « Main reprise » n’écrase pas une annonce plus récente', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const first = await open(browser);
    await first.page.locator('#document-name').fill('État partagé'); await saved(first.page);
    const second = await first.context.newPage();
    await second.goto(portable); await second.waitForFunction(() => window.MailBuilder?.ready); await enterEditor(second);
    // La première fenêtre reprend un pas d’avance pour que la seconde passe en lecture seule à sa prochaine écriture.
    await first.page.locator('#document-name').fill('Première avance'); await saved(first.page);
    await second.locator('#document-name').fill('Travail de la seconde');
    await second.locator('#error').filter({hasText: 'Une autre fenêtre'}).waitFor();
    // Hold sur Storage.save avant la reprise de la main : son écriture finale est retenue.
    await holdSave(second);
    await second.evaluate(() => { window.__pending = MailBuilder.State.takeOver().catch(e => { window.__error = e.message; }); });
    await second.waitForFunction(() => !!window.__release);
    // restoring=true pendant takeOver : écriture directe de #notice depuis une source non gardée (A.notice initial posé par takeOver est vide).
    const other = 'Course synthétique pendant la reprise.';
    await second.evaluate(message => MailBuilder.notice(message), other);
    assert.equal(await notice(second), other);
    await releaseSave(second);
    await second.evaluate(() => window.__pending);
    assert.equal(await notice(second), other, 'l’annonce « Main reprise » ne remplace pas l’annonce plus récente');
  } finally { await browser.close(); }
});

// pwa.js:10 (invite d’installation PWA) : le code porte aussi le jeton `since` relevé au départ du clic sur `#install`.
// Aucun test navigateur ne l’exerce : `beforeinstallprompt` n’est pas déclenchable en Playwright headless et la variante
// portable (`file://`, utilisée par tous ces tests) sort du module pwa.js avant d’enregistrer le listener. Documenté dans
// docs/MAINTENANCE.md, section « Annonces ».
