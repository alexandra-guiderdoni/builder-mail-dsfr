const path = require('node:path');
const {markDestination, destinationError} = require('./destinations-probe.cjs');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const engines = ['chromium', 'webkit', 'firefox'];
const engineName = process.env.MAIL_BUILDER_ENGINE || 'chromium';
if (!engines.includes(engineName)) throw new Error(`Moteur inconnu : ${engineName} (attendu : ${engines.join(', ')}).`);
const testFile = path.basename(process.argv[1] || 'inconnu');
// Journal des preuves non natives (MAIL_BUILDER_NOTES, fixé par tests/run-engines.cjs) : une ligne JSON par constat.
const note = entry => { if (process.env.MAIL_BUILDER_NOTES) require('node:fs').appendFileSync(process.env.MAIL_BUILDER_NOTES, JSON.stringify({engine: engineName, file: testFile, ...entry}) + '\n'); };
// Seul Chromium accorde clipboard-read et clipboard-write à Playwright ; les autres moteurs refusent la permission elle-même.
const nativePermissions = new Set(engineName === 'chromium' ? ['clipboard-read', 'clipboard-write'] : []);
const portablePermissions = permissions => permissions?.filter(p => !/^clipboard-/.test(p) || nativePermissions.has(p));
// Hors Chromium, aucun collage réel n'est automatisable : l'écriture de l'application reste exécutée pour de bon, mais la
// relecture rend les éléments enregistrés à l'écriture. C'est une interception, jamais un collage : chaque usage est journalisé.
function clipboardInterception() {
  const proto = window.Clipboard?.prototype; if (!proto || window.__mailBuilderClipboard) return;
  window.__mailBuilderClipboard = {written: null};
  const write = proto.write, writeText = proto.writeText;
  // Enregistrer seulement après réussite native : un refus ne doit jamais fabriquer une nouvelle sortie.
  proto.write = async function (items) { await write.call(this, items); window.__mailBuilderClipboard.written = items; try { window.mailBuilderNote({kind: 'clipboard-write-recorded'}); } catch {} };
  proto.writeText = async function (text) { await writeText.call(this, text); window.__mailBuilderClipboard.written = [new ClipboardItem({'text/plain': new Blob([text], {type: 'text/plain'})})]; try { window.mailBuilderNote({kind: 'clipboard-write-text-recorded'}); } catch {} };
  proto.read = async function () { try { window.mailBuilderNote({kind: 'clipboard-read-intercepted'}); } catch {} if (!window.__mailBuilderClipboard.written) throw new DOMException('Aucune écriture à relire.', 'NotAllowedError'); return window.__mailBuilderClipboard.written; };
  proto.readText = async function () { try { window.mailBuilderNote({kind: 'clipboard-read-text-intercepted'}); } catch {} const items = await this.read(); const item = items.find(item => item.types.includes('text/plain')); return item ? (await item.getType('text/plain')).text() : ''; };
}
async function prepareContext(context) {
  if (nativePermissions.size) return context;
  await context.exposeBinding('mailBuilderNote', (source, entry) => note(entry));
  await context.addInitScript(clipboardInterception);
  return context;
}
// `chromium` reste le nom historique importé par les tests : il désigne le moteur choisi par MAIL_BUILDER_ENGINE.
const chromium = {
  name: engineName,
  async launch(options) {
    const browser = await playwright[engineName].launch(options), newContext = browser.newContext.bind(browser);
    browser.newContext = async (contextOptions = {}) => prepareContext(await newContext({...contextOptions, ...(contextOptions.permissions ? {permissions: portablePermissions(contextOptions.permissions)} : {})}));
    return browser;
  }
};
// Arbre d'accessibilité natif : il passe par CDP, donc Chromium seulement. Ailleurs ces aides rendent null et l'appelant
// s'appuie sur la structure ARIA que Playwright calcule de la même façon dans les trois moteurs (ariaSnapshot).
const nativeAx = engineName === 'chromium';
async function nativeAxTree(context, target) {
  if (!nativeAx) return null;
  const cdp = await context.newCDPSession(target);
  try { return (await cdp.send('Accessibility.getFullAXTree')).nodes; } finally { await cdp.detach(); }
}
async function nativeAxNode(page, selector) {
  if (!nativeAx) return null;
  const cdp = await page.context().newCDPSession(page);
  try {
    const {result} = await cdp.send('Runtime.evaluate', {expression: `document.querySelector(${JSON.stringify(selector)})`});
    const {node} = await cdp.send('DOM.describeNode', {objectId: result.objectId});
    const {nodes} = await cdp.send('Accessibility.getPartialAXTree', {backendNodeId: node.backendNodeId});
    return nodes.find(n => n.backendDOMNodeId === node.backendNodeId) ?? null;
  } finally { await cdp.detach(); }
}
const ariaHeadings = async target => (await target.locator('body').ariaSnapshot()).split('\n').flatMap(line => { const m = /^\s*- heading "(.*)" \[level=(\d)\]/.exec(line); return m ? [{level: Number(m[2]), text: m[1].trim()}] : []; });
// Les reçus Chromium alimentent les scripts d'audit : un autre moteur écrit ailleurs et ne les écrase jamais.
const evidence = process.env.MAIL_BUILDER_EVIDENCE || path.join(root, engineName === 'chromium' ? 'evidence/application' : `evidence/application-${engineName}`);
const portable = 'file://' + path.join(root, 'app/distribution/portable.html');
const click = async (page, selector) => { const control = page.locator(selector); await control.waitFor({state: 'visible'}); await control.focus(); await control.press('Enter'); };
async function open(browser, contextOptions = {}, beforeNavigate) {
  const context = await browser.newContext({acceptDownloads: true, colorScheme: 'light', viewport: {width: 1600, height: 1000}, ...contextOptions});
  const page = await context.newPage();
  const observations = {errors: [], requests: []};
  page.on('pageerror', error => observations.errors.push(error.message));
  page.on('request', request => observations.requests.push(request.url()));
  if (beforeNavigate) await beforeNavigate(page);
  await page.goto(portable); await page.waitForFunction(() => window.MailBuilder?.ready);
  await enterEditor(page);
  return {context, page, observations};
}
async function enterEditor(page) { if (await page.locator('[data-action=resume-document]').isVisible()) await click(page, '[data-action=resume-document]'); await page.locator('#editor-page').waitFor({state: 'visible'}); await page.evaluate(() => document.fonts.ready); }
async function saved(page) {
  await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Bibliothèque sauvegardée dans ce navigateur.');
}
async function expand(page, text) {
  const summary = page.locator('summary').filter({hasText: text});
  if (!(await summary.evaluate(e => e.parentElement.open))) {
    await summary.scrollIntoViewIfNeeded(); await summary.click();
    await page.waitForFunction(label => [...document.querySelectorAll('summary')].some(e => e.textContent.includes(label) && e.parentElement.open), text, {timeout: 3000});
  }
}
/* État visible de la page au moment d’un échec : ce que l’atelier annonce, refuse ou demande, pour nommer la cause réelle. */
const pageState = page => page.evaluate(() => ({notice: document.getElementById('notice')?.textContent.trim(), error: document.getElementById('error')?.hidden === false ? document.getElementById('error').textContent.trim() : '', checkDialog: document.getElementById('check-dialog')?.open === true, focused: document.hasFocus()})).catch(cause => ({unreadable: cause.message.split('\n')[0]}));
// Depuis #36, une composition qui garde des contenus de démonstration demande une confirmation avant copie ou téléchargement.
/* Avec `settled` (promesse réglée par la fin de l’action : téléchargement reçu, annonce affichée), l’attente porte sur l’un des
   deux états observables, fenêtre ouverte ou action terminée, au lieu d’un seul regard qui manquait une fenêtre ouverte après un
   `await` du gestionnaire ; un #error apparu pendant l’attente échoue aussitôt en citant son texte. Sans `settled`, un seul regard. */
async function confirmChecks(page, settled) {
  const look = () => page.evaluate(() => { try { window.__dest145?.firstOpen(); } catch {} return {open: document.getElementById('check-dialog')?.open === true, error: document.getElementById('error')?.hidden === false ? document.getElementById('error').textContent.trim() : ''}; });
  if (!settled) { if ((await look()).open) await page.locator('#check-confirm').click(); return; }
  let done = false; settled.then(() => { done = true; }, () => { done = true; });
  const initial = (await look()).error;
  while (!done) {
    const seen = await look();
    if (seen.error && seen.error !== initial) throw new Error(`Action refusée par l’atelier : ${seen.error}`);
    if (seen.open) {
      markDestination(page, 'confirm-click-before');
      try { await page.locator('#check-confirm').click(); markDestination(page, 'confirm-click-return'); }
      catch (error) { destinationError(page, error, 'confirm-click'); throw error; }
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
/* Attend l’annonce `text` dans #notice ; si #error se remplit avant, échoue en citant son texte plutôt qu’à l’expiration du délai.
   Si ni annonce ni erreur n’apparaissent dans le délai imparti, l’exception cite l’annonce attendue, `pageState` au moment de
   l’expiration et l’erreur d’origine, pour qu’un échec CI nomme son état plutôt qu’un `TimeoutError` anonyme. */
async function announced(page, text, options = {}) {
  const handle = await page.waitForFunction(expected => { const error = document.getElementById('error'); if (!error.hidden && error.textContent.trim()) return {error: error.textContent.trim()}; return document.getElementById('notice').textContent.includes(expected) ? {notice: true} : null; }, text, options)
    .catch(async cause => { const state = await pageState(page); throw new Error(`Annonce « ${text} » non observée dans le délai ; état de la page : ${JSON.stringify(state)} ; cause d’origine : ${cause.message.split('\n')[0]}`, {cause}); });
  const seen = await handle.jsonValue();
  if (seen.error) throw new Error(`Annonce « ${text} » attendue ; #error affiche : ${seen.error} ; état de la page : ${JSON.stringify(await pageState(page))}`);
}
async function download(page, selector, filename) {
  await fs.mkdir(evidence, {recursive: true});
  const event = page.waitForEvent('download'); await click(page, selector); await confirmChecks(page, event);
  const result = await event.catch(async cause => { throw new Error(`Aucun téléchargement reçu pour ${selector} (${filename}) ; état de la page : ${JSON.stringify(await pageState(page))}`, {cause}); });
  const destination = path.join(evidence, filename); await result.saveAs(destination); return destination;
}
/* Attend que l’aperçu affiche le texte donné : cadre chargé, document complet, texte présent au moins `count` fois. */
async function previewShows(page, text, count = 1) {
  await page.waitForFunction(() => document.querySelector('#preview')?.src.startsWith('blob:'));
  const frame = page.frames().find(f => f !== page.mainFrame() && f.url().startsWith('blob:'));
  await frame.waitForFunction(({text, count}) => document.readyState === 'complete' && [...document.body.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.includes(text)).length >= count, {text, count});
}
/* Duplique le bloc sélectionné en n’agissant qu’après la fin du rendu, puis attend le bloc dupliqué, la sauvegarde et le nouveau rendu. */
async function duplicateBlock(page) {
  const title = (await page.evaluate(() => document.querySelector('#block-editor textarea')?.value ?? '')).trim();
  if (title) await previewShows(page, title);
  const before = await page.evaluate(() => ({count: MailBuilder.doc().blocks.length, selected: MailBuilder.selected}));
  await click(page, '[data-block-action=duplicate]');
  await page.waitForFunction(({count, selected}) => MailBuilder.doc().blocks.length === count + 1 && MailBuilder.selected !== selected && MailBuilder.doc().blocks.some(b => b.id === MailBuilder.selected) && document.querySelector(`[data-select="${MailBuilder.selected}"]`), before);
  await saved(page);
  if (title) await previewShows(page, title, 2);
  return before;
}
async function selectBlock(page, id) { await click(page, `[data-select="${id}"]`); }
/* Sélectionne un bloc et attend que la sélection soit effective ; un clic perdu échoue ici, pas plus loin. */
async function selectBlockEffective(page, id) { await selectBlock(page, id); await page.waitForFunction(blockId => MailBuilder.selected === blockId && document.querySelector('#block-editor textarea,#block-editor input'), id); }
/* Ramène la page au premier plan : Firefox ne traite pas l’activation d’un bouton par Entrée dans un onglet sans focus. */
async function focusPage(page) { await page.bringToFront(); await page.waitForFunction(() => document.hasFocus()); }
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(MailBuilder.library)));
const store = page => page.evaluate(() => MailBuilder.Storage.load());
module.exports = {root, evidence, portable, click, open, enterEditor, saved, expand, download, confirmChecks, announced, pageState, selectBlock, selectBlockEffective, focusPage, duplicateBlock, state, store, chromium, fs, assert, engines, engineName, note, nativeAx, nativeAxTree, nativeAxNode, ariaHeadings};
