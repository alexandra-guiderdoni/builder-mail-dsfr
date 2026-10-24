const test = require('node:test'), path = require('node:path');
const {root, evidence, open, expand, click, saved, chromium, fs, assert} = require('./browser-support.cjs');

function inspect() {
  const forbidden = new Set('align alink background bgcolor border cellpadding cellspacing char charoff clear color compact frameborder hspace link marginheight marginwidth text valign vlink vspace size width height'.split(' '));
  const attributes = [];
  for (const element of document.querySelectorAll('*')) for (const {name} of element.attributes) {
    if (!forbidden.has(name) || (name === 'size' && element.tagName === 'SELECT') || (['width', 'height'].includes(name) && ['IMG', 'OBJECT', 'EMBED', 'CANVAS', 'SVG'].includes(element.tagName))) continue;
    attributes.push(element.tagName + '[' + name + ']');
  }
  const rectangles = container => {
    const rects = [...container.querySelectorAll('img')].flatMap(e => [...e.getClientRects()]);
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) if (walker.currentNode.textContent.trim()) {
      const range = document.createRange(); range.selectNodeContents(walker.currentNode); rects.push(...range.getClientRects());
    }
    return rects.filter(r => r.width && r.height);
  };
  let overlaps = 0;
  for (const table of document.querySelectorAll('[data-mail-columns]')) {
    const cells = [...table.querySelectorAll(':scope>tbody>tr>td[data-mail-column]')].map(rectangles);
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) for (const a of cells[i]) for (const b of cells[j]) {
      if (Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1) overlaps++;
    }
  }
  const words = [], text = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (text.nextNode()) {const value = text.currentNode.textContent.replace(/\s+/g,' ').trim(); if (value) words.push(value);}
  return {attributes, overflow: document.documentElement.scrollWidth > innerWidth + 1, overlaps,
    floats: [...document.querySelectorAll('table')].filter(e => getComputedStyle(e).float !== 'none').length,
    text: words.join(' '),
    links: [...document.querySelectorAll('a')].map(e => [e.textContent.trim(), e.getAttribute('href')]),
    headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e => [e.tagName, e.textContent.trim()])};
}
const loaded = page => page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
function check(measure, name) {
  assert.deepEqual(measure.attributes, [], name + ' : attributs');
  assert(!measure.overflow, name + ' : débordement');
  assert.equal(measure.overlaps, 0, name + ' : chevauchement entre colonnes');
  assert.equal(measure.floats, 0, name + ' : flottants');
}

test('52 composants : présentation CSS, bornes responsive, contenus longs, espacement et copie sans styles de tête', async () => {
  const browser = await chromium.launch();
  const output = path.join(evidence, 'mail-presentation'); await fs.mkdir(output, {recursive: true});
  const observations = [];
  try {
    const {page, context} = await open(browser, {offline: true});
    const alternate = 'data:image/png;base64,' + (await fs.readFile(path.join(root, 'app/assets/icon-192.png'))).toString('base64');
    const documents = await page.evaluate(image => {
      const A = MailBuilder, M = A.Model, R = A.Render;
      return Array.from({length: 52}, (_, component) => {
        const doc = M.create('Recette de présentation', [component]), block = doc.blocks[0], definition = M.component(block.component);
        const reference = `<!doctype html><html lang="fr"><head><style>${A.catalog.css}</style></head><body style="font-family:Tahoma,Geneva,sans-serif;">${definition.template.replace(/\{\{(f\d+)\}\}/g, (_, key) => R.escape(block.values[key]))}</body></html>`;
        const normal = {html: R.html(doc), copy: R.clipboardHtml(doc)};
        for (const field of definition.fields) {
          if (field.type === 'text') block.values[field.key] = 'Présentation détaillée du dossier et des décisions à partager. '.repeat(4) + 'DossierSansEspaces'.repeat(8);
          if (field.type === 'image') block.values[field.key] = image;
        }
        block.source = 'https://exemple.invalid/' + 'parcours'.repeat(20); block.sourceLabel = 'ConsulterLeDossier'.repeat(10);
        return {component, reference, normal, long: {html: R.html(doc), copy: R.clipboardHtml(doc)}};
      });
    }, alternate);
    const display = await context.newPage();
    for (const scheme of ['light', 'dark']) for (const width of [1024, 620, 619, 601, 600, 481, 480, 390, 320]) for (const doc of documents) {
      await display.setViewportSize({width, height: 900}); await display.emulateMedia({colorScheme: scheme});
      await display.setContent(doc.reference); await loaded(display);
      const before = await display.evaluate(inspect), png = await display.screenshot({fullPage: true});
      await display.setContent(doc.normal.html); await loaded(display);
      const current = await display.evaluate(inspect), after = await display.screenshot({fullPage: true}), name = `${doc.component}-normal-${scheme}-${width}`;
      check(current, name); assert.equal(current.text, before.text, name); assert.deepEqual(current.links, before.links, name);
      const identical = png.equals(after), intendedChange = [601, 619].includes(width) || (doc.component === 48 && width === 320) || (scheme === 'dark' && [7, 51].includes(doc.component)); // #42 : texte éclairci en mode sombre
      if (!identical) {await fs.writeFile(path.join(output, name + '-before.png'), png); await fs.writeFile(path.join(output, name + '-after.png'), after);}
      assert(identical || intendedChange, name + ' : différence visuelle inattendue');
      await display.setContent(doc.normal.copy); await display.locator('style,link').evaluateAll(nodes => nodes.forEach(e => e.remove())); await loaded(display);
      const copied = await display.evaluate(inspect); check(copied, name + '-copy');
      for (const key of ['text', 'links', 'headings']) assert.deepEqual(copied[key], current[key], name + '-copy ' + key);
      observations.push({component: doc.component, variant: 'normal', scheme, width, pixelEquivalent: identical, current, copied});
    }
    for (const scheme of ['light', 'dark']) for (const width of [1024, 619, 320]) for (const doc of documents) {
      await display.setViewportSize({width, height: 900}); await display.emulateMedia({colorScheme: scheme});
      await display.setContent(doc.long.html); await loaded(display);
      const current = await display.evaluate(inspect), name = `${doc.component}-long-${scheme}-${width}`; check(current, name);
      if (width === 320) {
        await display.addStyleTag({content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});
        const spaced = await display.evaluate(inspect); check(spaced, name + '-spacing');
        for (const key of ['text', 'links', 'headings']) assert.deepEqual(spaced[key], current[key], name + '-spacing ' + key);
      }
      await display.setContent(doc.long.copy); await display.locator('style,link').evaluateAll(nodes => nodes.forEach(e => e.remove())); await loaded(display);
      const copied = await display.evaluate(inspect); check(copied, name + '-copy');
      for (const key of ['text', 'links', 'headings']) assert.deepEqual(copied[key], current[key], name + '-copy ' + key);
      observations.push({component: doc.component, variant: 'long', scheme, width, textSpacing: width === 320, current, copied});
    }
    await context.close();
  } finally {
    await fs.writeFile(path.join(output, 'receipt.json'), JSON.stringify({browser: browser.version(),screenReaderExecuted:false,mailClientExecuted:false,overlapScope:'Rectangles de texte et images entre les cellules des dix groupes natifs uniquement.',observations}, null, 2));
    await browser.close();
  }
});

test('la copie système des 52 composants conserve le HTML strict, les styles Office et le texte', async () => {
  const browser = await chromium.launch();
  try {
    const {page, context} = await open(browser, {offline: true, permissions: ['clipboard-read', 'clipboard-write']});
    const packet = await page.evaluate(() => MailBuilder.Model.create('Recette de copie', Array.from({length:52}, (_, i) => i)));
    await expand(page, 'Fichiers et récupération');
    await page.locator('#project-input').setInputFiles({name:'presentation.courriel.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(packet))});
    await page.locator('#notice').filter({hasText:'Import ajouté à la bibliothèque'}).waitFor(); await saved(page);
    await click(page, '[data-action=copy]'); await page.locator('#notice').filter({hasText:'Courriel copié en HTML et texte.'}).waitFor();
    const copied = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read({unsanitized:['text/html']}), html = await (await item.getType('text/html')).text(), plain = await (await item.getType('text/plain')).text();
      const [filtered] = await navigator.clipboard.read(), sanitizedHtml = await (await filtered.getType('text/html')).text();
      return {html, sanitizedHtml, plain, expectedPlain: MailBuilder.Render.plain(MailBuilder.doc()), expectedHtml: MailBuilder.Render.clipboardHtml(MailBuilder.doc()), types: item.types};
    });
    assert.equal(copied.plain, copied.expectedPlain);
    for (const property of ['mso-table-lspace', 'mso-table-rspace']) {
      const count = html => [...html.matchAll(new RegExp(property + '\\s*:', 'g'))].length;
      assert(count(copied.html) > 0); assert.equal(count(copied.html), count(copied.expectedHtml));
    }
    const display = await context.newPage(); await display.setViewportSize({width:320,height:900}); await display.setContent(copied.expectedHtml); await loaded(display);
    const expected = await display.evaluate(inspect); await display.setContent(copied.html);
    await display.locator('style,link').evaluateAll(nodes => nodes.forEach(e => e.remove())); await loaded(display);
    const measure = await display.evaluate(inspect); check(measure, 'presse-papiers système');
    for (const key of ['text','links','headings']) assert.deepEqual(measure[key],expected[key],key);
    await display.setContent(copied.sanitizedHtml); await loaded(display);
    const filtered = await display.evaluate(inspect); check(filtered,'lecture filtrée du presse-papiers');
    for (const key of ['text','links','headings']) assert.deepEqual(filtered[key],expected[key],key);
    await fs.mkdir(evidence,{recursive:true}); await fs.writeFile(path.join(evidence,'mail-clipboard.json'),JSON.stringify({types:copied.types,readMode:'unsanitized et lecture filtrée comparées',measure,filtered,screenReaderExecuted:false,mailClientExecuted:false},null,2));
    await context.close();
  } finally {await browser.close();}
});
