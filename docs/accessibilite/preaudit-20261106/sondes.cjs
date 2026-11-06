/* Sondes ciblées sur les points ouverts par la collecte : clavier après l'aperçu, focus après « Supprimer », contrastes indéterminés, catalogue à 200 %. */
const repo = '/Users/alex/Claude/git-hors-workflow/builder-mail-dsfr';
const {chromium} = require(repo + '/node_modules/playwright');
const http = require('node:http'), path = require('node:path'), fs = require('node:fs/promises');
const web = path.join(repo, 'app/distribution/web');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png'};
const active = page => page.evaluate(() => { const e = document.activeElement; return `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''} « ${(e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)} »`; });

(async () => {
  const server = http.createServer(async (q, r) => { try { const p = new URL(q.url, 'http://x').pathname, f = path.join(web, p === '/' ? 'index.html' : p); const b = await fs.readFile(f); r.writeHead(200, {'Content-Type': types[path.extname(f)] || 'application/octet-stream'}); r.end(b); } catch { r.writeHead(404); r.end(); } });
  await new Promise(res => server.listen(0, '127.0.0.1', res)); const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({channel: 'chromium', args: ['--lang=fr-FR']}), out = {};
  try {
    const context = await browser.newContext({viewport: {width: 1280, height: 900}, locale: 'fr-FR'}), page = await context.newPage();
    await page.goto(url); await page.waitForFunction(() => window.MailBuilder?.ready);
    await page.getByRole('button', {name: 'Créer à partir de cet exemple « Lettre d’information »'}).click();
    await page.locator('#editor-page').waitFor({state: 'visible'});
    // A. Tabulation après « Télécharger le HTML » : l'aperçu, puis la suite.
    await page.locator('[data-action=export-mail]').focus(); const seq = [];
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); seq.push(await active(page)); }
    out.tabApresApercu = seq;
    // Retour arrière depuis « Sauvegarde et import ».
    await page.locator('#files-summary').focus(); const back = [];
    for (let i = 0; i < 4; i++) { await page.keyboard.press('Shift+Tab'); back.push(await active(page)); }
    out.shiftTabDepuisSauvegarde = back;
    // Contenu focalisable dans l'iframe d'aperçu.
    out.focalisablesApercu = await page.frameLocator('#preview').locator('a[href],button,input,[tabindex]').count();
    // C. Focus après fermeture du dialogue « Supprimer la newsletter » : Échap, puis « Annuler ».
    for (const how of ['Escape', 'Annuler']) {
      await page.locator('[data-action=remove-document]').focus(); await page.keyboard.press('Enter'); await page.locator('#library-dialog[open]').waitFor();
      if (how === 'Escape') await page.keyboard.press('Escape'); else await page.locator('#library-cancel').click();
      await page.waitForTimeout(200); out[`focusApresSuppression_${how}`] = await active(page);
    }
    // Même mesure pour « Dupliquer la newsletter » s'il ouvre un dialogue.
    await page.locator('[data-action=duplicate-document]').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    out.dupliquer = {dialog: await page.evaluate(() => document.querySelector('dialog[open]')?.id || ''), focus: await active(page)};
    if (out.dupliquer.dialog) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); out.dupliquer.apresEchap = await active(page); }
    // G. Contrastes indéterminés par axe : couleur du texte et fond calculé (image de fond ignorée).
    await page.locator('summary', {hasText: 'Ajouter un composant'}).click();
    await page.locator('#block-list [data-select]').nth(3).click();
    out.contrastes = await page.evaluate(() => {
      const rgb = s => (/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(s) || []).slice(1).map(Number);
      const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const bg = e => { for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n).backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(s)) return s; } return 'rgb(255, 255, 255)'; };
      return ['#documents', '#catalogue', '#identities', '#move-position', '#image-source-f0', '#portable-download', '#starter', '.block-handle span'].map(sel => {
        const e = document.querySelector(sel); if (!e) return {sel, absent: true};
        const s = getComputedStyle(e), c = rgb(s.color), b = rgb(bg(e)), [x, y] = [lum(c), lum(b)].sort((p, q) => q - p);
        return {sel, color: s.color, background: bg(e), backgroundImage: s.backgroundImage.slice(0, 60), fontSize: s.fontSize, ratio: +((x + 0.05) / (y + 0.05)).toFixed(2)};
      });
    });
    // H. Catalogue avec le texte à 200 % : largeur utile et options tronquées.
    await page.addStyleTag({content: 'html { font-size: 200% !important; }'}); await page.waitForTimeout(200);
    out.catalogue200 = await page.evaluate(() => { const s = document.getElementById('catalogue'); const cs = getComputedStyle(s);
      return {clientWidth: s.clientWidth, scrollWidth: s.scrollWidth, overflowX: cs.overflowX, options: s.options.length, longest: Math.max(...[...s.options].map(o => o.text.length)), sample: [...s.options].slice(0, 3).map(o => o.text)}; });
    await page.screenshot({path: path.join(__dirname, 'sortie', 'catalogue-200.png'), clip: await page.locator('#catalogue').boundingBox().then(b => ({x: b.x, y: b.y, width: Math.min(b.width, 1280), height: b.height}))}).catch(e => { out.captureErreur = e.message; });
    // 2.1 / 2.2 : titres des cadres et contenu de l'aperçu de l'exemple.
    await context.close();
  } finally { await browser.close(); server.close(); }
  console.log(JSON.stringify(out, null, 2));
})();
