const test = require('node:test'), path = require('node:path');
const {root, evidence, open, expand, click, fs, assert} = require('./browser-support.cjs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Largeurs de l’issue #38 sans styles de tête ; seuils responsive du gabarit avec ces styles.
const bareWidths = [320, 600, 800], styledWidths = [1024, 800, 620, 619, 601, 600, 481, 480, 390, 320], longStyledWidths = [1024, 619, 601, 320];

function inspectBare(ratios) {
  const width = document.documentElement.clientWidth, problems = [];
  const describe = e => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '');
  // Sans styles de tête, seules les variantes du logo pour fond sombre restent masquées.
  const intended = e => e.closest('.hide-white');
  const outside = r => r.left < -1 || r.right > width + 1;
  for (const element of document.body.querySelectorAll('*')) {
    if (intended(element)) continue;
    const style = getComputedStyle(element);
    if (style.display === 'none') problems.push('masqué ' + describe(element));
    else if (style.visibility !== 'visible') problems.push('invisible ' + describe(element));
    if ((style.overflowX !== 'visible' || style.overflowY !== 'visible') && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)) problems.push('coupé ' + describe(element));
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let texts = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode, value = node.data.replace(/\s+/g, ' ').trim();
    if (!value || intended(node.parentElement)) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter(r => r.width && r.height);
    texts++;
    if (!rects.length) problems.push('texte non rendu « ' + value.slice(0, 40) + ' »');
    else if (rects.some(outside)) problems.push('texte hors champ « ' + value.slice(0, 40) + ' »');
  }
  let images = 0;
  for (const [index, image] of [...document.images].entries()) {
    if (intended(image)) continue;
    const r = image.getBoundingClientRect(), cell = (image.closest('td') || image).getBoundingClientRect(); images++;
    if (!image.complete || !image.naturalWidth) problems.push('image non chargée');
    else if (!r.width || !r.height) problems.push('image non rendue');
    else if (outside(r)) problems.push('image hors champ');
    else if (r.left < cell.left - 1 || r.right > cell.right + 1) problems.push(`image de ${Math.round(r.width)} px dans une cellule de ${Math.round(cell.width)} px`);
    else if (ratios[index] && Math.abs(r.width / r.height - ratios[index]) > 0.03 * ratios[index]) problems.push(`image déformée : ${Math.round(r.width)} × ${Math.round(r.height)} px`);
  }
  // Des colonnes rétrécies ne doivent pas superposer textes et images.
  const rectangles = container => {
    const rects = [...container.querySelectorAll('img')].filter(i => !intended(i)).flatMap(e => [...e.getClientRects()]);
    const nodes = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    while (nodes.nextNode()) if (nodes.currentNode.data.trim() && !intended(nodes.currentNode.parentElement)) {
      const range = document.createRange(); range.selectNodeContents(nodes.currentNode); rects.push(...range.getClientRects());
    }
    return rects.filter(r => r.width && r.height);
  };
  for (const table of document.querySelectorAll('[data-mail-columns]')) {
    const cells = [...table.querySelectorAll(':scope>tbody>tr>td[data-mail-column]')].map(rectangles);
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) for (const a of cells[i]) for (const b of cells[j]) {
      if (Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1) problems.push('colonnes superposées');
    }
  }
  const visible = e => { for (let n = e; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).display === 'none') return false; return true; };
  const logos = {light: [...document.querySelectorAll('img.hide-black')], dark: [...document.querySelectorAll('img.hide-white')]};
  if (logos.light.some(i => !visible(i))) problems.push('logo pour fond clair masqué');
  if (logos.dark.some(visible)) problems.push('logo pour fond sombre visible');
  return {overflow: document.documentElement.scrollWidth - width, texts, images, logos: {light: logos.light.filter(visible).length, dark: logos.dark.filter(visible).length}, problems: [...new Set(problems)]};
}

// Le HTML téléchargé ne diffère du rendu dérivé que par des déclarations ajoutées à la fin des attributs style.
function structure(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html'), styles = [];
  for (const element of doc.querySelectorAll('*')) { styles.push(element.getAttribute('style') || ''); element.removeAttribute('style'); }
  return {markup: doc.documentElement.outerHTML, styles};
}

test('l’export téléchargé tient sans styles de tête et garde son rendu avec ces styles sous Chromium et WebKit', async t => {
  const image = 'data:image/png;base64,' + (await fs.readFile(path.join(root, 'app/assets/icon-192.png'))).toString('base64');
  const receipt = {bareWidths, styledWidths, longStyledWidths, variants: ['normal', 'long', 'mail-31 texte seul', 'mail-50 liens supplémentaires'], source: 'bouton « Télécharger le HTML »', comparedWith: 'Render.html, rendu dérivé', mailClientExecuted: false, engines: {}};
  try {
    for (const engine of ['chromium', 'webkit']) await t.test(engine, async () => {
      const browser = await playwright[engine].launch();
      const failures = [], logoCounts = {};
      let bare = 0, styled = 0, identical = 0;
      try {
        const {page, context} = await open(browser, {offline: true});
        await expand(page, 'Fichiers et récupération');
        const cases = await page.evaluate(image => {
          const M = MailBuilder.Model, entries = [];
          const index = id => MailBuilder.catalog.components.findIndex(c => c.id === id);
          for (let component = 0; component < 52; component++) {
            const normal = M.create('Recette d’export', [component]), doc = M.create('Recette d’export longue', [component]);
            const block = doc.blocks[0], definition = M.component(block.component);
            for (const field of definition.fields) {
              if (field.type === 'text') block.values[field.key] = 'Présentation détaillée du dossier et des décisions à partager. '.repeat(4) + 'DossierSansEspaces'.repeat(8);
              if (field.type === 'image') block.values[field.key] = image;
            }
            block.source = 'https://exemple.invalid/' + 'parcours'.repeat(20); block.sourceLabel = 'ConsulterLeDossier'.repeat(10);
            entries.push({component: block.component, variant: 'normal', doc: normal}, {component: block.component, variant: 'long', doc});
          }
          const article = M.create('Recette d’export', [index('mail-31')]);
          Object.assign(article.blocks[0].values, {f0: '', f1: '', f2: 'Avant-titre de recette', f3: 'https://exemple.invalid/article', f4: 'Un article sans illustration', f5: 'Détail utile de cet article', f6: 'Mention de fin'});
          const footer = M.create('Recette d’export', [index('mail-50')]);
          footer.blocks[0].additionalLinks = [{url: 'https://exemple.invalid/desabonnement', label: 'Se désabonner'}, {url: 'mailto:contact@exemple.invalid', label: 'Nous contacter'}];
          entries.push({component: 'mail-31', variant: 'texte seul', doc: article}, {component: 'mail-50', variant: 'liens supplémentaires', doc: footer});
          return entries;
        }, image);
        const display = await context.newPage();
        const loaded = () => display.waitForFunction(() => [...document.images].every(i => i.complete));
        for (const item of cases) {
          const name = `${item.component} ${item.variant}`;
          // Rendu dérivé du document actif, celui que le bouton exporte.
          item.derived = await page.evaluate(doc => { const A = MailBuilder; A.library.documents.find(d => d.id === A.library.activeId).blocks = doc.blocks; return A.Render.html(A.doc()); }, item.doc);
          const event = page.waitForEvent('download'); await click(page, '[data-action=export-mail]');
          const exported = await fs.readFile(await (await event).path(), 'utf8');
          const shapes = await page.evaluate(([structure, a, b]) => { const f = (0, eval)('(' + structure + ')'); return [f(a), f(b)]; }, [structure.toString(), exported, item.derived]);
          if (shapes[0].markup !== shapes[1].markup) failures.push(`${name} : balisage, textes, liens ou images modifiés`);
          else if (shapes[0].styles.some((style, i) => !style.startsWith(shapes[1].styles[i]))) failures.push(`${name} : déclaration de style d’origine modifiée`);
          // Proportions des images dans le rendu dérivé, styles de tête présents.
          await display.emulateMedia({colorScheme: 'light'}); await display.setViewportSize({width: 1024, height: 900});
          await display.setContent(item.derived); await loaded();
          const ratios = await display.evaluate(() => [...document.images].map(i => { const r = i.getBoundingClientRect(); return r.width && r.height ? r.width / r.height : null; }));
          for (const width of bareWidths) {
            await display.emulateMedia({colorScheme: 'light'}); await display.setViewportSize({width, height: 900});
            await display.setContent(exported); await display.locator('style,link').evaluateAll(nodes => nodes.forEach(e => e.remove())); await loaded();
            const result = await display.evaluate(inspectBare, ratios); bare++;
            if (result.logos.light) logoCounts[item.component] = result.logos;
            const reasons = [...(result.overflow > 1 ? [`débordement de ${result.overflow} px`] : []), ...(result.texts ? [] : ['aucun texte rendu']), ...result.problems];
            if (reasons.length) failures.push(`${name} ${width} px sans styles de tête : ${reasons.slice(0, 3).join(' ; ')}`);
          }
          for (const scheme of ['light', 'dark']) for (const width of item.variant === 'long' ? longStyledWidths : styledWidths) {
            await display.emulateMedia({colorScheme: scheme}); await display.setViewportSize({width, height: 900});
            await display.setContent(item.derived); await loaded(); const before = await display.screenshot({fullPage: true});
            await display.setContent(exported); await loaded(); const after = await display.screenshot({fullPage: true}); styled++;
            if (before.equals(after)) identical++; else failures.push(`${name} ${scheme} ${width} px avec styles de tête : rendu différent du rendu dérivé`);
            if (scheme === 'dark' && width === 390) {
              const logos = await display.evaluate(() => ({light: [...document.querySelectorAll('img.hide-black')].filter(i => i.getClientRects().length).length, dark: [...document.querySelectorAll('img.hide-white')].filter(i => i.getClientRects().length).length, total: document.querySelectorAll('img.hide-white').length}));
              if (logos.light || logos.dark !== logos.total) failures.push(`${name} sombre avec styles de tête : variantes du logo inversées`);
            }
          }
        }
        // Témoin : la forme copiée, alignée et dimensionnée autrement, doit être refusée par la comparaison.
        const copy = await page.evaluate(() => MailBuilder.Render.clipboardHtml(MailBuilder.Model.create('Témoin', [19])));
        const derived = await page.evaluate(() => MailBuilder.Render.html(MailBuilder.Model.create('Témoin', [19])));
        await display.emulateMedia({colorScheme: 'light'}); await display.setViewportSize({width: 1024, height: 900});
        await display.setContent(derived); const witness = await display.screenshot({fullPage: true});
        await display.setContent(copy); assert(!witness.equals(await display.screenshot({fullPage: true})), `${engine} : la comparaison ne distingue pas la forme copiée`);
        await context.close();
        receipt.engines[engine] = {version: browser.version(), bareCases: bare, styledCases: styled, pixelIdentical: identical, logos: logoCounts, failures: failures.length, examples: failures.slice(0, 10)};
      } finally { await browser.close(); }
      assert.equal(failures.length, 0, `${engine} : ${failures.length} échecs (${bare} cas sans styles de tête, ${styled} avec), dont ${failures.slice(0, 4).join(' | ')}`);
    });
  } finally {
    await fs.mkdir(evidence, {recursive: true});
    await fs.writeFile(path.join(evidence, 'mail-export-engines.json'), JSON.stringify(receipt, null, 2));
  }
});
