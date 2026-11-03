const test = require('node:test');
const {open, saved, chromium, assert} = require('./browser-support.cjs');

// #205 : à la première visite, l'accueil guide en trois étapes (créer, garder une copie, installer) et ne présente pas la
// newsletter de départ comme un travail à reprendre. Elle est écartée à la première création ; l'accueil habituel revient
// dès qu'une newsletter est enregistrée, et l'accueil guidé après « Tout effacer ».
const view = page => page.evaluate(() => {
  const shown = id => { const e = document.getElementById(id); return !!e && !e.closest('[hidden]') && e.getClientRects().length > 0; };
  return {welcome: shown('welcome'), list: shown('newsletter-list'), resume: shown('resume-document'), count: shown('library-count'), help: shown('storage-help'), reset: shown('reset-zone'),
    install: shown('welcome-install-step'), examplesInWelcome: !!document.getElementById('examples').closest('#welcome'),
    createInWelcome: !!document.getElementById('home-create').closest('#welcome'), save: document.getElementById('save-state').textContent,
    examplesLevel: document.getElementById('examples-title').getAttribute('aria-level'), names: MailBuilder.library.documents.map(d => d.name)};
});
const home = async page => { await page.locator('[data-action=library-home]').click(); await page.locator('#library-home').waitFor(); };

test('#205 première visite : accueil guidé, sans newsletter de départ à reprendre', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await home(page); const first = await view(page);
    assert.equal(first.welcome, true, 'accueil guidé affiché');
    assert.deepEqual([first.list, first.resume, first.count, first.help, first.reset], [false, false, false, false, false], 'rien à reprendre, à décompter ni à effacer');
    assert.equal(first.save, 'Rien n’est encore enregistré dans ce navigateur.');
    assert.equal(first.examplesInWelcome && first.createInWelcome, true, 'exemples et plan vide dans l’étape « Créer »');
    assert.equal(first.examplesLevel, '4', 'le titre « Exemples » descend sous le titre d’étape');
    assert.equal(first.install, false, 'portable : pas d’étape d’installation');
    assert.deepEqual(await page.locator('.welcome-steps > li > h3:visible').allTextContents(), ['Créer votre première newsletter', 'Garder une copie de vos newsletters']);
  } finally { await browser.close(); }
});

test('#205 première création depuis un exemple : la newsletter de départ est écartée, l’accueil habituel revient', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await home(page);
    await page.locator('[data-example=information] [data-example-action=create]').click();
    await page.locator('#editor-page').waitFor({state: 'visible'}); await saved(page);
    await home(page);
    const after = await view(page);
    assert.deepEqual(after.names, ['Information de service'], 'seule la copie de l’exemple est enregistrée');
    assert.deepEqual([after.welcome, after.list, after.resume, after.count, after.help, after.reset], [false, true, true, true, true, true]);
    assert.equal(after.examplesInWelcome || after.createInWelcome, false, 'les zones regagnent leur place');
    assert.equal(after.examplesLevel, null);
    // Ordre d'origine : création, liste, exemples, remise à zéro.
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#home-create, #newsletter-list, #examples, #reset-zone')].map(e => e.id)), ['home-create', 'newsletter-list', 'examples', 'reset-zone']);
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    const reopened = await view(page);
    assert.equal(reopened.welcome, false, 'à la réouverture, l’utilisateur arrive sur ses newsletters');
    assert.equal(reopened.save, 'Newsletters retrouvées dans ce navigateur.');
  } finally { await browser.close(); }
});

test('#205 première création depuis un plan vide, puis retour à l’accueil guidé après « Tout effacer »', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await home(page);
    await page.locator('#starter').selectOption('lettre'); await page.locator('[data-action=new-document]').click();
    await page.locator('#editor-page').waitFor({state: 'visible'}); await saved(page);
    assert.deepEqual((await view(page)).names, ['Lettre d’information']);
    await home(page);
    await page.locator('[data-action=reset-library]').click(); await page.locator('#reset-confirm').click();
    await page.locator('#reset-dialog').waitFor({state: 'hidden'});
    const cleared = await view(page);
    assert.equal(cleared.welcome, true, 'après « Tout effacer », état de première visite');
    assert.equal(cleared.examplesInWelcome, true);
    assert.equal(cleared.save, 'Rien n’est encore enregistré dans ce navigateur.');
  } finally { await browser.close(); }
});

test('#205 étape « Garder une copie » : restaurer une sauvegarde ouvre le champ de restauration', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await home(page);
    await page.locator('[data-action=welcome-restore]').click();
    assert.equal(await page.locator('#restore-input').evaluate(e => e === document.activeElement && e.closest('details').open), true);
    assert.equal((await view(page)).welcome, true, 'ouvrir la restauration ne quitte pas la première visite');
  } finally { await browser.close(); }
});

// Revue Codex et ShipGuard (#205) : la newsletter de départ n'est écartée que par son identifiant, et seule une bibliothèque
// encore jamais enregistrée reste en première visite. Rien n'est écrit ni exporté tant qu'il n'y a rien à garder.
const stored = page => page.evaluate(async () => ((await MailBuilder.Storage.load())?.library.documents || []).map(d => d.name));
test('#205 reprise de main après une restauration dans une autre fenêtre : aucune newsletter réelle n’est écartée', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page: a, context} = await open(browser); await home(a);
    const b = await context.newPage(); await b.goto(a.url()); await b.waitForFunction(() => window.MailBuilder?.ready);
    const content = await b.evaluate(() => { const A = MailBuilder, lib = A.Model.initial(); lib.documents = [A.Model.create('Newsletter réelle à conserver')]; lib.activeId = lib.documents[0].id; return JSON.stringify(A.Model.library(lib)); });
    await b.locator('summary').filter({hasText: 'Sauvegarde et import'}).click();
    await b.locator('#restore-input').setInputFiles({name: 'sauvegarde.json', mimeType: 'application/json', buffer: Buffer.from(content)});
    await b.locator('#restore-confirm').click(); await b.locator('#restore-dialog').waitFor({state: 'hidden'});
    await a.locator('#read-only').waitFor({state: 'visible'});
    await a.locator('[data-action=take-over]').click(); await a.locator('#read-only').waitFor({state: 'hidden'});
    const taken = await view(a);
    assert.equal(taken.welcome, false, 'la bibliothèque reprise n’est plus une première visite');
    assert.deepEqual(taken.names, ['Newsletter réelle à conserver']);
    await a.locator('[data-example=lettre] [data-example-action=create]').click();
    await a.locator('#editor-page').waitFor({state: 'visible'}); await saved(a);
    assert.deepEqual(await stored(a), ['Newsletter réelle à conserver', 'Lettre d’information']);
  } finally { await browser.close(); }
});

test('#205 « Enregistrer maintenant » en première visite n’écrit rien : la première visite survit au rechargement', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await home(page);
    await page.locator('summary').filter({hasText: 'Sauvegarde et import'}).click();
    await page.locator('[data-action=save-now]').click();
    await page.locator('#save-state').filter({hasText: 'Rien n’est encore enregistré'}).waitFor();
    assert.deepEqual(await stored(page), []);
    await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready);
    assert.equal((await view(page)).welcome, true);
  } finally { await browser.close(); }
});

test('#205 exports en première visite : rien n’est proposé au téléchargement, un message l’explique', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await home(page);
    await page.locator('summary').filter({hasText: 'Sauvegarde et import'}).click();
    for (const action of ['export-library', 'export-document']) {
      const download = page.waitForEvent('download', {timeout: 1500}).then(() => true, () => false);
      await page.locator(`[data-action=${action}]`).click();
      assert.equal(await download, false, `${action} : aucun téléchargement`);
      assert.match(await page.locator('#notice').textContent(), /Rien à exporter/);
    }
  } finally { await browser.close(); }
});

test('#205 titres des cartes d’exemple : un niveau sous « Exemples » pendant la première visite seulement', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser); await home(page);
    const levels = () => page.locator('#examples-list h4').evaluateAll(list => list.map(h => h.getAttribute('aria-level')));
    assert.deepEqual(await levels(), ['5', '5', '5', '5']);
    await page.locator('[data-example=information] [data-example-action=create]').click();
    await page.locator('#editor-page').waitFor({state: 'visible'}); await saved(page); await home(page);
    assert.deepEqual(await levels(), [null, null, null, null]);
  } finally { await browser.close(); }
});
