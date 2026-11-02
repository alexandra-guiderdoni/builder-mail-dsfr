const test = require('node:test');
const {open, saved, expand, download, chromium, assert} = require('./browser-support.cjs');

// #199 : l’encart dit où sont les données, quand le dernier export complet a été proposé et si le navigateur s’engage à les
// conserver ; un rappel apparaît après 7 jours de modifications sans export. Métadonnées hors du modèle (clé « meta »).
const DAY = 864e5;
const help = page => page.locator('#storage-help').textContent();
const today = () => new Date().toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'});
const meta = page => page.evaluate(() => MailBuilder.Storage.loadMeta());
async function reopen(page) { await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready); }

test('#199 encart : emplacement, aucun export puis dernier export complet daté et conservé ; une composition seule ne date rien', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    assert.match(await help(page), /dans ce navigateur, sur ce poste/); assert.match(await help(page), /Aucun export proposé/);
    assert.equal(await page.locator('#save-reminder').isVisible(), false);
    await expand(page, 'Fichiers et récupération');
    await download(page, '[data-action=export-document]', 'composition-seule.json');
    assert.match(await help(page), /Aucun export proposé/, 'exporter une composition seule ne date pas la sauvegarde');
    assert.equal((await meta(page)).exportedAt, undefined);
    await download(page, '[data-action=export-library]', 'bibliotheque.json');
    assert.match(await help(page), new RegExp(`Dernier export proposé le ${today()}`));
    await reopen(page);
    assert.match(await help(page), new RegExp(`Dernier export proposé le ${today()}`), 'date conservée après réouverture');
  } finally { await browser.close(); }
});

test('#199 rappel : 7 jours de modifications sans export ; ouvrir une autre newsletter n’est pas une modification', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await page.evaluate(async () => { const A = MailBuilder, docs = ['Une', 'Deux'].map(n => A.Model.create(n)); await A.State.change(lib => { lib.documents = docs; lib.activeId = docs[0].id; }); });
    await saved(page);
    const first = await meta(page); assert.ok(first.dirtySince > Date.now() - 60000, 'première modification datée');
    await page.evaluate(async () => { await MailBuilder.Storage.saveMeta({exportedAt: Date.now(), dirtySince: null}); });
    await reopen(page);
    await page.evaluate(() => MailBuilder.Library.open(MailBuilder.library.documents[1].id)); await saved(page);
    assert.equal((await meta(page)).dirtySince, null, 'ouvrir une newsletter n’est pas une modification');
    await page.evaluate(age => MailBuilder.Storage.saveMeta({exportedAt: Date.now() - age, dirtySince: null}), 8 * DAY); await reopen(page);
    assert.equal(await page.locator('#save-reminder').isVisible(), false, 'aucune modification depuis l’export : pas de rappel');
    await page.evaluate(([age, day]) => MailBuilder.Storage.saveMeta({exportedAt: Date.now() - age, dirtySince: Date.now() - age + day}), [8 * DAY, DAY]); await reopen(page);
    assert.equal(await page.locator('#save-reminder').isVisible(), true);
    assert.match(await page.locator('#save-reminder').textContent(), /7 jours/);
    await download(page, '#save-reminder [data-action=export-library-reminder]', 'rappel.json');
    assert.equal(await page.locator('#save-reminder').isVisible(), false, 'le rappel disparaît après un export complet');
    assert.equal((await meta(page)).dirtySince, null);
  } finally { await browser.close(); }
});

test('#199 tout effacer vide les métadonnées ; restaurer garde la date d’export et remet le compteur à zéro', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const stamp = Date.now() - 2 * DAY;
    await page.evaluate(stamp => MailBuilder.Storage.saveMeta({exportedAt: stamp, dirtySince: Date.now()}), stamp); await reopen(page);
    const lib = await page.evaluate(() => { const l = MailBuilder.Model.initial(); l.documents[0].name = 'Restaurée'; return l; });
    await page.evaluate(lib => MailBuilder.State.replaceLibrary(lib, {reason: 'remplacement', keepPrevious: true}), lib);
    assert.deepEqual(await meta(page), {exportedAt: stamp, dirtySince: null});
    await page.evaluate(() => MailBuilder.State.replaceLibrary(MailBuilder.Model.initial(), {reason: 'effacement', keepPrevious: false}));
    assert.deepEqual(await meta(page), {});
    assert.match(await help(page), /Aucun export proposé/);
  } finally { await browser.close(); }
});

test('#199 conservation durable : accordée, non accordée, indisponible ou en erreur, demandée à la première modification', async () => {
  for (const [mode, expected] of [['accordée', /s’engage à les conserver/], ['non accordée', /peut les effacer s’il manque d’espace/], ['indisponible', /ne permet pas de demander/], ['erreur', /demande de conservation durable a échoué/]]) {
    const browser = await chromium.launch();
    try {
      const {page} = await open(browser, {}, async page => page.addInitScript(mode => {
        window.__persistCalls = 0;
        if (mode === 'indisponible') { Object.defineProperty(navigator, 'storage', {configurable: true, value: undefined}); return; }
        const storage = navigator.storage;
        storage.persisted = async () => false;
        storage.persist = async () => { window.__persistCalls++; if (mode === 'erreur') throw new Error('refus de recette'); return mode === 'accordée'; };
      }, mode));
      assert.equal(await page.evaluate(() => window.__persistCalls), 0, `${mode} : aucune demande à l’ouverture`);
      await page.locator('#document-name').fill(`Modifiée ${mode}`); await saved(page);
      await page.waitForFunction(() => /conserver|effacer|demander|échoué/.test(document.getElementById('storage-help').textContent));
      assert.match(await help(page), expected, mode);
      assert.doesNotMatch(await help(page), /refusée/);
      if (mode !== 'indisponible') assert.equal(await page.evaluate(() => window.__persistCalls), 1, `${mode} : une seule demande`);
    } finally { await browser.close(); }
  }
});
