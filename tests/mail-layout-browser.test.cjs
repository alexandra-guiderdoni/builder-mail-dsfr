const test = require('node:test');
const {createHash} = require('node:crypto');
const {open, chromium, assert} = require('./browser-support.cjs');

test('le courriel copié tient dans un message étroit après retrait des styles de tête', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser, {permissions: ['clipboard-read', 'clipboard-write']});
    await page.evaluate(() => {
      const A = MailBuilder;
      A.library.documents.find(d => d.id === A.library.activeId).blocks = A.Model.create('Recette largeur', [2, 5, 19, 21, 27, 47]).blocks;
    });
    await page.locator('[data-action=copy]').click();
    await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
    const html = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return (await item.getType('text/html')).text();
    });
    const received = await context.newPage();
    await received.setContent('<div id="message" style="width:100%;overflow:auto"></div>');
    await received.evaluate(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('style,link').forEach(e => e.remove());
      document.querySelector('#message').innerHTML = doc.body.innerHTML;
    }, html);
    for (const width of [800, 600, 390]) {
      await received.setViewportSize({width, height: 900});
      const result = await received.locator('#message').evaluate(e => ({available: e.clientWidth, content: e.scrollWidth,
        overflowing: [...e.querySelectorAll('table,td,img')].filter(n => n.getBoundingClientRect().right > e.getBoundingClientRect().right + 1).slice(0, 8).map(n => ({tag: n.tagName, width: n.getAttribute('width'), classes: n.className, style: n.getAttribute('style')}))}));
      assert(result.content <= result.available + 1, `${width}px : ${JSON.stringify(result)}`);
    }
  } finally { await browser.close(); }
});

test('la copie conserve les filets décoratifs de trois pixels des mises en avant', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser, {permissions: ['clipboard-read', 'clipboard-write']});
    await page.evaluate(() => { MailBuilder.library.documents.find(d => d.id === MailBuilder.library.activeId).blocks = MailBuilder.Model.create('Filets', [35, 36]).blocks; });
    await page.locator('[data-action=copy]').click();
    await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
    const html = await page.evaluate(async () => { const [item] = await navigator.clipboard.read(); return (await item.getType('text/html')).text(); });
    const rendered = await context.newPage();
    await rendered.setContent(html);
    await rendered.locator('style').evaluateAll(nodes => nodes.forEach(n => n.remove()));
    for (const width of [800, 390]) {
      await rendered.setViewportSize({width, height: 900});
      const bars = await rendered.locator('td').evaluateAll(nodes => nodes.filter(n => n.style.backgroundColor === 'rgb(106, 106, 244)').map(n => n.getBoundingClientRect().width));
      assert.equal(bars.length, 2);
      // La bordure fusionnée voisine peut ajouter un demi-pixel au rectangle.
      assert(bars.every(w => Math.abs(w - 3) <= 0.75), `Filets à ${width}px : ${bars.join(', ')}`);
    }
  } finally { await browser.close(); }
});

test('les 52 composants copiés conservent texte, liens et images sans déborder après réécriture des largeurs', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser, {permissions: ['clipboard-read', 'clipboard-write']});
    const expected = await page.evaluate(() => {
      const A = MailBuilder, value = A.Model.create('Catalogue copié', A.catalog.components.map(c => c.id));
      const paragraph = value.blocks.find(b => b.component === 'mail-19');
      paragraph.values.f0 = 'Texte long sans espace : ' + 'A'.repeat(240);
      A.library.documents.find(d => d.id === A.library.activeId).blocks = value.blocks;
      const original = new DOMParser().parseFromString(A.Render.html(A.doc()), 'text/html');
      const adapted = new DOMParser().parseFromString(A.Render.clipboardHtml(A.doc()), 'text/html');
      if (JSON.stringify([...adapted.images].map(i => [i.src, i.alt])) !== JSON.stringify([...original.images].map(i => [i.src, i.alt]))) throw new Error('La préparation du presse-papiers a changé les images');
      const nodes = original.createTreeWalker(original.body, NodeFilter.SHOW_TEXT), text = [];
      while (nodes.nextNode()) { const value = nodes.currentNode.data.replace(/\s+/g, ' ').trim(); if (value) text.push(value); }
      // Chromium omet les variantes blanches masquées dans sa copie en mode clair, les autres moteurs non : on ne compare que les images visibles.
      return {text, images: [...original.images].filter(i => !i.closest('.hide-white')).map(i => [i.src, i.alt]), links: [...original.querySelectorAll('a')].map(a => a.getAttribute('href')), plain: A.Render.plain(A.doc())};
    });
    await page.locator('[data-action=copy]').click();
    await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
    const clipboard = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return {html: await (await item.getType('text/html')).text(), plain: await (await item.getType('text/plain')).text()};
    });
    assert.equal(clipboard.plain, expected.plain);
    const received = await context.newPage();
    await received.setContent('<div id="message" style="width:100%;overflow:auto"></div>');
    const actual = await received.evaluate(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('style,link').forEach(e => e.remove());
      // Cas reçu dans Mélissa : une largeur de table est figée à 800 pixels.
      for (const table of doc.body.children) table.style.width = '800px';
      document.querySelector('#message').innerHTML = doc.body.innerHTML;
      const nodes = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT), text = [];
      while (nodes.nextNode()) { const value = nodes.currentNode.data.replace(/\s+/g, ' ').trim(); if (value) text.push(value); }
      return {text, images: [...doc.images].filter(i => !i.closest('.hide-white')).map(i => [i.src, i.alt]), links: [...doc.querySelectorAll('a')].map(a => a.getAttribute('href'))};
    }, clipboard.html);
    assert.deepEqual(actual.text, expected.text);
    const signatures = values => values.map(([src, alt]) => ({sha256: createHash('sha256').update(src).digest('hex'), alt}));
    assert.deepEqual(signatures(actual.images), signatures(expected.images));
    assert.deepEqual(actual.links, expected.links);
    for (const width of [1024, 800, 600, 390]) {
      await received.setViewportSize({width, height: 900});
      const result = await received.locator('#message').evaluate(e => ({available: e.clientWidth, content: e.scrollWidth, blocks: e.children.length}));
      assert.equal(result.blocks, 52);
      assert(result.content <= result.available + 1, `${width}px : ${JSON.stringify(result)}`);
    }
  } finally { await browser.close(); }
});
