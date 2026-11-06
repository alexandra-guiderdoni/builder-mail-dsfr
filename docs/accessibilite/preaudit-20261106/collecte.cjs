/* Préqualification RGAA 4.1.2 de l'atelier (version web servie en local) : collecte instrumentée, aucun verdict humain.
   node collecte.cjs <dossier-sortie> */
const repo = '/Users/alex/Claude/git-hors-workflow/builder-mail-dsfr';
const {chromium} = require(repo + '/node_modules/playwright');
const http = require('node:http'), path = require('node:path'), fs = require('node:fs/promises');
const axePath = '/Users/alex/Claude/git-hors-workflow/ay11-pre-audit/node_modules/axe-core/axe.min.js';
const out = path.resolve(process.argv[2] || '.'), web = path.join(repo, 'app/distribution/web');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json'};

async function serve() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname, file = path.join(web, pathname === '/' ? 'index.html' : pathname);
      const body = await fs.readFile(file);
      response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}); response.end(body);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {server, url: `http://127.0.0.1:${server.address().port}/`};
}
const ready = page => page.waitForFunction(() => window.MailBuilder?.ready);
const saved = page => page.waitForFunction(() => /enregistrées dans ce navigateur/.test(document.querySelector('#save-state')?.textContent || ''));

// Mesures sur le DOM courant, exécutées dans la page.
function domFacts() {
  const visible = e => e.checkVisibility?.() !== false && e.getClientRects().length > 0;
  const name = e => (e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ') || (e.labels?.[0]?.textContent) || e.getAttribute('title') || e.textContent || e.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 90);
  const inert = e => !!e.closest('[inert]') || (document.querySelector('dialog[open]') && !e.closest('dialog[open]'));
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')].filter(visible).filter(e => !inert(e)).map(e => `h${e.getAttribute('aria-level') || e.tagName[1]} ${name(e)}`);
  const landmarks = [...document.querySelectorAll('header,nav,main,footer,aside,[role=banner],[role=navigation],[role=main],[role=contentinfo],[role=search],[role=region],section[aria-label],section[aria-labelledby]')].filter(visible).map(e => `${e.getAttribute('role') || e.tagName.toLowerCase()}${e.closest('main') && /header|footer/i.test(e.tagName) ? '(dans main)' : ''} « ${(e.getAttribute('aria-label') || document.getElementById(e.getAttribute('aria-labelledby') || '')?.textContent || '').trim()} »`);
  const links = [...document.querySelectorAll('a[href]')].filter(visible).map(a => ({name: name(a), href: a.getAttribute('href'), target: a.target || '', download: a.hasAttribute('download')}));
  const images = [...document.querySelectorAll('img,svg,[role=img],input[type=image],area')].filter(visible).map(e => ({tag: e.tagName.toLowerCase(), alt: e.getAttribute('alt'), ariaHidden: e.closest('[aria-hidden=true]') ? true : false, label: e.getAttribute('aria-label') || '', src: (e.getAttribute('src') || '').slice(0, 60)}));
  const iframes = [...document.querySelectorAll('iframe')].filter(visible).map(f => ({id: f.id, title: f.title}));
  const media = document.querySelectorAll('video,audio,object,embed,canvas,marquee,blink').length;
  const tables = [...document.querySelectorAll('table')].filter(visible).length;
  const fields = [...document.querySelectorAll('input,select,textarea')].filter(visible).filter(e => e.type !== 'hidden').map(e => ({id: e.id, type: e.type, label: e.labels?.[0]?.textContent.trim().replace(/\s+/g, ' ') || e.getAttribute('aria-label') || '', visibleLabel: !!e.labels?.[0] && visible(e.labels[0]), required: e.required || e.getAttribute('aria-required') === 'true', requiredInLabel: /obligatoire/i.test(e.labels?.[0]?.textContent || ''), autocomplete: e.getAttribute('autocomplete'), invalid: e.getAttribute('aria-invalid'), describedby: (e.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => document.getElementById(id)?.textContent.trim().slice(0, 80) || `#${id} ABSENT`)}));
  const groups = [...document.querySelectorAll('fieldset')].filter(visible).map(f => f.querySelector('legend')?.textContent.trim() || '(sans légende)');
  const live = [...document.querySelectorAll('[role=status],[role=alert],[aria-live]')].map(e => ({id: e.id, role: e.getAttribute('role') || '', live: e.getAttribute('aria-live') || '', text: e.textContent.trim().slice(0, 120), hidden: !visible(e)}));
  const pseudo = [];
  for (const e of document.querySelectorAll('body *')) for (const p of ['::before', '::after']) { const c = getComputedStyle(e, p).content; if (c && c !== 'none' && c !== 'normal' && c !== '""' && /[\p{L}\p{N}]/u.test(c) && visible(e)) pseudo.push({el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''), p, content: c.slice(0, 60)}); }
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id), duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  const langs = [...document.querySelectorAll('[lang]')].map(e => `${e.tagName.toLowerCase()}=${e.lang}`);
  return {title: document.title, lang: document.documentElement.lang, doctype: !!document.doctype, headings, landmarks, links, images, iframes, media, tables, fields, groups, live, pseudo: pseudo.slice(0, 40), duplicateIds, langs,
    overflowX: document.scrollingElement.scrollWidth - innerWidth, openDialog: document.querySelector('dialog[open]')?.id || ''};
}

// Contrastes des composants d'interface (RGAA 3.3) : bordure ou ombre portée contre le fond effectif.
function uiContrast() {
  const rgb = s => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s || ''); return m ? {r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4]} : null; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
  const bg = e => { for (let n = e.parentElement; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c && c.a > 0.5) return c; } return {r: 255, g: 255, b: 255}; };
  const res = [];
  for (const e of document.querySelectorAll('input:not([type=hidden]),select,textarea,button,summary')) {
    if (!e.checkVisibility?.() || !e.getClientRects().length) continue;
    const s = getComputedStyle(e), shadow = /(rgba?\([^)]+\))/.exec(s.boxShadow)?.[1];
    const own = rgb(s.backgroundColor), back = bg(e);
    const edges = [];
    if (parseFloat(s.borderBottomWidth) > 0 && s.borderBottomStyle !== 'none') edges.push(['bordure', rgb(s.borderBottomColor)]);
    if (shadow) edges.push(['ombre', rgb(shadow)]);
    if (own && own.a > 0.5) edges.push(['fond', own]);
    const best = edges.filter(([, c]) => c && c.a > 0.5).map(([k, c]) => [k, ratio(c, back)]).sort((a, b) => b[1] - a[1])[0];
    res.push({el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').slice(0, 2).join('.') : ''), text: (e.textContent || e.labels?.[0]?.textContent || '').trim().slice(0, 40), best: best || ['aucun', 1]});
  }
  return res;
}

async function axe(page, axeSource) {
  if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({content: axeSource});
  return page.evaluate(async () => {
    const r = await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']}, resultTypes: ['violations', 'incomplete']});
    const slim = list => list.map(v => ({id: v.id, impact: v.impact, tags: v.tags.filter(t => /^wcag|best/.test(t)), help: v.help, nodes: v.nodes.map(n => ({target: n.target.join(' '), html: n.html.slice(0, 160), summary: (n.failureSummary || '').slice(0, 240)}))}));
    return {version: axe.version, violations: slim(r.violations), incomplete: slim(r.incomplete), passes: r.passes.length};
  });
}

// Parcours à la tabulation depuis le haut du document (ou depuis le dialogue ouvert).
async function tabWalk(page, max = 160) {
  await page.evaluate(() => { const d = document.querySelector('dialog[open]'); if (!d) { const start = document.createElement('div'); start.tabIndex = -1; start.id = 'audit-start'; document.body.prepend(start); start.focus(); } });
  const steps = [], seen = new Map();
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body) return {tag: 'body'};
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      const indicator = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow !== 'none' && /inset|0px 0px 0px [1-9]/.test(s.boxShadow) === false ? s.boxShadow !== 'none' : s.boxShadow !== 'none');
      if (!e.dataset.auditTab) e.dataset.auditTab = String(window.__auditTab = (window.__auditTab || 0) + 1); const key = e.dataset.auditTab;
      const label = (e.getAttribute('aria-label') || e.labels?.[0]?.textContent || e.textContent || e.title || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      return {tag: e.tagName.toLowerCase(), key, label, visible: e.checkVisibility() && r.width > 0 && r.height > 0, inViewport: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
        indicator, outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} offset ${s.outlineOffset}`, inDialog: e.closest('dialog')?.id || '', iframe: e.tagName === 'IFRAME'};
    });
    if (f.tag === 'body') { steps.push(f); break; }
    if (seen.has(f.key)) { steps.push({...f, wrap: true}); break; }
    seen.set(f.key, i); steps.push(f);
  }
  await page.evaluate(() => document.getElementById('audit-start')?.remove());
  return steps;
}

async function state(page, name, axeSource, opts = {}) {
  const facts = await page.evaluate(domFacts);
  const a = await axe(page, axeSource);
  const contrast = opts.contrast ? await page.evaluate(uiContrast) : undefined;
  const tabs = opts.tabs === false ? undefined : await tabWalk(page, opts.max);
  return {name, facts, axe: a, contrast, tabs};
}

// Adaptations de présentation (RGAA 10.4, 10.11, 10.12) : texte agrandi et espacement, contenu tronqué ou chevauché.
function clipping() {
  const visible = e => e.checkVisibility?.() !== false && e.getClientRects().length > 0;
  const issues = [];
  for (const e of document.querySelectorAll('body *')) {
    if (!visible(e) || e.closest('dialog:not([open])')) continue;
    const s = getComputedStyle(e);
    const clipX = /hidden|clip/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 2, clipY = /hidden|clip/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2;
    if ((clipX || clipY) && e.textContent.trim() && !e.classList.contains('sr-only')) issues.push({el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ').slice(0, 2).join('.') : ''), clipX, clipY, text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 60)});
  }
  return {overflowX: document.scrollingElement.scrollWidth - innerWidth, issues: issues.slice(0, 30), count: issues.length};
}
const SPACING = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';

// Contenu de l'iframe d'aperçu du courriel : structure exposée par la page (tableaux de mise en page, images, liens, langue).
async function previewFacts(page, selector) {
  const frame = page.frameLocator(selector);
  return frame.locator('html').evaluate(html => {
    const d = html.ownerDocument;
    const tables = [...d.querySelectorAll('table')], layout = tables.filter(t => t.getAttribute('role') === 'presentation');
    const dataLike = tables.filter(t => t.getAttribute('role') !== 'presentation').map(t => ({th: t.querySelectorAll('th').length, caption: !!t.querySelector('caption'), summary: t.outerHTML.slice(0, 120)}));
    const imgs = [...d.querySelectorAll('img')].map(i => ({alt: i.getAttribute('alt'), src: (i.getAttribute('src') || '').slice(0, 50), role: i.getAttribute('role') || ''}));
    const links = [...d.querySelectorAll('a[href]')].map(a => ({name: (a.getAttribute('aria-label') || a.textContent || a.querySelector('img')?.alt || '').trim().replace(/\s+/g, ' ').slice(0, 70), href: (a.getAttribute('href') || '').slice(0, 60)}));
    const headings = [...d.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')].map(h => `${h.tagName} ${h.textContent.trim().slice(0, 60)}`);
    return {lang: html.lang, title: d.title, tables: tables.length, layoutTables: layout.length, dataLike, imgs, links, headings};
  });
}

async function dialogCheck(page, trigger, dialogId, close = 'Escape') {
  const before = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120));
  await trigger();
  await page.locator(`#${dialogId}[open]`).waitFor();
  await page.waitForTimeout(150);
  const opened = await page.evaluate(id => { const d = document.getElementById(id), e = document.activeElement; return {modal: d.matches(':modal'), focus: e === d ? 'dialogue' : (e.id || e.tagName.toLowerCase()) + ' « ' + (e.textContent || '').trim().slice(0, 50) + ' »', inside: d.contains(e), name: document.getElementById(d.getAttribute('aria-labelledby'))?.textContent.trim(), description: (d.getAttribute('aria-describedby') || '').split(' ').map(x => document.getElementById(x)?.textContent.trim().slice(0, 120))}; }, dialogId);
  return {before, opened, close: async () => {
    if (close === 'Escape') await page.keyboard.press('Escape'); else await close();
    await page.waitForTimeout(200);
    return page.evaluate(id => { const e = document.activeElement; return {closed: !document.getElementById(id).open, focus: (e.id || e.getAttribute('data-action') || e.tagName.toLowerCase()) + ' « ' + (e.textContent || '').trim().slice(0, 50) + ' »'}; }, dialogId);
  }};
}

(async () => {
  await fs.mkdir(out, {recursive: true});
  const axeSource = await fs.readFile(axePath, 'utf8'), browser = await chromium.launch({channel: 'chromium', args: ['--lang=fr-FR']}), {server, url} = await serve(), results = [], errors = [];
  const fresh = async (opts = {}) => { const context = await browser.newContext({bypassCSP: true, viewport: {width: 1280, height: 900}, locale: 'fr-FR', colorScheme: 'light', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'], ...opts}); const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message)); return {context, page}; };
  const push = r => { results.push(r); console.log('collecté :', r.name); };
  try {
    // E01 Accueil de première visite, 1280 px, avec contrastes.
    const {context, page} = await fresh();
    await page.goto(url); await ready(page); await page.locator('#welcome').waitFor({state: 'visible'});
    push(await state(page, 'E01 accueil, première visite, 1280 px', axeSource, {contrast: true}));
    // Lien d'évitement : premier arrêt et cible.
    await page.goto(url); await ready(page); await page.keyboard.press('Tab');
    const skip = await page.evaluate(() => document.activeElement.textContent.trim()); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    push({name: 'lien d’évitement', first: skip, after: await page.evaluate(() => document.activeElement.id || document.activeElement.tagName)});
    // E02 Dialogue d'aperçu d'un exemple.
    const ex = await dialogCheck(page, () => page.getByRole('button', {name: 'Prévisualiser l’exemple « Information de service »'}).click(), 'example-dialog');
    const exState = await state(page, 'E02 dialogue « aperçu d’exemple »', axeSource, {max: 30});
    exState.dialog = {...ex.opened, before: ex.before, preview: await page.locator('#example-frame iframe').count() ? await previewFacts(page, '#example-frame iframe') : null};
    exState.dialog.afterClose = await ex.close(); push(exState);
    // E03 Dialogue « Tout effacer » (accueil vide : vérifier s'il s'ouvre).
    // E04 Éditeur après création depuis un exemple.
    await page.getByRole('button', {name: 'Créer à partir de cet exemple « Lettre d’information »'}).click();
    await page.locator('#editor-page').waitFor({state: 'visible'}); await saved(page);
    await page.locator('#block-list [data-select]').nth(3).click(); await page.waitForTimeout(200);
    const ed = await state(page, 'E04 éditeur, bloc 4 sélectionné, 1280 px', axeSource, {contrast: true, max: 220});
    ed.preview = await previewFacts(page, '#preview'); push(ed);
    // E05 Erreurs de saisie : nom vide, adresse invalide.
    await page.locator('#document-name').fill(''); await page.locator('#document-name').blur();
    const url1 = page.locator('#block-editor input[type=url]').first(); await url1.fill('pas une adresse'); await url1.blur(); await page.waitForTimeout(300);
    push({name: 'E05 erreurs de saisie (nom vide, adresse invalide)', facts: await page.evaluate(domFacts), axe: await axe(page, axeSource),
      errors: await page.evaluate(() => [...document.querySelectorAll('[aria-invalid=true]')].map(e => ({id: e.id, label: e.labels?.[0]?.textContent.trim(), message: (e.getAttribute('aria-describedby') || '').split(' ').map(id => document.getElementById(id)?.textContent.trim()).filter(Boolean), color: getComputedStyle(document.getElementById('error-' + e.id) || e).color}))),
      alert: await page.evaluate(() => ({error: document.getElementById('error').textContent, notice: document.getElementById('notice').textContent}))});
    await page.locator('[data-action=cancel-fields]').click().catch(() => {}); await page.locator('#document-name').fill('Lettre du service'); await saved(page);
    // E06 Catalogue ouvert, recherche, sélection.
    await page.locator('summary', {hasText: 'Ajouter un composant'}).click();
    await page.locator('#catalogue-search').fill('bouton'); await page.waitForTimeout(300);
    const status = await page.evaluate(() => document.getElementById('catalogue-status').textContent);
    await page.locator('#catalogue').focus(); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(300);
    const cat = await state(page, 'E06 catalogue ouvert, recherche « bouton », composant choisi', axeSource, {tabs: false});
    cat.catalogueStatus = status; cat.catalogueFocusAfterArrow = await page.evaluate(() => ({focus: document.activeElement.id, value: document.getElementById('catalogue').value, help: document.getElementById('catalogue-add-help').textContent}));
    cat.preview = await page.locator('#catalogue-preview').isVisible() ? await previewFacts(page, '#catalogue-preview') : null;
    await page.locator('#catalogue-add').click(); await page.waitForTimeout(300);
    cat.afterAdd = await page.evaluate(() => ({focus: document.activeElement.id || document.activeElement.tagName, notice: document.getElementById('notice').textContent, announce: document.getElementById('save-announce').textContent}));
    push(cat);
    // E07 Retrait d'un bloc et annonce.
    await page.locator('[data-block-action=remove]').click(); await page.waitForTimeout(300);
    push({name: 'E07 retrait d’un bloc', after: await page.evaluate(() => ({focus: (document.activeElement.id || document.activeElement.tagName) + ' « ' + document.activeElement.textContent.trim().slice(0, 40) + ' »', notice: document.getElementById('notice').textContent}))});
    // Clavier sur la liste : déplacer à la position (alternative au glisser).
    await page.locator('#block-list [data-drag-handle]').nth(2).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    push({name: 'E07b poignée de déplacement au clavier', after: await page.evaluate(() => ({focus: (document.activeElement.id || document.activeElement.getAttribute('data-block-action') || document.activeElement.tagName) + ' « ' + document.activeElement.textContent.trim().slice(0, 50) + ' »', notice: document.getElementById('notice').textContent}))});
    await page.keyboard.press('Escape');
    // E08 Dialogue « Vérifier avant de copier ».
    const ck = await dialogCheck(page, () => page.getByRole('button', {name: 'Copier le courriel'}).click(), 'check-dialog');
    const ckState = await state(page, 'E08 dialogue « Vérifier avant de copier »', axeSource, {max: 40}); ckState.dialog = {...ck.opened, before: ck.before}; ckState.dialog.afterClose = await ck.close(); push(ckState);
    // E09 Dialogue de suppression de la newsletter.
    const del = await dialogCheck(page, () => page.locator('[data-action=remove-document]').click(), 'library-dialog');
    const delState = await state(page, 'E09 dialogue « Supprimer la newsletter »', axeSource, {max: 20}); delState.dialog = {...del.opened, before: del.before}; delState.dialog.afterClose = await del.close(); push(delState);
    // E10 Identité : enregistrer puis appliquer (dialogue de confirmation).
    await page.locator('summary', {hasText: 'Identités de service'}).click();
    await page.locator('#identity-name').fill('Service test'); await page.locator('[data-action=save-identity]').click(); await page.waitForTimeout(300);
    await page.locator('#identities').selectOption({index: 1});
    const id = await dialogCheck(page, () => page.locator('[data-action=use-identity]').click(), 'identity-dialog');
    const idState = await state(page, 'E10 dialogue « Appliquer une identité de service »', axeSource, {max: 20}); idState.dialog = {...id.opened, before: id.before}; idState.dialog.afterClose = await id.close(); push(idState);
    // E11 Sauvegarde et import ouverts, Importer du JSON ouvert, JSON invalide.
    await page.locator('summary', {hasText: 'Sauvegarde et import'}).click(); await page.locator('summary', {hasText: 'Importer du JSON'}).click();
    await page.locator('#json-input').fill('{ pas du json'); await page.locator('[data-action=json-import]').click(); await page.waitForTimeout(300);
    const imp = await state(page, 'E11 sauvegarde et import ouverts, JSON invalide importé', axeSource, {tabs: false});
    imp.after = await page.evaluate(() => ({focus: document.activeElement.id || document.activeElement.tagName, error: document.getElementById('error').textContent, errorHidden: document.getElementById('error').hidden, notice: document.getElementById('notice').textContent, textareaInvalid: document.getElementById('json-input').getAttribute('aria-invalid')}));
    push(imp);
    // E12 Restauration : export de la bibliothèque, puis restauration du fichier (dialogue de confirmation).
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-action=export-library]').click()]);
    const backup = path.join(out, 'sauvegarde.json'); await download.saveAs(backup);
    const rs = await dialogCheck(page, () => page.locator('#restore-input').setInputFiles(backup), 'restore-dialog');
    const rsState = await state(page, 'E12 dialogue « Remplacer toutes vos newsletters ? »', axeSource, {max: 20}); rsState.dialog = {...rs.opened, before: rs.before}; rsState.dialog.afterClose = await rs.close(); push(rsState);
    // E13 Accueil avec newsletters, puis « Tout effacer ».
    await page.locator('#library-back').click(); await page.waitForTimeout(300);
    const home = await state(page, 'E13 accueil avec newsletters', axeSource, {max: 120});
    const rz = await dialogCheck(page, () => page.locator('[data-action=reset-library]').click(), 'reset-dialog');
    home.resetDialog = {...rz.opened, axe: await axe(page, axeSource)}; home.resetDialog.afterClose = await rz.close(); push(home);
    // E14 Deuxième fenêtre : lecture seule.
    const second = await context.newPage(); await second.goto(url); await second.waitForTimeout(1500);
    const ro = await second.evaluate(() => ({readOnly: !document.getElementById('read-only').hidden, focus: document.activeElement.id || document.activeElement.tagName, message: document.getElementById('read-only-message').textContent.slice(0, 160)}));
    const firstRo = await page.evaluate(() => ({readOnly: !document.getElementById('read-only').hidden, message: document.getElementById('read-only-message').textContent.slice(0, 160)}));
    push({name: 'E14 deuxième fenêtre sur le même navigateur', second: ro, first: firstRo, axeSecond: await axe(second, axeSource), axeFirst: await axe(page, axeSource)});
    await second.close();
    // Validité du code (RGAA 8.2) : DOM rendu de l'éditeur et de l'accueil.
    await page.getByRole('button', {name: 'Créer à partir de cet exemple « Invitation »'}).click().catch(() => {}); await page.locator('#editor-page').waitFor({state: 'visible'}).catch(() => {});
    await fs.writeFile(path.join(out, 'dom-editeur.html'), '<!doctype html>\n' + await page.evaluate(() => document.documentElement.outerHTML));
    await context.close();

    // E15 à 320 px : accueil et éditeur.
    for (const width of [320]) {
      const {context: c2, page: p2} = await fresh({viewport: {width, height: 800}});
      await p2.goto(url); await ready(p2);
      const r = await state(p2, `E15 accueil, ${width} px`, axeSource, {tabs: false}); r.clip = await p2.evaluate(clipping); push(r);
      await p2.getByRole('button', {name: 'Créer à partir de cet exemple « Lettre d’information »'}).click(); await p2.locator('#editor-page').waitFor({state: 'visible'}); await saved(p2);
      await p2.locator('#block-list [data-select]').nth(3).click();
      const r2 = await state(p2, `E16 éditeur, ${width} px`, axeSource, {tabs: false}); r2.clip = await p2.evaluate(clipping); push(r2);
      await c2.close();
    }
    // E17 Texte agrandi à 200 % (racine à 32 px) et espacement du texte, 1280 px.
    for (const [label, css] of [['E17 texte à 200 %', 'html { font-size: 200% !important; }'], ['E18 espacement du texte (10.12)', SPACING]]) {
      const {context: c3, page: p3} = await fresh();
      await p3.goto(url); await ready(p3); await p3.addStyleTag({content: css}); await p3.waitForTimeout(200);
      const home3 = await p3.evaluate(clipping);
      await p3.getByRole('button', {name: 'Créer à partir de cet exemple « Lettre d’information »'}).click(); await p3.locator('#editor-page').waitFor({state: 'visible'}); await saved(p3);
      await p3.locator('#block-list [data-select]').nth(3).click(); await p3.waitForTimeout(200);
      await p3.locator('summary', {hasText: 'Ajouter un composant'}).click();
      push({name: label, home: home3, editor: await p3.evaluate(clipping)});
      await c3.close();
    }
    // E19 Sans feuilles de style (10.3) : ordre et contenus générés.
    { const {context: c4, page: p4} = await fresh(); await p4.goto(url); await ready(p4);
      await p4.evaluate(() => document.querySelectorAll('style,link[rel=stylesheet]').forEach(s => s.disabled = true || s.remove()));
      push({name: 'E19 feuilles de style désactivées', text: await p4.evaluate(() => document.body.innerText.split('\n').filter(Boolean).slice(0, 40)), hiddenStillHidden: await p4.evaluate(() => [...document.querySelectorAll('[hidden]')].filter(e => e.getClientRects().length).length)});
      await c4.close(); }
    // E20 Thème sombre du système, contrastes axe.
    { const {context: c5, page: p5} = await fresh({colorScheme: 'dark'}); await p5.goto(url); await ready(p5);
      push({name: 'E20 préférence système sombre', theme: await p5.evaluate(() => document.documentElement.dataset.frTheme), axe: await axe(p5, axeSource)});
      await c5.close(); }
  } catch (error) { errors.push('COLLECTE : ' + error.stack); console.error(error); }
  finally { await browser.close(); server.close(); }
  await fs.writeFile(path.join(out, 'observations.json'), JSON.stringify({collected: new Date().toISOString(), url: 'http://127.0.0.1:<port>/ (app/distribution/web)', errors, results}, null, 2));
  console.log('erreurs de page :', errors.length, errors.slice(0, 5));
})();
