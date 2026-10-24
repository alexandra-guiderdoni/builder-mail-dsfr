const path = require('node:path');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..'), evidence = process.env.MAIL_BUILDER_EVIDENCE || path.join(root, 'evidence/application');
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
async function download(page, selector, filename) {
  await fs.mkdir(evidence, {recursive: true});
  const event = page.waitForEvent('download'); await click(page, selector);
  const result = await event, destination = path.join(evidence, filename); await result.saveAs(destination); return destination;
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
module.exports = {root, evidence, portable, click, open, enterEditor, saved, expand, download, selectBlock, selectBlockEffective, focusPage, duplicateBlock, state, store, chromium, fs, assert};
