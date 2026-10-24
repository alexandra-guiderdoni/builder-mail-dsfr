const test = require('node:test');
const {open, chromium, store, assert} = require('./browser-support.cjs');

const SUCCESS = 'Bibliothèque sauvegardée dans ce navigateur.';
// Horloge contrôlée : aucune attente de durée réelle, y compris pour observer l’absence d’annonce.
const until = async (page, read, expected) => {
  for (let i = 0; i < 400; i++) { if (JSON.stringify(await page.evaluate(read)) === JSON.stringify(expected)) return; await new Promise(r => setTimeout(r, 25)); }
  assert.deepEqual(await page.evaluate(read), expected);
};
async function start(browser) {
  const session = await open(browser, {}, page => page.clock.install());
  const {page} = session;
  await page.clock.pauseAt(new Date(Date.now() + 60000));
  await page.evaluate(() => {
    window.announcements = [];
    const region = document.querySelector('#save-announce');
    new MutationObserver(() => { window.announcements.push(region.textContent); }).observe(region, {childList: true, characterData: true, subtree: true});
  });
  return session;
}
const announced = page => page.evaluate(() => window.announcements.slice());
const savedText = page => page.evaluate(() => document.querySelector('#save-state').textContent);
const library = page => store(page).then(record => JSON.stringify(record.library));
async function type(page, selector, text) {
  await page.locator(selector).focus();
  for (const char of text) { await page.keyboard.type(char); await page.clock.runFor(80); }
}
async function selectArticle(page) {
  await page.evaluate(() => { const b = MailBuilder.doc().blocks.find(x => x.type === 'article' || x.family === 'Article') || MailBuilder.doc().blocks[0]; MailBuilder.selected = b.id; MailBuilder.UI.refresh(); });
}

test('la région d’état est distincte du texte visible et ne reçoit pas la progression', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    assert.equal(await page.locator('#save-announce[role=status]').count(), 1);
    assert.equal(await page.locator('#save-state[role=status]').count(), 0);
  } finally { await browser.close(); }
});

test('saisie continue valide : aucune annonce pendant la saisie, un seul succès après 1 000 ms', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await start(browser);
    await type(page, '#subject', 'Objet de 18 signes');
    await until(page, () => document.querySelector('#save-state').textContent, SUCCESS);
    assert.match(await library(page), /Objet de 18 signes/, 'l’écriture n’attend pas la temporisation');
    assert.deepEqual(await announced(page), []);
    await page.clock.runFor(900); assert.deepEqual(await announced(page), []);
    await page.clock.runFor(100); assert.deepEqual(await announced(page), [SUCCESS]);
    await page.clock.runFor(10000); assert.deepEqual(await announced(page), [SUCCESS]);
  } finally { await browser.close(); }
});

// Contrat de #37 : une URL rendue invalide reste un brouillon hors du modèle, sans erreur à la frappe ; l’erreur
// apparaît sur le champ à son départ. Obligation de #65 conservée : aucune annonce de progression, aucun succès
// tant que le lien reste invalide, un seul succès par sauvegarde réussie.
test('URL progressivement invalide : aucune erreur à la frappe, erreur de champ au départ, un succès par sauvegarde réussie', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await start(browser);
    await selectArticle(page);
    assert.equal(await page.locator('#article-source').count(), 1);
    await type(page, '#article-source', 'https://exemple.org/a');
    await until(page, () => document.querySelector('#save-state').textContent, SUCCESS);
    assert.deepEqual(await announced(page), [], 'aucune annonce de progression pendant la saisie');
    await page.clock.runFor(1000); assert.deepEqual(await announced(page), [SUCCESS], 'un seul succès pour la saisie valide');
    await page.keyboard.type(' ');
    assert.equal(await page.locator('[data-field-error]').count(), 0, 'aucune erreur pendant la frappe');
    assert.equal(await page.locator('#error').isVisible(), false);
    await page.clock.runFor(5000);
    assert.deepEqual(await announced(page), [SUCCESS], 'un brouillon n’annonce ni erreur ni succès');
    await page.keyboard.press('Tab');
    assert.match(await page.locator('#error-article-source').textContent(), /Caractères interdits/, 'l’erreur du brouillon apparaît au départ du champ');
    assert.equal(await page.locator('#article-source').getAttribute('aria-invalid'), 'true');
    await page.clock.runFor(5000);
    assert.deepEqual(await announced(page), [SUCCESS], 'aucun succès n’est annoncé tant que le lien reste invalide');
    await page.locator('#article-source').focus(); await page.keyboard.press('End'); await page.keyboard.press('Backspace');
    await until(page, () => document.querySelector('#article-source').getAttribute('aria-invalid'), null);
    await until(page, () => document.querySelector('#save-state').textContent, SUCCESS);
    await page.clock.runFor(999); assert.deepEqual(await announced(page), [SUCCESS]);
    await page.clock.runFor(1); assert.deepEqual(await announced(page), [SUCCESS, SUCCESS], 'un succès final après la correction');
  } finally { await browser.close(); }
});

test('un changement de composition invalide l’annonce en attente', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await start(browser);
    await type(page, '#subject', 'Avant');
    await until(page, () => document.querySelector('#save-state').textContent, SUCCESS);
    await page.clock.runFor(600);
    await page.evaluate(() => MailBuilder.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).name = 'Autre composition'; }));
    await page.clock.runFor(600); assert.deepEqual(await announced(page), [], 'l’échéance de la première sauvegarde ne déclenche rien');
    await page.clock.runFor(400); assert.deepEqual(await announced(page), [SUCCESS]);
  } finally { await browser.close(); }
});

test('une erreur d’écriture est annoncée immédiatement, sans attendre la temporisation', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await start(browser);
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(...args) { if (this.name === 'library') throw new DOMException('Quota de recette', 'QuotaExceededError'); return put.apply(this, args); };
    });
    await type(page, '#subject', 'Panne');
    await until(page, () => window.announcements.length > 0, true);
    assert.match((await announced(page)).at(-1), /^Modifications non sauvegardées/);
    await page.clock.runFor(5000);
    assert.ok((await announced(page)).every(text => !text.startsWith('Bibliothèque sauvegardée')));
  } finally { await browser.close(); }
});

test('fermeture pendant l’écriture : protection active, écriture non différée, annonce seulement après la fin', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await start(browser);
    // Une transaction concurrente garde le magasin occupé : l’écriture de l’application reste réellement en attente.
    await page.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('builder-mail-dsfr-library', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const tx = request.result.transaction('library', 'readwrite'), store = tx.objectStore('library'); window.held = true;
        const spin = () => { if (window.held) store.get('occupe').onsuccess = spin; };
        spin(); resolve();
      };
    }));
    await page.locator('#subject').focus(); await page.keyboard.type('X');
    await until(page, () => document.querySelector('#save-state').textContent, 'Sauvegarde en cours…');
    const prevented = await page.evaluate(() => { const e = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(e); return e.defaultPrevented; });
    assert.equal(prevented, true, 'la fermeture est retenue tant que l’écriture est en cours');
    await page.clock.runFor(5000); assert.deepEqual(await announced(page), [], 'aucun succès avant la fin réelle de l’écriture');
    await page.evaluate(() => { window.held = false; });
    await until(page, () => document.querySelector('#save-state').textContent, SUCCESS);
    assert.match(await library(page), /"subject":"[^"]*X/);
    await until(page, () => { const e = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(e); return e.defaultPrevented; }, false);
    assert.deepEqual(await announced(page), []);
    await page.clock.runFor(1000); assert.deepEqual(await announced(page), [SUCCESS]);
  } finally { await browser.close(); }
});
