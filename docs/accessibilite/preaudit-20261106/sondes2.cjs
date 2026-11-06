const repo = '/Users/alex/Claude/git-hors-workflow/builder-mail-dsfr';
const {chromium} = require(repo + '/node_modules/playwright');
const http = require('node:http'), path = require('node:path'), fs = require('node:fs/promises');
const web = path.join(repo, 'app/distribution/web');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
(async () => {
  const server = http.createServer(async (q, r) => { try { const p = new URL(q.url, 'http://x').pathname, f = path.join(web, p === '/' ? 'index.html' : p); const b = await fs.readFile(f); r.writeHead(200, {'Content-Type': types[path.extname(f)] || 'application/octet-stream'}); r.end(b); } catch { r.writeHead(404); r.end(); } });
  await new Promise(res => server.listen(0, '127.0.0.1', res)); const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({channel: 'chromium', args: ['--lang=fr-FR']}), out = {};
  try {
    for (const [w, label] of [[1280, 'dom'], [640, 'zoom200'], [320, 'r320']]) {
      const context = await browser.newContext({viewport: {width: w, height: 900}, locale: 'fr-FR'}), page = await context.newPage();
      await page.goto(url); await page.waitForFunction(() => window.MailBuilder?.ready);
      await page.getByRole('button', {name: 'Créer à partir de cet exemple « Lettre d’information »'}).click();
      await page.locator('#editor-page').waitFor({state: 'visible'});
      await page.locator('#block-list [data-select]').nth(3).click();
      await page.locator('summary', {hasText: 'Ajouter un composant'}).click(); await page.waitForTimeout(300);
      if (label === 'dom') {
        await fs.writeFile(path.join(__dirname, 'sortie', 'dom-editeur-propre.html'), '<!doctype html>\n' + await page.evaluate(() => document.documentElement.outerHTML));
        // Focus visible dans l'aperçu : premier lien atteint au clavier.
        await page.locator('a.skip-local[href="#files-summary"]').focus(); await page.keyboard.press('Tab');
        out.focusApercu = await page.frameLocator('#preview').locator('body').evaluate(b => { const e = b.ownerDocument.activeElement, s = getComputedStyle(e); return {tag: e.tagName, text: e.textContent.trim().slice(0, 50), outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, shadow: s.boxShadow}; }).catch(e => 'ERREUR ' + e.message);
        out.focusApercuSurPage = await page.evaluate(() => document.activeElement.id);
        await page.locator('#preview').screenshot({path: path.join(__dirname, 'sortie', 'focus-apercu.png')});
      }
      out[label] = await page.evaluate(() => { const s = document.getElementById('catalogue'); return {viewport: innerWidth, overflowPage: document.scrollingElement.scrollWidth - innerWidth, clientWidth: s.clientWidth, scrollWidth: s.scrollWidth}; });
      await context.close();
    }
  } finally { await browser.close(); server.close(); }
  console.log(JSON.stringify(out, null, 2));
})();
