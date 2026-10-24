const test = require('node:test');
const {portable, assert} = require('./browser-support.cjs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// #42 : texte de mail-07 et mail-51 lisible en mode sombre (WCAG 1.4.3, 4,5:1 pour du texte de 12 px).
const components = ['mail-07', 'mail-51'], threshold = 4.5;

// Mesure dans la page : couleur calculée de chaque texte et fond effectif le plus proche.
function measureTexts() {
  const parse = value => { const m = value.match(/rgba?\(([^)]+)\)/); const v = m[1].split(/[, /]+/).map(Number); return {r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1}; };
  const lum = c => [c.r, c.g, c.b].map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const background = element => {
    for (let node = element; node; node = node.parentElement) {
      const color = parse(getComputedStyle(node).backgroundColor);
      if (color.a === 1) return color;
    }
    return parse(getComputedStyle(document.body).backgroundColor);
  };
  const results = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode, text = node.data.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const element = node.parentElement, fg = parse(getComputedStyle(element).color), bg = background(element);
    results.push({text: text.slice(0, 30), color: getComputedStyle(element).color, background: `rgb(${bg.r}, ${bg.g}, ${bg.b})`, ratio: ratio(fg, bg)});
  }
  return results;
}

async function documents(page) {
  return page.evaluate(ids => {
    const M = MailBuilder.Model, R = MailBuilder.Render;
    return ids.map(id => {
      const index = MailBuilder.catalog.components.findIndex(c => c.id === id), doc = M.create('Contraste', [index]);
      return {id, paths: {export: R.html(doc), preview: R.html(doc, true), copie: R.clipboardHtml(doc)}};
    });
  }, components);
}

for (const engine of ['chromium', 'webkit']) test(`contraste en mode sombre de mail-07 et mail-51 sous ${engine}`, async () => {
  const browser = await playwright[engine].launch();
  try {
    const loader = await (await browser.newContext({colorScheme: 'light'})).newPage();
    await loader.goto(portable); await loader.waitForFunction(() => window.MailBuilder?.ready);
    const docs = await documents(loader);
    for (const scheme of ['dark', 'light']) {
      const context = await browser.newContext({colorScheme: scheme, viewport: {width: 700, height: 900}}), page = await context.newPage();
      for (const doc of docs) for (const [path, html] of Object.entries(doc.paths)) {
        await page.setContent(html);
        const texts = await page.evaluate(measureTexts);
        assert.ok(texts.length, `${doc.id} ${path} : aucun texte mesuré`);
        for (const item of texts) {
          const label = `${engine} ${scheme} ${doc.id} ${path} « ${item.text} » ${item.color} sur ${item.background} : ${item.ratio.toFixed(2)}:1`;
          if (scheme === 'dark') assert.ok(item.ratio >= threshold, label);
          // Mode clair inchangé : le gris de la référence reste appliqué.
          else assert.equal(item.color, 'rgb(88, 88, 88)', label);
        }
      }
      await context.close();
    }
  } finally { await browser.close(); }
});
