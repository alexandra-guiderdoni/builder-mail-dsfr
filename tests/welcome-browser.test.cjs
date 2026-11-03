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
