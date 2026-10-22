/* Collecte sur l’application réelle ; aucun verdict de conformité humaine. */
const {chromium} = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'evidence/accessibilite-20261022');
const axePath = '/Users/alex/Claude/git-hors-workflow/ay11-pre-audit/node_modules/axe-core/axe.min.js';
const snapshots = [], interactions = [], errors = [];
let measuredFilesSha256 = {};
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const activate = async (page, selector) => { await page.locator(selector).focus(); await page.keyboard.press('Enter'); };
async function editor(page) { await page.locator('[data-action=resume-document]').waitFor({state: 'visible'}); await activate(page, '[data-action=resume-document]'); await page.locator('#editor-page').waitFor({state: 'visible'}); }
async function keyboardCycle(page, id, start, reverse = false) {
  await page.locator(start).focus();
  const trace = [];
  for (let step = 0; step < 300; step++) {
    const frames = [];
    for (const frame of page.frames()) frames.push(await frame.evaluate(() => {
      const e = document.activeElement, s = getComputedStyle(e);
      const selector = e.id ? '#' + e.id : (() => { const parts = []; let n = e; while (n && n !== document.body) {
        parts.unshift(n.localName + ':nth-of-type(' + ([...n.parentElement.children].filter(x => x.localName === n.localName).indexOf(n) + 1) + ')'); n = n.parentElement;
      } return 'body>' + parts.join('>'); })();
      return {focused: document.hasFocus() && e.tagName !== 'IFRAME', selector, tag: e.tagName,
        text: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 100),
        hidden: !e.checkVisibility() || !!e.closest('[aria-hidden=true]'),
        outline: [s.outlineStyle, s.outlineWidth, s.outlineColor], boxShadow: s.boxShadow};
    }).then(v => ({frame: frame === page.mainFrame() ? 'main' : frame.url(), ...v})));
    const active = frames.find(f => f.focused);
    if (active && step && active.frame === trace[0]?.frame && active.selector === trace[0]?.selector) break;
    trace.push(active || {focused: false, reason: 'Aucun élément focalisé dans les frames observées'});
    await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
  }
  return {id, direction: reverse ? 'Shift+Tab' : 'Tab', trace, limitReached: trace.length === 300,
    qualification: 'Trace instrumentée ; ordre pertinent et visibilité du focus à qualifier visuellement.'};
}
async function layoutProtocols(page, id) {
  const observations = [];
  for (const [width, height, protocol] of [[320,256,'reflow'],[640,360,'simulation-zoom-200'],[375,812,'portrait'],[812,375,'paysage'],[320,1000,'espacements']]) {
    await page.setViewportSize({width, height});
    const style = protocol === 'espacements' ? await page.addStyleTag({content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p,li,dd,dt,blockquote,td,th,caption,label,legend{margin-bottom:2em!important}'}) : null;
    const measured = await page.evaluate(() => {
      const text = [...document.querySelectorAll('p,label,button,summary,h1,h2,h3,li,legend,span')].filter(e => e.checkVisibility());
      return {width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
        clippingCandidates: text.filter(e => { const s = getComputedStyle(e); return (['hidden','clip'].includes(s.overflowX) && e.scrollWidth > e.clientWidth + 1) || (['hidden','clip'].includes(s.overflowY) && e.scrollHeight > e.clientHeight + 1); }).map(e => ({tag:e.tagName,id:e.id,text:e.textContent.slice(0,100)})),
        scrollContainers: [...document.querySelectorAll('*')].filter(e => { const s=getComputedStyle(e); return e.checkVisibility() && ['auto','scroll'].includes(s.overflowX) && e.scrollWidth > e.clientWidth + 1; }).map(e=>({tag:e.tagName,id:e.id})),
        viewportMeta: document.querySelector('meta[name=viewport]')?.content};
    });
    observations.push({id,protocol,...measured});
    await page.screenshot({path:path.join(output,`${id}-${protocol}.png`),fullPage:true});
    if (style) await style.evaluate(e=>e.remove());
  }
  return observations;
}
async function focus(page, action) {
  const cdp = await page.context().newCDPSession(page);
  const {result} = await cdp.send('Runtime.evaluate', {expression: 'document.activeElement'});
  const {node} = await cdp.send('DOM.describeNode', {objectId: result.objectId});
  const {nodes} = await cdp.send('Accessibility.getPartialAXTree', {backendNodeId: node.backendNodeId});
  const active = nodes.find(n => n.backendDOMNodeId === node.backendNodeId);
  interactions.push({action, dom: await page.evaluate(() => ({tag: document.activeElement.tagName, id: document.activeElement.id})), ax: active});
  await cdp.detach();
}
async function capture(page, id, state) {
  await page.evaluate(() => document.fonts.ready);
  if (!await page.evaluate(() => !!window.axe)) await page.evaluate(await fs.readFile(axePath, 'utf8'));
  const axe = await page.evaluate(() => axe.run(document));
  const rendered = await page.content();
  await fs.writeFile(path.join(output, `${id}-dom.html`), rendered);
  await fs.writeFile(path.join(output, `${id}-axe.json`), JSON.stringify(axe, null, 2));
  const cdp = await page.context().newCDPSession(page);
  await fs.writeFile(path.join(output, `${id}-ax.json`), JSON.stringify(await cdp.send('Accessibility.getFullAXTree'), null, 2)); await cdp.detach();
  await page.screenshot({path: path.join(output, `${id}.png`), fullPage: true});
  snapshots.push({id, state, url: page.url(), source: 'DOM rendu par la distribution réelle', domSha256: hash(rendered), axeVersion: axe.testEngine.version,
    violations: axe.violations.map(v => ({id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({target: n.target, html: n.html, summary: n.failureSummary}))})),
    incomplete: axe.incomplete.map(v => ({id: v.id, count: v.nodes.length}))});
}
(async () => {
  await fs.mkdir(path.join(output, 'exports'), {recursive: true});
  const measuredFiles = ['app/distribution/portable.html','app/distribution/web/index.html','app/distribution/web/sw.js','app/distribution/snum.html'];
  for (const directory of ['app/source','app/snum']) for (const name of await fs.readdir(path.join(root,directory))) measuredFiles.push(directory+'/'+name);
  measuredFilesSha256 = Object.fromEntries(await Promise.all(measuredFiles.map(async name => [name,hash(await fs.readFile(path.join(root,name)))])));
  const browser = await chromium.launch({headless: true});
  try {
    const context = await browser.newContext({bypassCSP: true, colorScheme: 'light', viewport: {width: 1440, height: 1000}});
    context.on('page', p => p.on('pageerror', e => errors.push({url: p.url(), message: e.message})));
    const page = await context.newPage();
    await page.goto('file://' + path.join(root, 'app/distribution/portable.html')); await page.waitForFunction(() => window.MailBuilder?.ready);
    await capture(page, 'home', 'Bibliothèque initiale');
    await editor(page); await capture(page, 'editor', 'Éditeur initial');
    const qualification = JSON.parse(await fs.readFile(path.join(root, 'app/distribution/qualification.courriels.json'), 'utf8'));
    const exports = await page.evaluate(lib => lib.documents.map(doc => ({name: doc.name, blocks: doc.blocks.map(b => b.component), html: MailBuilder.Render.html(doc)})), qualification);
    for (const [i, item] of exports.entries()) await fs.writeFile(path.join(output, 'exports', `${String(i + 1).padStart(2, '0')}.html`), item.html);
    await fs.writeFile(path.join(output, 'exports/index.json'), JSON.stringify(exports.map((v, i) => ({id: String(i + 1).padStart(2, '0'), name: v.name, blocks: v.blocks, sha256: hash(v.html)})), null, 2));
    for (const text of ['Mes modèles', 'Identités de service', 'Ajouter un composant', 'Fichiers et récupération', 'Importer du JSON']) {
      const summary = page.locator('summary').filter({hasText: text}); await summary.focus(); await page.keyboard.press('Enter');
    }
    await capture(page, 'editor-expanded', 'Toutes les sections ouvertes');
    await page.locator('#article-source').fill('http://exemple.invalid/');
    await capture(page, 'editor-invalid', 'URL non HTTPS refusée'); await focus(page, 'Erreur URL');
    await activate(page, '[data-action=cancel-fields]');
    await activate(page, '[data-action=library-home]'); await activate(page, '[data-library-action=rename]');
    await capture(page, 'rename-dialog', 'Dialogue de renommage'); await focus(page, 'Ouverture du dialogue');
    await page.locator('#library-name').fill(''); await activate(page, '#library-confirm');
    await capture(page, 'rename-invalid', 'Dialogue : nom vide refusé'); await focus(page, 'Erreur du dialogue');
    await activate(page, '#library-cancel'); await focus(page, 'Annulation du dialogue');
    await activate(page, '[data-library-action=remove]'); await capture(page, 'delete-dialog', 'Confirmation de suppression');
    await activate(page, '#library-cancel'); await editor(page);
    for (const operation of ['down', 'duplicate', 'remove']) { await activate(page, `[data-block-action=${operation}]`); await focus(page, operation); }
    const article = await page.evaluate(() => MailBuilder.doc().blocks.find(b => b.component === 'mail-19').id);
    await activate(page, `[data-select="${article}"]`);
    await page.locator('#field-f0').fill(''); await page.locator('#article-source').fill('https://exemple.invalid/source'); await page.locator('#article-source-label').fill('Lire le dossier');
    await capture(page, 'source-label', 'Intitulé personnalisé et champ texte vide');
    const layout = [];
    for (const width of [320, 640, 1280]) {
      await page.setViewportSize({width, height: 1000});
      const style = await page.addStyleTag({content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});
      layout.push(await page.evaluate(() => ({viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        overflowing: [...document.querySelectorAll('button,input,select,textarea,summary')].filter(e => {const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1);}).map(e => ({tag: e.tagName, id: e.id, text: e.textContent.slice(0,100)}))})));
      await page.screenshot({path: path.join(output, `text-spacing-${width}.png`), fullPage: true}); await style.evaluate(e => e.remove());
    }
    await fs.writeFile(path.join(output, 'layout.json'), JSON.stringify(layout, null, 2));
    const snum = await context.newPage(); await snum.goto('file://' + path.join(root, 'app/distribution/snum.html'));
    await capture(snum, 'snum-initial', 'Convertisseur SNUM initial');
    await snum.locator('#snum-input').fill('{'); await activate(snum, '#convert'); await capture(snum, 'snum-invalid', 'Erreur de collecte SNUM');
    await snum.locator('#snum-input').fill(JSON.stringify(require('../tests/fixtures/snum.cjs')())); await activate(snum, '#convert');
    await capture(snum, 'snum-converted', 'Collecte SNUM synthétique convertie');
    const rendered = await snum.evaluate(() => MailBuilder.Render.html(MailBuilder.doc())); await fs.writeFile(path.join(output, 'exports/10.html'), rendered);
    await fs.writeFile(path.join(output, 'interactions.json'), JSON.stringify(interactions, null, 2));
    // Contexte distinct : conserver la CSP réelle, sans injection d’axe.
    const native = await browser.newContext({colorScheme:'light',viewport:{width:1280,height:720}});
    native.on('page', p => p.on('pageerror', e => errors.push({url:p.url(),message:e.message})));
    const keys = await native.newPage(); await keys.goto('file://' + path.join(root,'app/distribution/portable.html'));
    await keys.waitForFunction(()=>window.MailBuilder?.ready);
    const keyboard = [await keyboardCycle(keys,'home','.skip'),await keyboardCycle(keys,'home','.skip',true)];
    await activate(keys,'[data-library-action=rename]');
    keyboard.push(await keyboardCycle(keys,'rename-dialog','#library-name'),await keyboardCycle(keys,'rename-dialog','#library-name',true));
    await keys.keyboard.press('Escape'); await focus(keys,'Fermeture par Échap'); await editor(keys);
    for (const text of ['Mes modèles','Identités de service','Ajouter un composant','Fichiers et récupération','Importer du JSON']) await activate(keys,'summary:has-text("'+text+'")');
    keyboard.push(await keyboardCycle(keys,'expanded','.skip'),await keyboardCycle(keys,'expanded','.skip',true));
    const protocols = await layoutProtocols(keys,'editor');
    const converter = await native.newPage(); await converter.goto('file://' + path.join(root,'app/distribution/snum.html'));
    keyboard.push(await keyboardCycle(converter,'snum','#snum-input'),await keyboardCycle(converter,'snum','#snum-input',true));
    protocols.push(...await layoutProtocols(converter,'snum'));
    await fs.writeFile(path.join(output,'keyboard.json'),JSON.stringify({bypassCSP:false,screenReaderExecuted:false,keyboard},null,2));
    await fs.writeFile(path.join(output,'layout-protocols.json'),JSON.stringify({actualBrowserZoom:false,observations:protocols},null,2));
    await fs.writeFile(path.join(output,'interactions.json'),JSON.stringify(interactions,null,2));
  } finally { await browser.close(); }
})().catch(error => { errors.push(error.stack); process.exitCode = 1; }).finally(async () => {
  for (const [name,digest] of Object.entries(measuredFilesSha256)) if (hash(await fs.readFile(path.join(root,name))) !== digest) { errors.push('Fichier modifié pendant la collecte : '+name); process.exitCode = 1; }
  await fs.writeFile(path.join(output, 'browser.json'), JSON.stringify({measuredFilesSha256, bypassCSPForLocalAxe: true, humanQualification: false, screenReaderExecuted: false, snapshots, errors}, null, 2));
  console.log(JSON.stringify({states: snapshots.length, violations: snapshots.map(s => ({state: s.id, rules: s.violations.map(v => v.id)})), errors}));
});
