#!/usr/bin/env node
// Captures du guide de prise en main (docs/PRISE-EN-MAIN.md), prises sur la version web servie en local,
// avec un profil vierge : le parcours est celui d'une première visite. Relancer après une évolution de l'interface :
//   node scripts/captures_prise_en_main.cjs [dossier]   (défaut : docs/prise-en-main)
// Rien n'est envoyé : la copie reste dans le presse-papiers du navigateur de test.
const http = require('node:http'), path = require('node:path'), fs = require('node:fs/promises');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'app/distribution/web');
const out = path.resolve(process.argv[2] || path.join(root, 'docs/prise-en-main'));
const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};

// Contenu fictif du parcours, repris tel quel par le guide.
const NAME = 'Lettre du service · décembre', SUBJECT = 'La lettre du service · décembre 2026';
const TITLE = 'Nos permanences d’accompagnement reprennent en janvier', LINK = 'https://www.service-public.fr/';

async function serve() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname, file = path.join(web, pathname === '/' ? 'index.html' : pathname);
      const body = await fs.readFile(file);
      response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}); response.end(body);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}
const saved = page => page.waitForFunction(() => /enregistrées dans ce navigateur/.test(document.querySelector('#save-state')?.textContent || ''));
// Zone englobant plusieurs éléments, bornée en hauteur, pour une capture lisible à 1280 px.
// Coordonnées de page (et non de fenêtre), attendues par une capture `fullPage` découpée.
const box = locator => locator.first().evaluate(element => { const r = element.getBoundingClientRect(); return {x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height}; });
async function region(page, selectors, maxHeight) {
  const boxes = await Promise.all(selectors.map(s => box(page.locator(s))));
  const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
  const right = Math.max(...boxes.map(b => b.x + b.width)), bottom = Math.max(...boxes.map(b => b.y + b.height));
  return {x, y, width: right - x, height: Math.min(bottom - y, maxHeight)};
}
async function shot(page, name, options) { const file = path.join(out, name); await page.screenshot({path: file, ...options}); return name; }

(async () => {
  await fs.mkdir(out, {recursive: true});
  const server = await serve(), browser = await chromium.launch({channel: 'chromium', args: ['--lang=fr-FR']}), written = [];
  try {
    const context = await browser.newContext({viewport: {width: 1280, height: 800}, colorScheme: 'light', locale: 'fr-FR', permissions: ['clipboard-read', 'clipboard-write']});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => window.MailBuilder?.ready); await page.evaluate(() => document.fonts.ready);

    // 1. Accueil de première visite : les exemples.
    await page.locator('#welcome').waitFor({state: 'visible'});
    written.push(await shot(page, '01-exemples.png', {clip: await region(page, ['.welcome-steps > li:first-child'], 760), fullPage: true}));

    // 2. Créer à partir de l'exemple « Lettre d'information », puis nommer la newsletter.
    await page.getByRole('button', {name: 'Créer à partir de cet exemple « Lettre d’information »'}).click();
    await page.locator('#editor-page').waitFor({state: 'visible'}); await saved(page);
    await page.locator('#document-name').fill(NAME); await page.locator('#subject').fill(SUBJECT); await saved(page);
    written.push(await shot(page, '02-editeur.png', {clip: await region(page, ['.composition-panel', '.preview-panel'], 900), fullPage: true}));

    // 3. Modifier un article : titre et adresse.
    await page.locator('#block-list').getByText('4. Article sans image').click();
    await page.getByLabel('Titre cliquable de l’article - Intitulé du lien (obligatoire)').fill(TITLE);
    await page.getByLabel('Adresse HTTPS de l’article (obligatoire)').fill(LINK); await saved(page);
    await page.frameLocator('#preview').getByText(TITLE).waitFor();
    const fields = await region(page, ['#block-editor'], 2000), stop = await box(page.getByLabel('Auteur de l’article'));
    written.push(await shot(page, '03-modifier-bloc.png', {clip: {...fields, height: stop.y - fields.y + stop.height + 24}, fullPage: true}));

    // 4. Ajouter un composant : rechercher, choisir, ajouter après le bloc sélectionné.
    await page.locator('summary', {hasText: 'Ajouter un composant'}).click();
    await page.locator('#catalogue-search').fill('bouton');
    await page.locator('#catalogue').selectOption({label: 'Bouton primaire'});
    await page.frameLocator('#catalogue-preview').locator('a').first().waitFor();
    // Capture d'élément : découpée dans une page entière, l'iframe d'aperçu du composant sort vide sous Chromium.
    await page.locator('details:has(#catalogue-search)').screenshot({path: path.join(out, '04-ajouter-composant.png')}); written.push('04-ajouter-composant.png');
    await page.locator('summary', {hasText: 'Ajouter un composant'}).click();

    // 5. Relire l'aperçu.
    written.push(await shot(page, '05-apercu.png', {clip: await region(page, ['.preview-panel'], 900), fullPage: true}));

    // 6. Copier : le contrôle signale les contenus d'exemple restés tels quels.
    await page.getByRole('button', {name: 'Copier le courriel'}).click();
    await page.locator('#check-dialog').waitFor({state: 'visible'});
    await page.locator('#check-dialog').screenshot({path: path.join(out, '06-verifier.png')}); written.push('06-verifier.png');
    await page.locator('#check-cancel').click();

    // 7. Garder une copie : « Sauvegarde et import ».
    await page.locator('#files-summary').click();
    written.push(await shot(page, '07-sauvegarde.png', {clip: await region(page, ['details:has(#files-summary)'], 900), fullPage: true}));

    if (errors.length) throw new Error(`Erreurs de page : ${errors.join(' | ')}`);
    console.log(`${written.length} captures dans ${path.relative(root, out) || '.'} : ${written.join(', ')}`);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exit(1); });
