/* Recette native ponctuelle ; aucun profil personnel ni accès à une messagerie. */
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {Firefox} from '../tests/firefox-support.mjs';
const require = createRequire(import.meta.url), root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'evidence/application', `firefox-${Date.now()}`), downloads = path.join(directory, 'downloads');
await fs.mkdir(downloads, {recursive: true});
const firefox = new Firefox(directory), report = {scope: 'Firefox natif sur le Mac de développement', checks: [], errors: []}; let server;
const portable = 'file://' + path.join(root, 'app/distribution/portable.html');
async function downloaded(filename) {
  const destination = path.join(downloads, filename);
  for (let i = 0; i < 100; i++) { try { const text = await fs.readFile(destination, 'utf8'); if (text) return {path: destination, text}; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error(`Téléchargement absent : ${filename}`);
}
async function confirmOutput(action, notice) {
  await firefox.click(`[data-action=${action}]`);
  await firefox.wait(`document.querySelector('#check-dialog').open || document.querySelector('#notice').textContent.startsWith(${JSON.stringify(notice)}) || !document.querySelector('#error').hidden`);
  const error = await firefox.evaluate(`document.querySelector('#error').hidden ? '' : document.querySelector('#error').textContent`);
  assert.equal(error, '');
  if (await firefox.evaluate(`document.querySelector('#check-dialog').open`)) await firefox.click('#check-confirm');
  await firefox.wait(`document.querySelector('#notice').textContent.startsWith(${JSON.stringify(notice)})`);
}
const exportName = (base, extension) => firefox.evaluate(`MailBuilder.Files.exportName(${base}, ${JSON.stringify(extension)})`);
const cleanupReceipt = async () => {
  let receipt;
  try { receipt = await firefox.stop(); } catch (cause) { receipt = {status: 'error', cleanup_error: {message: cause.message}}; }
  if (!receipt || typeof receipt !== 'object' || !Object.hasOwn(receipt, 'cleanup_error') || receipt.cleanup_error === undefined) receipt = {status: 'unknown', cleanup_error: 'Fermeture sans reçu vérifiable.'};
  report.cleanup_receipts ||= [];
  if (report.cleanup_receipts.at(-1) !== receipt) report.cleanup_receipts.push(receipt);
  if (receipt.cleanup_error !== null || receipt.exit_observed !== true || !(receipt.status === 'closed' || (receipt.status === 'not-started' && firefox.allocation === null && receipt.child_pid === null))) {
    report.cleanup_error = receipt.cleanup_error || 'Fin du processus de recette non explicitement observée.';
    process.exitCode = 1;
  }
  return receipt;
};
const stopped = async () => { const receipt = await cleanupReceipt(); if (receipt?.status !== 'closed') report.cleanup_error ||= 'Aucun processus fermé avant relance.'; if (report.cleanup_error) throw new Error('Fermeture Firefox non prouvée ; relance refusée.'); };

const saved = () => firefox.wait(`document.querySelector('#save-state').textContent==='Bibliothèque sauvegardée dans ce navigateur.'`);
try {
  await firefox.start(); report.browser = firefox.version;
  await firefox.call('browser.setDownloadBehavior', {downloadBehavior: {type: 'allowed', destinationFolder: downloads}});
  await firefox.navigate(portable); assert.equal(await firefox.evaluate(`document.querySelectorAll('#catalogue option').length`), 52);
  assert(await firefox.evaluate(`!document.querySelector('#library-home').hidden`)); await firefox.click('[data-action=resume-document]');
  await firefox.field('#document-name', 'Composition Firefox'); await firefox.field('#block-editor textarea', 'Service de recette Firefox');
  await firefox.details('Mes modèles'); await firefox.field('#template-name', 'Modèle Firefox'); await firefox.click('[data-action=save-template]');
  await firefox.details('Identités de service'); await firefox.field('#identity-name', 'Identité Firefox'); await firefox.click('[data-action=save-identity]');
  await firefox.click('[data-action=library-home]'); await firefox.click('[data-action=new-document]'); await saved();
  const packetText = process.env.SNUM_RECIPE_PACKET ? await fs.readFile(process.env.SNUM_RECIPE_PACKET, 'utf8') : JSON.stringify(require('../tests/fixtures/snum.cjs')());
  const packet = JSON.parse(packetText);
  await firefox.navigate('file://' + path.join(root, 'app/distribution/snum.html'));
  await firefox.field('#snum-input', packetText); await firefox.click('#convert'); await firefox.click('#export-json');
  const converted = await downloaded('snum.composition.courriel.json');
  await firefox.navigate(portable); await firefox.details('Fichiers et récupération'); await firefox.files('#project-input', converted.path);
  await firefox.wait(`document.querySelector('#notice').textContent.startsWith('Import ajouté à la bibliothèque')`); await saved();
  const article = await firefox.evaluate(`MailBuilder.doc().blocks.find(b=>b.values.f3===${JSON.stringify(packet.articles[0].url)}).id`);
  await firefox.click(`[data-select="${article}"]`); await firefox.click('[data-block-action=duplicate]');
  await firefox.details('Ajouter un composant'); await firefox.evaluate(`(()=>{document.querySelector('#catalogue').value='mail-29';return true})()`); await firefox.click('[data-action=add-block]');
  await firefox.files('[data-image-field]', path.join(root, 'app/assets/icon-192.png')); await firefox.wait(`document.querySelector('#notice').textContent.includes('Image locale incorporée')`); await saved();
  report.checks.push('52 composants disponibles ; compositions, modèle, identité, conversion SNUM séparée puis import JSON générique, duplication et image locale par l’interface');
  await firefox.details('Fichiers et récupération'); await firefox.click('[data-action=export-document]'); const project = await downloaded(await exportName('MailBuilder.doc().name', 'courriel.json'));
  await confirmOutput('export-mail', 'Courriel proposé au téléchargement.'); const mail = await downloaded(await exportName('MailBuilder.doc().name', 'html'));
  // #96 : l’image est recompressée à l’import ; les sorties doivent conserver l’image enregistrée, pas les octets source.
  const image = await firefox.evaluate(`MailBuilder.doc().blocks.find(b=>b.component==='mail-29').values.f0`);
  assert.match(image, /^data:image\/png;base64,/);
  const dimensions = await firefox.evaluate(`(async()=>{const image=new Image();image.src=${JSON.stringify(image)};await image.decode();return [image.naturalWidth,image.naturalHeight]})()`);
  assert.deepEqual(dimensions, [192, 192]);
  assert(mail.text.includes(image)); assert.equal(JSON.parse(project.text).blocks.find(b=>b.component==='mail-29').values.f0, image); assert.equal(mail.text.split(packet.articles[0].url.replaceAll('&', '&amp;')).length - 1, 2);
  await confirmOutput('copy', 'Courriel copié en HTML et texte.');
  report.checks.push('téléchargements réels avec image et liens source dupliqués ; écriture du presse-papiers par activation clavier native');
  const badPath = path.join(directory, 'invalid.json'); const bad = JSON.parse(project.text); bad.version = 99; await fs.writeFile(badPath, JSON.stringify(bad));
  const count = await firefox.evaluate('MailBuilder.library.documents.length'); await firefox.files('#project-input', badPath); await firefox.wait(`document.querySelector('#error').textContent.includes('Version de composition')`); assert.equal(await firefox.evaluate('MailBuilder.library.documents.length'), count);
  await firefox.click('[data-action=export-library]'); const library = await downloaded(await exportName(JSON.stringify('bibliotheque-courriels'), 'json'));
  const snapshot = JSON.parse(library.text); assert.equal(snapshot.templates.length, 1); assert.equal(snapshot.identities.length, 1);
  report.checks.push('import invalide refusé ; fichier de bibliothèque contenant compositions, modèle et identité');
  await firefox.capture('fichier-portable.png'); await stopped(); await firefox.start(); await firefox.navigate(portable);
  assert.equal(await firefox.evaluate('MailBuilder.library.documents.length'), count); assert.equal(await firefox.evaluate('MailBuilder.library.templates.length'), 1);
  report.checks.push('redémarrage complet de Firefox : bibliothèque portable restaurée');
  const base = path.join(root, 'app/distribution/web');
  server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname, file = path.resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(base + path.sep)) { response.writeHead(403); response.end(); return; }
      const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
      const body = await fs.readFile(file);
      response.writeHead(200, {'Content-Type': types[path.extname(file)]}); response.end(body);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const url = `http://127.0.0.1:${server.address().port}/`;
  await firefox.navigate(url); await firefox.wait('!!navigator.serviceWorker.controller');
  await firefox.details('Fichiers et récupération'); await firefox.files('#project-input', library.path); await saved();
  assert.equal(await firefox.evaluate('MailBuilder.library.documents.length'), count + 1);
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  await assert.rejects(fetch(url)); await firefox.navigate(url); assert.equal(await firefox.evaluate('MailBuilder.library.documents.length'), count + 1);
  await stopped(); await firefox.start(); await firefox.navigate(url); assert.equal(await firefox.evaluate('MailBuilder.library.documents.length'), count + 1);
  await firefox.capture('web-hors-ligne-apres-redemarrage.png');
  report.checks.push('bibliothèque transportée vers la variante web ; rechargement serveur arrêté puis redémarrage complet hors connexion');
  report.errors = firefox.errors; assert.deepEqual(report.errors, []); report.verdict = 'PARCOURS_FIREFOX_OBSERVE';
  report.notVerified = ['Windows', 'Outlook', 'Mélissa', 'Installation native', 'Origine HTTPS réelle'];
} catch (cause) { report.verdict = 'ECHEC'; report.failure = cause.stack; process.exitCode = 1; }
finally {
  if (server?.listening) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  await cleanupReceipt(); if (report.cleanup_error) report.verdict = 'ECHEC_NETTOYAGE'; await fs.writeFile(path.join(directory, 'receipt.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(root, 'evidence/application/firefox-last.json'), JSON.stringify({receipt: path.relative(root, path.join(directory, 'receipt.json')), ...report}, null, 2));
  console.log(JSON.stringify({verdict: report.verdict, checks: report.checks, failure: report.failure, receipt: path.relative(root, path.join(directory, 'receipt.json'))}));
}
