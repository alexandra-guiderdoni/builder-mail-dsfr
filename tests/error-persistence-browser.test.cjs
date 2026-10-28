const test = require('node:test');
const {open, saved, click, chromium, assert, engineName} = require('./browser-support.cjs');
const {rejectLargeWrites, limitNativeQuota} = require('./portability-storage.cjs');

// #122 : #error porte deux familles de messages. Les alertes persistantes (échec de sauvegarde, lecture seule) sont
// portées par l’état (`failed`, `readOnly`) ; les erreurs ponctuelles (champ invalide, action refusée) écrivent dans le
// même emplacement sans effacer durablement la persistante. `A.error("")` depuis `cancel-fields` (library-actions.js:104)
// efface l’alerte en cours sans restaurer celle qui vient de l’état : ce test vérifie la restauration.

// Quota réel de Chromium : fixé avant la première ouverture du stockage.
const bulky = 'Objet de remplissage synthétique. '.repeat(20000);
const limitQuota = engineName === 'chromium' ? limitNativeQuota : rejectLargeWrites;
const failed = page => page.locator('#save-state').filter({hasText: 'Modifications non sauvegardées'}).waitFor();

test('cancel-fields n’éteint pas l’alerte persistante d’échec de sauvegarde', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser, {}, limitQuota);
    await page.locator('#document-name').fill('Version sauvegardée'); await saved(page);
    await page.locator('#subject').fill(bulky); await failed(page);
    const persistent = await page.locator('#error').innerText();
    assert.match(persistent, /saturé/, 'l’alerte d’échec décrit le quota saturé');
    // cancel-fields appelle A.error("") : la persistante doit être restaurée depuis l’état.
    await click(page, '[data-action=cancel-fields]');
    const restored = await page.locator('#error').innerText();
    assert.equal(restored, persistent, 'la persistante survit à cancel-fields');
    assert.equal(await page.locator('#error').count(), 1, 'un seul #error dans le DOM');
    assert(await page.locator('[data-action=rescue-export]').isVisible(), 'le secours reste visible');
  } finally { await browser.close(); }
});

test('cancel-fields n’éteint pas l’alerte persistante de lecture seule', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const first = await open(browser);
    await first.page.locator('#document-name').fill('État partagé'); await saved(first.page);
    const second = await first.context.newPage();
    const {portable, enterEditor} = require('./browser-support.cjs');
    await second.goto(portable); await second.waitForFunction(() => window.MailBuilder?.ready); await enterEditor(second);
    // La première fenêtre reprend un pas d’avance : la seconde passera en lecture seule à sa prochaine écriture.
    await first.page.locator('#document-name').fill('Avance de la première'); await saved(first.page);
    await second.locator('#document-name').fill('Travail de la seconde');
    await second.locator('#error').filter({hasText: 'Une autre fenêtre'}).waitFor();
    const persistent = await second.locator('#error').innerText();
    await second.evaluate(() => MailBuilder.Actions['cancel-fields']());
    const restored = await second.locator('#error').innerText();
    assert.equal(restored, persistent, 'la persistante de lecture seule survit à cancel-fields');
  } finally { await browser.close(); }
});

test('la fin d’une sauvegarde préserve le statut et l’alerte de lecture seule', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await page.locator('#document-name').fill('Avant outdated'); await saved(page);
    // Suspendre la prochaine sauvegarde pour pouvoir déclencher outdated() pendant qu'elle est en cours.
    await page.evaluate(() => {
      if (!window.__real) window.__real = MailBuilder.Storage.save;
      window.__release = null;
      MailBuilder.Storage = {...MailBuilder.Storage, save: (v, t) => window.__release ? window.__real(v, t) : new Promise((res, rej) => { window.__release = () => window.__real(v, t).then(res, rej); })};
    });
    await page.locator('#document-name').fill('Pendant outdated');
    await page.waitForFunction(() => window.__release);
    // Pendant la sauvegarde en cours : outdated() place l'alerte persistante de lecture seule.
    await page.evaluate(() => MailBuilder.State.outdated());
    const persistent = await page.locator('#error').innerText();
    assert.match(persistent, /nouvelle version/, 'outdated pose l’alerte persistante');
    // La fin réelle de l’écriture ne doit pas annoncer « sauvegardée » à la place du verrou.
    await page.evaluate(async () => { await window.__release(); await MailBuilder.State.settle(); });
    assert.match(await page.locator('#save-state').innerText(), /Lecture seule/);
    assert.match(await page.locator('#save-announce').innerText(), /Lecture seule/);
    const stored = await page.evaluate(() => MailBuilder.Storage.load());
    assert.equal(stored.library.documents[0].name, 'Pendant outdated', 'l’écriture retenue a réellement terminé');
    // Après effacement ponctuel, la mémoire de l’alerte doit encore la rétablir.
    await page.evaluate(() => { MailBuilder.error(''); MailBuilder.State.restoreErrorFromState(); });
    const restored = await page.locator('#error').innerText();
    assert.equal(restored, persistent, 'la persistante de lecture seule survit à la fin de la sauvegarde');
  } finally { await browser.close(); }
});

test('une sauvegarde réussie éteint durablement l’alerte persistante', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser, {}, limitQuota);
    await page.locator('#document-name').fill('Avant saturation'); await saved(page);
    await page.locator('#subject').fill(bulky); await failed(page);
    assert.match(await page.locator('#error').innerText(), /saturé/);
    await page.locator('#subject').fill('Objet allégé'); await saved(page);
    // Après le succès, cancel-fields ne doit rien restaurer : plus de persistante.
    await click(page, '[data-action=cancel-fields]');
    assert.equal(await page.locator('#error').innerText(), '', 'aucune alerte persistante restaurée après succès');
    assert(await page.locator('#error').evaluate(e => e.hidden), '#error reste masqué');
  } finally { await browser.close(); }
});
