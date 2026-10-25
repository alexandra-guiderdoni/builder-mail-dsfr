const test = require('node:test');
const {attachDestinations, markDestination, destinationError, flushDestinations} = require('./destinations-probe.cjs');
test.after(() => flushDestinations());
const {open, expand, saved, click, confirmChecks, chromium, assert} = require('./browser-support.cjs');
const {webkit} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {attachExportDiagnostics, recordExportPhase, exportDiagnosticError} = require('./export-diagnostics.cjs');

// 25 octobre 2026, 00 h 30 à Paris : le 24 en UTC. La date d'export est la date locale.
const FIXED = new Date('2026-10-24T22:30:00Z');
const DATE = '2026-10-25';

const cases = [
  {label: 'accents et esperluette', name: 'Édition & <dossier> "suivi"', base: 'Édition-&-dossier-suivi'},
  {label: 'barres, deux-points, point d’interrogation', name: 'Bulletin n°3 : été / automne ?', base: 'Bulletin-n°3-été-automne'},
  {label: 'barre inverse, étoile, barre verticale', name: 'a\\b*c|d', base: 'a-b-c-d'},
  {label: 'points et tirets en bordure', name: '  ..Rentrée--', base: 'Rentrée'},
  {label: 'nom entièrement interdit', name: '***', base: 'composition'},
  {label: 'forme décomposée normalisée', name: 'Eté', base: 'Eté'}
];
const longNames = ['a'.repeat(300), 'é'.repeat(300), '😀'.repeat(300)];
const selectors = ['[data-action=export-mail]', '[data-action=export-document]', '[data-action=export-library]'];

/* Nom proposé au téléchargement ; `label` nomme le cas dans l’échec, avec le sélecteur et l’état de la page. */
async function suggested(page, selector, label) {
  let phase = 'before-click';
  const mark = value => { phase = value; recordExportPhase(page, value, selector); markDestination(page, value, {selector, label}); };
  const event = page.waitForEvent('download');
  // Observer le rejet immédiatement si l’activation échoue ; l’attente d’origine reste rejetée et sera relue ci-dessous.
  event.then(() => recordExportPhase(page, 'download-received', selector), () => {});
  try {
    mark('before-click'); await click(page, selector); mark('after-click');
    mark('before-confirm'); await confirmChecks(page, event); mark('after-confirm'); // fenêtre de contrôle de #36, ou téléchargement direct
    mark('await-download'); const result = await event;
    return result.suggestedFilename();
  } catch (error) {
    destinationError(page, error, 'suggested');
    throw await exportDiagnosticError(page, error, {label, selector, lastPhase: phase});
  }
}

// WebKit sous macOS restitue le nom décomposé (NFD) : on compare en NFC, et on vérifie
// séparément que le nom transmis à la page est déjà en NFC.
async function exportNames(browser, name) {
  // Contexte neuf par nom : Chromium limite les téléchargements automatiques répétés d'une même page.
  const {page, context} = await open(browser, {timezoneId: 'Europe/Paris'}, async p => { await attachExportDiagnostics(p); await attachDestinations(p); await p.clock.setFixedTime(FIXED); });
  try {
    await expand(page, 'Fichiers et récupération');
    await page.locator('#document-name').fill(name); await saved(page);
    const downloads = [];
    for (const selector of selectors) downloads.push((await suggested(page, selector, `nom « ${name} »`)).normalize('NFC'));
    return {mail: downloads[0], composition: downloads[1], library: downloads[2], direct: () => page.evaluate(n => MailBuilder.Files.exportName(n, 'html'), name)};
  } catch (error) { destinationError(page, error, 'exportNames'); await context.close(); throw error; }
}

for (const [engine, launcher] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`noms des fichiers exportés, trois types d’export (${engine})`, async () => {
    const browser = await launcher.launch();
    try {
      for (const {label, name, base} of cases) {
        const got = await exportNames(browser, name);
        assert.equal(got.mail, `${base}-${DATE}.html`, `courriel : ${label}`);
        assert.equal(got.composition, `${base}-${DATE}.courriel.json`, `composition : ${label}`);
        assert.equal(got.library, `bibliotheque-courriels-${DATE}.json`, `bibliothèque : ${label}`);
        assert.equal(await got.direct(), `${base}-${DATE}.html`, `nom transmis à la page en NFC : ${label}`);
      }
      for (const name of longNames) {
        const got = await exportNames(browser, name);
        for (const filename of [got.mail, got.composition]) {
          assert(Buffer.byteLength(filename) <= 150, `longueur en octets bornée : ${Buffer.byteLength(filename)}`);
          assert(filename.includes(`-${DATE}.`) && !/[\\/:*?"<>|\u0000-\u001f]/.test(filename));
          assert(!filename.includes('�'), 'aucun caractère coupé en deux');
        }
        assert.equal(got.library, `bibliotheque-courriels-${DATE}.json`);
      }
    } finally { await browser.close(); }
  });
}

for (const [engine, launcher] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`export d’une composition depuis l’accueil de la bibliothèque (${engine})`, async () => {
    const browser = await launcher.launch();
    try {
      const {page, context} = await open(browser, {timezoneId: 'Europe/Paris'}, async p => { await attachExportDiagnostics(p); await attachDestinations(p); await p.clock.setFixedTime(FIXED); });
      await page.locator('#document-name').fill('Bulletin n°3 : été / automne ?'); await saved(page);
      await page.evaluate(() => MailBuilder.Library.home());
      const id = await page.evaluate(() => MailBuilder.library.activeId);
      const filename = await suggested(page, `[data-document="${id}"] [data-library-action=export]`, 'export depuis l’accueil');
      assert.equal(filename.normalize('NFC'), `Bulletin-n°3-été-automne-${DATE}.courriel.json`);
      await context.close();
    } finally { await browser.close(); }
  });
}
