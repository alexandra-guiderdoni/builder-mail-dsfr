const test = require('node:test'), path = require('node:path');
const {root, evidence, portable, fs, assert} = require('./browser-support.cjs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Largeurs de la reproduction de #39, de 620 à 320 pixels, et 800 pixels.
const widths = [620, 619, 601, 600, 481, 480, 390, 320, 800], longWidths = [619, 320];

function inspectCopy() {
  // Largeur utile hors barre de défilement classique éventuelle.
  const width = document.documentElement.clientWidth, problems = [];
  const describe = e => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '');
  // Sans styles de tête, la copie masque seulement les variantes d’image pour fond sombre.
  const intended = e => e.closest('.hide-white');
  const outside = r => r.left < -1 || r.right > width + 1;
  for (const element of document.body.querySelectorAll('*')) {
    if (intended(element)) continue;
    const style = getComputedStyle(element);
    if (style.display === 'none') problems.push('masqué ' + describe(element));
    else if (style.visibility !== 'visible') problems.push('invisible ' + describe(element));
    if ((style.overflowX !== 'visible' || style.overflowY !== 'visible') && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)) problems.push('coupé ' + describe(element));
  }
  // Une table imbriquée plus large que sa cellule empiète sur ses voisines sans déborder de la page.
  for (const table of document.body.querySelectorAll('table')) {
    const cell = table.parentElement.closest('td');
    if (!cell || intended(table)) continue;
    const r = table.getBoundingClientRect(), c = cell.getBoundingClientRect();
    if (r.left < c.left - 1 || r.right > c.right + 1) problems.push(`table de ${Math.round(r.width)} px dans une cellule de ${Math.round(c.width)} px`);
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
  for (const image of document.images) {
    if (intended(image)) continue;
    const r = image.getBoundingClientRect(); images++;
    if (!image.complete || !image.naturalWidth) problems.push('image non chargée');
    else if (!r.width || !r.height) problems.push('image non rendue');
    else if (outside(r)) problems.push('image hors champ');
  }
  return {overflow: document.documentElement.scrollWidth - width, texts, images, problems};
}

test('la copie des 52 composants tient sans débordement ni contenu masqué ou coupé sous Chromium et WebKit', async t => {
  const image = 'data:image/png;base64,' + (await fs.readFile(path.join(root, 'app/assets/icon-192.png'))).toString('base64');
  const receipt = {widths, longWidths, variants: ['normal', 'long', 'mail-31 texte seul', 'mail-50 liens supplémentaires'], styleSheetsRemoved: true, mailClientExecuted: false, engines: {}};
  try {
    for (const engine of ['chromium', 'webkit']) await t.test(engine, async () => {
      const browser = await playwright[engine].launch();
      const failures = [];
      let cases = 0;
      try {
        const context = await browser.newContext({offline: true, colorScheme: 'light', viewport: {width: 1600, height: 1000}});
        const page = await context.newPage();
        await page.goto(portable); await page.waitForFunction(() => window.MailBuilder?.ready);
        const documents = await page.evaluate(([image, longWidths]) => {
          const M = MailBuilder.Model, R = MailBuilder.Render, entries = [];
          for (let index = 0; index < 52; index++) {
            const normal = M.create('Recette de copie', [index]), doc = M.create('Recette de copie longue', [index]);
            const block = doc.blocks[0], definition = M.component(block.component);
            for (const field of definition.fields) {
              if (field.type === 'text') block.values[field.key] = 'Présentation détaillée du dossier et des décisions à partager. '.repeat(4) + 'DossierSansEspaces'.repeat(8);
              if (field.type === 'image') block.values[field.key] = image;
            }
            block.source = 'https://exemple.invalid/' + 'parcours'.repeat(20); block.sourceLabel = 'ConsulterLeDossier'.repeat(10);
            entries.push({component: block.component, variant: 'normal', html: R.clipboardHtml(normal)}, {component: block.component, variant: 'long', html: R.clipboardHtml(doc), widths: longWidths});
          }
          // Variantes produites par le rendu lui-même, dans un cadre de 620, 600 et 496 pixels.
          const index = id => MailBuilder.catalog.components.findIndex(c => c.id === id);
          const article = M.create('Recette de copie', [index('mail-31')]);
          Object.assign(article.blocks[0].values, {f0: '', f1: '', f2: 'Avant-titre de recette', f3: 'https://exemple.invalid/article', f4: 'Un article sans illustration', f5: 'Détail utile de cet article', f6: 'Mention de fin'});
          const footer = M.create('Recette de copie', [index('mail-50')]);
          footer.blocks[0].additionalLinks = [{url: 'https://exemple.invalid/desabonnement', label: 'Se désabonner'}, {url: 'mailto:contact@exemple.invalid', label: 'Nous contacter'}];
          entries.push({component: 'mail-31', variant: 'texte seul', html: R.clipboardHtml(article)}, {component: 'mail-50', variant: 'liens supplémentaires', html: R.clipboardHtml(footer)});
          return entries;
        }, [image, longWidths]);
        const display = await context.newPage();
        for (const width of widths) for (const doc of documents) {
          if (doc.widths && !doc.widths.includes(width)) continue;
          const variant = doc.variant;
          await display.setViewportSize({width, height: 900});
          await display.setContent(doc.html);
          await display.locator('style,link').evaluateAll(nodes => nodes.forEach(e => e.remove()));
          await display.waitForFunction(() => [...document.images].every(i => i.complete));
          const result = await display.evaluate(inspectCopy); cases++;
          const reasons = [...(result.overflow > 1 ? [`débordement de ${result.overflow} px`] : []), ...(result.texts ? [] : ['aucun texte rendu']), ...result.problems];
          if (reasons.length) failures.push(`${doc.component} ${variant} ${width} px : ${reasons.slice(0, 3).join(' ; ')}`);
        }
        await context.close();
        receipt.engines[engine] = {version: browser.version(), cases, failures: failures.length, examples: failures.slice(0, 10)};
      } finally { await browser.close(); }
      assert.equal(failures.length, 0, `${engine} : ${failures.length} cas en échec sur ${cases}, dont ${failures.slice(0, 4).join(' | ')}`);
    });
  } finally {
    await fs.mkdir(evidence, {recursive: true});
    await fs.writeFile(path.join(evidence, 'mail-copy-engines.json'), JSON.stringify(receipt, null, 2));
  }
});
