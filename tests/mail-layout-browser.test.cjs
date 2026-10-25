const test = require('node:test');
const {createHash} = require('node:crypto');
const {open, confirmChecks, chromium, assert} = require('./browser-support.cjs');

// Le rectangle inclut la bordure fusionnée du tableau (1 px sous WebKit).
// Mesurer les pixels peints, sans déduire l’épaisseur du CSS qui les produit.
async function paintedBars(page) {
  const bars = await page.locator('td').evaluateAll(nodes => nodes.filter(n => n.style.backgroundColor === 'rgb(106, 106, 244)').map(n => {
    const r = n.getBoundingClientRect(); return {x: r.x, y: r.y, width: r.width, height: r.height};
  }));
  const result = [];
  for (const bar of bars) {
    const png = await page.screenshot({clip: {x: Math.max(0, Math.floor(bar.x) - 1), y: Math.floor(bar.y + bar.height / 2), width: Math.ceil(bar.width) + 3, height: 1}, scale: 'css'});
    const painted = await page.evaluate(async data => {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, image.width, 1).data;
      let run = 0, longest = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        run = pixels[i] === 106 && pixels[i + 1] === 106 && pixels[i + 2] === 244 && pixels[i + 3] === 255 ? run + 1 : 0;
        longest = Math.max(longest, run);
      }
      return longest;
    }, png.toString('base64'));
    result.push({rectangle: bar.width, painted});
  }
  return result;
}
const threePixelBars = bars => bars.length === 2 && bars.every(bar => Math.abs(bar.painted - 3) <= 0.75);

test('le courriel copié tient dans un message étroit après retrait des styles de tête', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, context} = await open(browser, {permissions: ['clipboard-read', 'clipboard-write']});
    await page.evaluate(() => {
      const A = MailBuilder;
      A.library.documents.find(d => d.id === A.library.activeId).blocks = A.Model.create('Recette largeur', [2, 5, 19, 21, 27, 47]).blocks;
    });
    await page.locator('[data-action=copy]').click(); await confirmChecks(page);
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
    await page.locator('[data-action=copy]').click(); await confirmChecks(page);
    await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
    const html = await page.evaluate(async () => { const [item] = await navigator.clipboard.read(); return (await item.getType('text/html')).text(); });
    const rendered = await context.newPage();
    await rendered.setContent(html);
    await rendered.locator('style').evaluateAll(nodes => nodes.forEach(n => n.remove()));
    for (const width of [800, 390]) {
      await rendered.setViewportSize({width, height: 900});
      const bars = await paintedBars(rendered);
      assert(threePixelBars(bars), `Filets à ${width}px : ${JSON.stringify(bars)}`);
    }
    // Témoin négatif : le contrôle doit refuser un vrai filet élargi.
    await rendered.locator('td').evaluateAll(nodes => nodes.filter(n => n.style.backgroundColor === 'rgb(106, 106, 244)').forEach(n => { n.style.width = '4px'; }));
    const widened = await paintedBars(rendered);
    assert.deepEqual(widened.map(bar => bar.painted), [4, 4], 'Le témoin peint réellement quatre pixels.');
    assert.equal(threePixelBars(widened), false, 'Un filet élargi doit être détecté.');
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
      const preheader = value.blocks.find(b => b.component === 'mail-00').values.f0;
      for (const output of [original, adapted]) {
        const first = output.body.firstElementChild;
        if (first.textContent !== preheader || first.style.display !== 'none' || !/mso-hide\s*:\s*all/.test(first.getAttribute('style'))) throw new Error('Le pré-en-tête doit rester présent et masqué dans les sorties.');
      }
      const nodes = original.createTreeWalker(original.body, NodeFilter.SHOW_TEXT), text = [];
      while (nodes.nextNode()) { const value = nodes.currentNode.data.replace(/\s+/g, ' ').trim(); if (value && !original.body.firstElementChild.contains(nodes.currentNode)) text.push(value); }
      // Chromium omet les variantes blanches masquées dans sa copie en mode clair, les autres moteurs non : on ne compare que les images visibles.
      return {text, images: [...original.images].filter(i => !i.closest('.hide-white')).map(i => [i.src, i.alt]), links: [...original.querySelectorAll('a')].map(a => a.getAttribute('href')), plain: A.Render.plain(A.doc())};
    });
    await page.locator('[data-action=copy]').click(); await confirmChecks(page);
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
      // La réécriture CSSOM ci-dessus retire mso-hide inconnu sous Firefox/WebKit.
      // La visibilité reçue dépend du rendu, pas de la graphie de cette propriété Office.
      const message = document.querySelector('#message'), nodes = document.createTreeWalker(message, NodeFilter.SHOW_TEXT), text = [];
      while (nodes.nextNode()) {
        const value = nodes.currentNode.data.replace(/\s+/g, ' ').trim();
        let parent = nodes.currentNode.parentElement, hidden = false;
        while (parent && parent !== message) { if (getComputedStyle(parent).display === 'none') hidden = true; parent = parent.parentElement; }
        if (value && !hidden) text.push(value);
      }
      return {text, images: [...doc.images].filter(i => !i.closest('.hide-white')).map(i => [i.src, i.alt]), links: [...doc.querySelectorAll('a')].map(a => a.getAttribute('href'))};
    }, clipboard.html);
    assert.deepEqual(actual.text, expected.text);
    const signatures = values => values.map(([src, alt]) => ({sha256: createHash('sha256').update(src).digest('hex'), alt}));
    assert.deepEqual(signatures(actual.images), signatures(expected.images));
    assert.deepEqual(actual.links, expected.links);
    for (const width of [1024, 800, 600, 390]) {
      await received.setViewportSize({width, height: 900});
      const result = await received.locator('#message').evaluate(e => ({available: e.clientWidth, content: e.scrollWidth, blocks: [...e.children].filter(c => getComputedStyle(c).display !== 'none').length}));
      assert.equal(result.blocks, 51); // #41 : 52 composants, dont mail-00 masqué (ou retiré par la lecture filtrée de Chromium)
      assert(result.content <= result.available + 1, `${width}px : ${JSON.stringify(result)}`);
    }
  } finally { await browser.close(); }
});
