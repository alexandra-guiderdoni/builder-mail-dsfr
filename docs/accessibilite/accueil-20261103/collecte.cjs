/* Requalification ciblée de l'accueil refondu (#205, #207) : collecte automatique, aucun verdict humain. */
const repo = '/Users/alex/Claude/git-hors-workflow/builder-mail-dsfr';
const {chromium} = require(repo + '/node_modules/playwright');
const http = require('node:http'), path = require('node:path'), fs = require('node:fs/promises');
const axePath = '/Users/alex/Claude/git-hors-workflow/ay11-pre-audit/node_modules/axe-core/axe.min.js';
const out = process.argv[2];
const portable = 'file://' + path.join(repo, 'app/distribution/portable.html'), web = path.join(repo, 'app/distribution/web');

async function serve() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname, file = path.join(web, pathname === '/' ? 'index.html' : pathname);
      const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
      response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}); response.end(await fs.readFile(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {server, url: `http://127.0.0.1:${server.address().port}/`};
}
const ready = page => page.waitForFunction(() => window.MailBuilder?.ready);
const hold = () => {
  const real = indexedDB.open.bind(indexedDB), held = [];
  window.__releaseStorage = () => held.splice(0).forEach(go => go());
  indexedDB.open = (...args) => { const request = {}; held.push(() => { const r = real(...args); for (const type of ['upgradeneeded', 'success', 'error', 'blocked']) r.addEventListener(type, () => { request.result = r.result; request.error = r.error; request['on' + type]?.(); }); }); return request; };
};

async function measure(page, name, axeSource) {
  await page.addScriptTag({content: axeSource});
  const axe = await page.evaluate(async () => {
    const r = await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']}, resultTypes: ['violations', 'incomplete']});
    const slim = list => list.map(v => ({id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({target: n.target.join(' '), summary: n.failureSummary}))}));
    return {violations: slim(r.violations), incomplete: slim(r.incomplete), passes: r.passes.length};
  });
  const headings = (await page.locator('body').ariaSnapshot()).split('\n').flatMap(line => { const m = /^\s*- heading "(.*)" \[level=(\d)\]/.exec(line); return m ? [`h${m[2]} ${m[1]}`] : []; });
  const overflow = await page.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
  // Ordre clavier depuis le titre de l'accueil : élément, texte, visibilité, indicateur de focus.
  await page.locator('#home-title').focus();
  const tabs = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => { const e = document.activeElement, s = getComputedStyle(e), r = e.getBoundingClientRect();
      return {tag: e.tagName.toLowerCase(), id: e.id || '', text: (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70),
        visible: e.checkVisibility() && r.width > 0, indicator: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 || s.boxShadow !== 'none',
        inWelcome: !!e.closest('#welcome'), inEditor: !!e.closest('#editor-page')}; });
    tabs.push(f); if (f.inEditor || f.tag === 'body') break;
  }
  return {name, axe, headings, overflow, tabs};
}

(async () => {
  const axeSource = await fs.readFile(axePath, 'utf8'), browser = await chromium.launch({headless: true}), {server, url} = await serve(), results = [];
  const fresh = async (opts = {}) => { const context = await browser.newContext({bypassCSP: true, viewport: {width: 1280, height: 900}, ...opts}); return {context, page: await context.newPage()}; };
  try {
    { const {page} = await fresh(); await page.goto(portable); await ready(page); results.push(await measure(page, 'portable — première visite', axeSource)); }
    { const {page} = await fresh(); await page.goto(url); await ready(page); results.push(await measure(page, 'web — première visite (étape « Installer »)', axeSource)); }
    { const {page} = await fresh({viewport: {width: 320, height: 800}}); await page.goto(url); await ready(page); results.push(await measure(page, 'web — première visite à 320 px', axeSource)); }
    { const {page} = await fresh(); await page.addInitScript(hold); await page.goto(portable); await page.locator('#save-state').waitFor(); const r = await measure(page, 'portable — lecture du stockage en cours', axeSource); r.ready = await page.evaluate(() => !!MailBuilder.ready); results.push(r); }
    { const {page} = await fresh(); await page.goto(portable); await ready(page);
      await page.locator('[data-example=information] [data-example-action=create]').click();
      await page.waitForFunction(() => document.querySelector('#save-state').textContent === 'Newsletters enregistrées dans ce navigateur.');
      await page.reload(); await ready(page); results.push(await measure(page, 'portable — newsletters existantes', axeSource));
      await page.evaluate(async () => {
        const record = await MailBuilder.Storage.load(); record.token = 'version-inconnue'; record.library.version = 99;
        await new Promise((resolve, reject) => { const q = indexedDB.open('builder-mail-dsfr-library', 1); q.onsuccess = () => { const tx = q.result.transaction('library', 'readwrite'); tx.objectStore('library').put(record, 'current'); tx.oncomplete = () => { q.result.close(); resolve(); }; tx.onerror = reject; }; });
      });
      await page.reload(); await ready(page); results.push(await measure(page, 'portable — stockage illisible', axeSource)); }
    // Focus après « Restaurer une sauvegarde » (étape 2 de l'accueil guidé).
    { const {page} = await fresh(); await page.goto(portable); await ready(page);
      await page.locator('[data-action=welcome-restore]').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      results.push({name: 'focus après « Restaurer une sauvegarde »', focus: await page.evaluate(() => { const e = document.activeElement; const label = e.id && document.querySelector(`label[for="${e.id}"]`); return {tag: e.tagName.toLowerCase(), id: e.id, label: label?.textContent.trim() || '', visible: e.checkVisibility()}; })}); }
  } finally { await browser.close(); server.close(); }
  await fs.writeFile(out, JSON.stringify({collected: new Date().toISOString(), axe: 'axe-core (ay11-pre-audit)', results}, null, 2));
  for (const r of results) {
    if (!r.axe) { console.log(`\n## ${r.name}\n`, JSON.stringify(r.focus)); continue; }
    console.log(`\n## ${r.name}${'ready' in r ? ` (ready=${r.ready})` : ''}\naxe : ${r.axe.violations.length} violation(s), ${r.axe.incomplete.length} à revoir, ${r.axe.passes} règles passées ; débordement horizontal ${r.overflow} px`);
    for (const v of r.axe.violations) console.log(`  VIOLATION ${v.id} (${v.impact}) ${v.help} :: ${v.nodes.map(n => n.target).join(' | ').slice(0, 300)}`);
    for (const v of r.axe.incomplete) console.log(`  À REVOIR ${v.id} ${v.help} :: ${v.nodes.length} nœud(s) ${v.nodes.map(n => n.target).join(' | ').slice(0, 200)}`);
    console.log('  titres : ' + r.headings.join(' / '));
    console.log('  clavier : ' + r.tabs.map(t => `${t.text || t.id || t.tag}${t.visible ? '' : ' [INVISIBLE]'}${t.indicator ? '' : ' [SANS INDICATEUR]'}`).join(' → '));
  }
})();
