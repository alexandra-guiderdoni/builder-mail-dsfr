/* #180 : comparer un téléchargement par action utilisateur à une collecte antérieure, pas à un nouvel appel d'exportHtml. */
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function compareDownload(expected, downloaded, intermediate) {
  if (![expected, downloaded, intermediate].every(Buffer.isBuffer)) throw new TypeError('Trois artefacts binaires sont requis.');
  return {expected: {bytes: expected.length, sha256: hash(expected), kind: 'collected-export-html'},
    downloaded: {bytes: downloaded.length, sha256: hash(downloaded), kind: 'user-action-download'},
    intermediate: {bytes: intermediate.length, sha256: hash(intermediate), kind: 'render-html-intermediate'},
    identical: expected.equals(downloaded), transformationWitness: !expected.equals(intermediate)};
}
async function verifyBaseline(root, baseline, io = fs) {
  const receipt = JSON.parse(await io.readFile(path.join(baseline, 'browser.json'), 'utf8'));
  if (receipt.completed !== true || receipt.collection_status !== 'completed' || !receipt.run_id ||
      !receipt.git_parent || !receipt.measuredFilesSha256 || !Object.keys(receipt.measuredFilesSha256).length ||
      ['errors','collection_errors','proof_errors','cleanup_errors'].some(key => !Array.isArray(receipt[key]) || receipt[key].length)) throw new Error('Collecte export de référence absente, incomplète ou en erreur.');
  for (const [file, digest] of Object.entries(receipt.measuredFilesSha256)) {
    const absolute = path.resolve(root, file);
    if (!absolute.startsWith(path.resolve(root) + path.sep)) throw new Error('Source hors du candidat.');
    if (hash(await io.readFile(absolute)) !== digest) throw new Error('Référence de source différente : ' + file);
  }
  const indexBytes = await io.readFile(path.join(baseline, 'exports/index.json'));
  const items = JSON.parse(indexBytes);
  if (!Array.isArray(items) || !items.length || new Set(items.map(item => item.id)).size !== items.length) throw new Error('Index export vide ou ambigu.');
  for (const item of items) {
    if (!/^\d{2}$/.test(item.id) || item.artifactKind !== 'download-html' || item.renderer !== 'Render.exportHtml' || !Array.isArray(item.blocks)) throw new Error('Artefact de référence non qualifié.');
    const bytes = await io.readFile(path.join(baseline, 'exports', item.id + '.html'));
    if (hash(bytes) !== item.sha256) throw new Error('Empreinte de référence incorrecte : ' + item.id);
  }
  if (!items.some(item => item.surface === 'snum') || !items.some(item => item.surface !== 'snum')) throw new Error('Builder et SNUM sont requis.');
  return {receipt, items, indexSha256: hash(indexBytes)};
}
async function userDownload(page, selector, destination, mayConfirm = false) {
  // Installer l'attente avant Entrée ; ne remplacer ni Files.download, ni Blob, ni le gestionnaire de clic.
  const pending = page.waitForEvent('download', {timeout: 20000});
  // Attacher immédiatement un rejet pour éviter toute promesse rejetée non consommée si l'action échoue.
  pending.catch(() => {});
  await page.locator(selector).focus();
  await page.keyboard.press('Enter');
  if (mayConfirm) {
    await page.waitForFunction(() => document.getElementById('check-dialog').open || document.getElementById('notice').textContent.includes('Courriel proposé au téléchargement'));
    if (await page.locator('#check-dialog').evaluate(element => element.open)) {
      await page.locator('#check-confirm').focus(); await page.keyboard.press('Enter');
    }
  }
  const download = await pending;
  await download.saveAs(destination);
  const failure = await download.failure(); if (failure) throw new Error('Téléchargement refusé : ' + failure);
  return {suggestedFilename: download.suggestedFilename(), url: download.url(), action: 'focus-and-Enter', selector};
}
async function run(root, baseline, output) {
  // Dépendances natives chargées uniquement dans la voie explicitement --execute.
  const {chromium} = require('playwright');
  const {newCollection, beginCollection, finishCollection, collectionFailure} = require('./collector_receipt.cjs');
  const report = newCollection(root, {cases: [], errors: [], humanQualification: false, clipboardExecuted: false,
    status: 'NOT_EXECUTED', scope: 'Builder portable et SNUM ; exports HTML téléchargés, pas rendu reçu dans une messagerie.'});
  // Refus avant toute écriture dans une destination préexistante.
  await fs.mkdir(output);
  let browser, sources = {};
  try {
    await beginCollection(output, 'receipt.json', report);
    const reference = await verifyBaseline(root, baseline);
    if (reference.receipt.git_parent !== report.git_parent) throw new Error('SHA Git différent de la référence.');
    sources = {...reference.receipt.measuredFilesSha256};
    for (const file of ['scripts/recipe_export_downloads.cjs','scripts/collector_receipt.cjs','tests/fixtures/snum.cjs','app/distribution/qualification.courriels.json']) sources[file] = hash(await fs.readFile(path.join(root, file)));
    report.reference = {path: baseline, run_id: reference.receipt.run_id, indexSha256: reference.indexSha256,
      receiptSha256: hash(await fs.readFile(path.join(baseline, 'browser.json')))};
    const library = JSON.parse(await fs.readFile(path.join(root, 'app/distribution/qualification.courriels.json'), 'utf8'));
    const expectedBuilder = reference.items.filter(item => item.surface !== 'snum');
    if (expectedBuilder.length !== library.documents.length || reference.items.filter(item => item.surface === 'snum').length !== 1) throw new Error('Inventaire de référence différent du jeu de qualification.');
    browser = await chromium.launch({headless: true}); report.browser = {engine: 'Chromium', version: browser.version(), headless: true};
    for (const item of reference.items) {
      const context = await browser.newContext({acceptDownloads: true});
      try {
        const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
        const snum = item.surface === 'snum', surface = snum ? 'snum' : 'builder-portable';
        await page.goto(pathToFileURL(path.join(root, 'app/distribution', snum ? 'snum.html' : 'portable.html')).href);
        await page.waitForFunction(() => window.MailBuilder?.ready);
        if (snum) {
          const packet = require(path.join(root, 'tests/fixtures/snum.cjs'))();
          await page.locator('#snum-input').fill(JSON.stringify(packet));
          await page.locator('#convert').focus(); await page.keyboard.press('Enter');
          await page.waitForFunction(() => !document.getElementById('export-html').disabled);
        } else {
          const doc = library.documents.find(doc => doc.name === item.name);
          if (!doc) throw new Error('Composition source absente : ' + item.name);
          await page.locator('[data-action=resume-document]').focus(); await page.keyboard.press('Enter');
          await page.locator('#project-input').setInputFiles({name: 'qualification.courriel.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc))});
          await page.waitForFunction(name => MailBuilder.doc()?.name === name && document.getElementById('notice').textContent.includes('Import ajouté'), item.name);
        }
        const identity = await page.evaluate(() => ({name: MailBuilder.doc().name, blocks: MailBuilder.doc().blocks.map(block => block.component)}));
        if (identity.name !== item.name || JSON.stringify(identity.blocks) !== JSON.stringify(item.blocks)) throw new Error('Composition active différente : ' + item.id);
        const expected = await fs.readFile(path.join(baseline, 'exports', item.id + '.html'));
        if (hash(expected) !== item.sha256) throw new Error('Référence modifiée pendant la recette : ' + item.id);
        // Rendu intermédiaire = témoin discriminant ; jamais oracle du téléchargement.
        const intermediate = Buffer.from(await page.evaluate(() => MailBuilder.Render.html(MailBuilder.doc())), 'utf8');
        const destination = path.join(output, item.id + '-download.html');
        const gesture = await userDownload(page, snum ? '#export-html' : '[data-action=export-mail]', destination, !snum);
        const actual = await fs.readFile(destination), comparison = compareDownload(expected, actual, intermediate);
        await fs.writeFile(path.join(output, item.id + '-reference.html'), expected);
        await fs.writeFile(path.join(output, item.id + '-intermediate.html'), intermediate);
        report.cases.push({id: item.id, surface, ...identity, gesture, artifacts: {download: item.id + '-download.html', reference: item.id + '-reference.html', intermediate: item.id + '-intermediate.html'}, ...comparison});
        if (!comparison.identical) throw new Error('Octets téléchargés différents de la collecte : ' + item.id);
      } finally { try { await context.close(); } catch (error) { collectionFailure(report, 'cleanup', error, {resource: 'owned-context'}); } }
      if (report.cleanup_errors.length) throw new Error('Nettoyage de contexte incomplet : aucune autre allocation.');
    }
    if (!report.cases.some(item => item.transformationWitness)) throw new Error('Aucun témoin exportHtml distinct du rendu intermédiaire.');
    report.completed = true; report.status = 'EXECUTED';
  } catch (error) { collectionFailure(report, 'collection', error); process.exitCode = 1; }
  finally {
    if (browser) try { await browser.close(); } catch (error) { collectionFailure(report, 'cleanup', error, {resource: 'owned-browser'}); }
    report.measuredFilesSha256 = sources;
    if (!report.completed || report.errors.length) report.status = 'INCOMPLETE';
    await finishCollection({root, output, filename: 'receipt.json', report, sources});
    if (!report.completed) { report.status = 'INCOMPLETE'; process.exitCode = 1; }
    console.log(JSON.stringify({run_id: report.run_id, completed: report.completed, cases: report.cases.length, errors: report.errors}));
  }
}
module.exports = {hash, compareDownload, verifyBaseline, userDownload};
if (require.main === module) {
  const [mode, baseline, output, ...extra] = process.argv.slice(2);
  if (mode !== '--execute' || !baseline || !output || extra.length) {
    console.error('Usage explicite : node scripts/recipe_export_downloads.cjs --execute BASELINE_EXPORTS_PARENT OUTPUT_NEUF'); process.exitCode = 2;
  } else run(path.resolve(__dirname, '..'), path.resolve(baseline), path.resolve(output)).catch(error => {console.error(error); process.exitCode = 1;});
}
