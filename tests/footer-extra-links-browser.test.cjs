const test = require('node:test'), path = require('node:path');
const {evidence, portable, fs, assert} = require('./browser-support.cjs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// #40 : pied mail-50 avec un ou deux liens supplémentaires, intitulés de 52 caractères.
const labels = {
  'avec espaces': 'Consulter les conditions de la lettre d’information.',
  'sans espace': 'ConsulterLesConditionsDeLaLettreD’informationEnLigne',
};
const widths = [320, 390, 480];

function inspect() {
  const width = document.documentElement.clientWidth, problems = [];
  const outside = r => r.left < -1 || r.right > width + 1;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode, value = node.data.replace(/\s+/g, ' ').trim();
    if (!value || node.parentElement.closest('.hide-white')) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter(r => r.width && r.height);
    if (!rects.length) problems.push('texte non rendu « ' + value.slice(0, 30) + ' »');
    else if (rects.some(outside)) problems.push('texte hors champ « ' + value.slice(0, 30) + ' »');
  }
  for (const link of document.querySelectorAll('a')) {
    const cell = link.closest('td').getBoundingClientRect();
    for (const r of link.getClientRects()) if (r.left < cell.left - 1 || r.right > cell.right + 1) problems.push('lien hors de sa cellule « ' + link.textContent.slice(0, 30) + ' »');
  }
  return {overflow: document.documentElement.scrollWidth - width, links: document.querySelectorAll('a').length, problems};
}

// Signature calculée du pied : cadre (tables), texte et liens.
function signature() {
  const css = (e, keys) => { const s = getComputedStyle(e); return keys.map(k => s[k]).join('|'); };
  const tables = [...document.querySelectorAll('table')].map(t => Math.round(t.getBoundingClientRect().width) + '|' + css(t, ['backgroundColor', 'backgroundImage', 'borderLeftWidth', 'borderLeftColor', 'borderRightWidth', 'borderRightColor', 'borderTopWidth', 'borderBottomWidth']));
  const cell = document.querySelector('a').closest('td');
  const links = [...document.querySelectorAll('a')].map(a => css(a, ['color', 'fontSize', 'lineHeight', 'textDecorationLine', 'whiteSpace', 'display']) + '|' + css(a.querySelector('span') || a, ['fontFamily']) + '|' + a.target + '|' + a.className);
  return {tables, cell: css(cell, ['fontFamily', 'fontSize', 'lineHeight', 'color', 'textAlign', 'paddingTop', 'paddingLeft', 'paddingRight', 'paddingBottom', 'backgroundColor']), links};
}

test('pied mail-50 avec liens supplémentaires : aucun débordement à 320 px et aspect du gabarit sous Chromium et WebKit', async t => {
  const receipt = {issue: 40, widths, labels, outputs: ['aperçu avec styles de tête', 'copie sans styles de tête', 'export avec styles de tête', 'export sans styles de tête'], mailClientExecuted: false, engines: {}};
  try {
    for (const engine of ['chromium', 'webkit']) await t.test(engine, async () => {
      const browser = await playwright[engine].launch();
      const failures = [];
      let cases = 0;
      try {
        for (const colorScheme of ['light', 'dark']) {
          const context = await browser.newContext({offline: true, colorScheme, viewport: {width: 1600, height: 1000}});
          const page = await context.newPage();
          await page.goto(portable); await page.waitForFunction(() => window.MailBuilder?.ready);
          const entries = await page.evaluate(labels => {
            const M = MailBuilder.Model, R = MailBuilder.Render, index = MailBuilder.catalog.components.findIndex(c => c.id === 'mail-50');
            const out = [];
            for (const [kind, label] of Object.entries(labels)) for (const count of [0, 1, 2]) {
              const doc = M.create('Pied de recette', [index]);
              doc.blocks[0].values.f2 = label;
              if (count) doc.blocks[0].additionalLinks = Array.from({length: count}, (_, i) => ({url: 'https://exemple.invalid/lien-' + i, label}));
              out.push({kind, count, outputs: {'aperçu': [R.html(doc, true), false], copie: [R.clipboardHtml(doc), true], 'export avec styles': [R.exportHtml(doc), false], 'export sans styles': [R.exportHtml(doc), true]}});
            }
            return out;
          }, labels);
          const display = await context.newPage();
          const load = async (html, strip, width) => {
            await display.setViewportSize({width, height: 900});
            await display.setContent(html);
            if (strip) await display.locator('style,link').evaluateAll(nodes => nodes.forEach(e => e.remove()));
          };
          for (const entry of entries) for (const [output, [html, strip]] of Object.entries(entry.outputs)) {
            const name = `${colorScheme} ${entry.kind} ${entry.count} lien(s) supplémentaire(s) ${output}`;
            if (entry.count) for (const width of widths) {
              await load(html, strip, width);
              const result = await display.evaluate(inspect); cases++;
              const reasons = [...(result.overflow > 1 ? [`débordement de ${result.overflow} px`] : []), ...(result.links === 1 + entry.count ? [] : [`${result.links} liens`]), ...result.problems];
              if (reasons.length) failures.push(`${name} ${width} px : ${reasons.slice(0, 3).join(' ; ')}`);
            }
            // L’aspect se compare au pied canonique sans lien supplémentaire, au même intitulé et à la même largeur.
            if (entry.count) for (const width of [620, 320]) {
              const canonical = entries.find(e => e.kind === entry.kind && e.count === 0).outputs[output];
              await load(canonical[0], canonical[1], width);
              const expected = await display.evaluate(signature);
              await load(html, strip, width);
              const actual = await display.evaluate(signature); cases++;
              const reasons = [];
              if (JSON.stringify(actual.tables) !== JSON.stringify(expected.tables)) reasons.push('cadre différent : ' + JSON.stringify(actual.tables).slice(0, 160));
              if (actual.cell !== expected.cell) reasons.push('texte différent : ' + actual.cell);
              for (const link of actual.links) if (link !== expected.links[0]) { reasons.push('lien différent : ' + link); break; }
              if (reasons.length) failures.push(`${name} ${width} px : ${reasons.join(' ; ')}`);
            }
          }
          await context.close();
        }
        receipt.engines[engine] = {version: browser.version(), cases, failures: failures.length, examples: failures.slice(0, 10)};
      } finally { await browser.close(); }
      assert.equal(failures.length, 0, `${engine} : ${failures.length} cas en échec sur ${cases}, dont ${failures.slice(0, 4).join(' | ')}`);
    });
  } finally {
    await fs.mkdir(evidence, {recursive: true});
    await fs.writeFile(path.join(evidence, 'footer-extra-links.json'), JSON.stringify(receipt, null, 2));
  }
});
