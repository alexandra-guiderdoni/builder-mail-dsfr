const test = require('node:test'), {createHash} = require('node:crypto'), path = require('node:path');
const {open, chromium, assert, fs, evidence} = require('./browser-support.cjs');
const hash = value => createHash('sha256').update(value).digest('hex');

test('le retrait de font-color conserve les couleurs calculées du catalogue et la couleur héritée du corps', async () => {
  const browser = await chromium.launch();
  try {
    const {page, context} = await open(browser);
    const variants = await page.evaluate(() => {
      const A = MailBuilder, doc = A.Model.create('Couleurs du catalogue', A.catalog.components.map(c => c.id));
      const before = JSON.stringify(doc), original = A.catalog.renderCss;
      const render = () => ({html: A.Render.html(doc), preview: A.Render.html(doc, true), copy: A.Render.clipboardHtml(doc)});
      const current = render(); let previous;
      try { A.catalog.renderCss = A.catalog.css; previous = render(); } finally { A.catalog.renderCss = original; }
      if (before !== JSON.stringify(doc)) throw Error('Données modifiées par le rendu.');
      const probes = '<div id="css-probes"><span id="css-inherited">Couleur héritée</span>' +
        ['darkmode', 'darkmode-1', 'darkmode-2', 'darkmode-3', 'darkmode-4', 'darkmode-5', 'darkmode-6',
          'darkmode-button-primary', 'darkmode-button-secondary', 'darkmode-button-tertiary',
          'darkmode-button-color-primary', 'darkmode-button-color-secondary', 'darkmode-button-color-tertiary']
          .map(value => `<span class="${value}">Couleur ${value}</span>`).join('') +
        '<a class="darkmode-button-color-primary" href="https://exemple.invalid/">Couleur du lien</a></div>';
      for (const pair of [previous, current]) {
        pair.filtered = pair.copy.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
        for (const key of Object.keys(pair)) pair[key] = pair[key].replace('</body>', probes + '</body>');
      }
      return {previous, current};
    });
    const display = await context.newPage(), observations = [];
    const loaded = () => display.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth));
    const measure = () => display.evaluate(() => [document.body, ...document.body.querySelectorAll('*')].map(element => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      return {tag: element.tagName, id: element.id, color: style.color, background: style.backgroundColor,
        border: style.borderColor, font: style.font, display: style.display, rect: [rect.x, rect.y, rect.width, rect.height],
        text: element.children.length ? null : element.textContent, href: element.getAttribute('href'), alt: element.getAttribute('alt')};
    }));
    for (const scheme of ['light', 'dark']) for (const kind of ['html', 'preview', 'copy', 'filtered']) {
      await display.emulateMedia({colorScheme: scheme}); await display.setViewportSize({width: 390, height: 900});
      await display.setContent(variants.previous[kind]); await loaded();
      const previous = await measure(), beforeImage = await display.screenshot();
      await display.setContent(variants.current[kind]); await loaded();
      const current = await measure(), afterImage = await display.screenshot();
      assert.deepEqual(current, previous, scheme + ' ' + kind);
      assert(beforeImage.equals(afterImage), scheme + ' ' + kind + ' : pixels du viewport');
      const prefix = `css-${scheme}-${kind}`;
      await fs.mkdir(evidence, {recursive: true});
      await fs.writeFile(path.join(evidence, prefix + '-avant.png'), beforeImage);
      await fs.writeFile(path.join(evidence, prefix + '-apres.png'), afterImage);
      await fs.writeFile(path.join(evidence, prefix + '-mesures.json'), JSON.stringify({previous, current}));
      observations.push({scheme, kind, elementCount: current.length, beforePixelSha256: hash(beforeImage), afterPixelSha256: hash(afterImage), measureSha256: hash(JSON.stringify(current)), equivalent: true});
    }
    // Le remplacement par color est un autre changement : le témoin doit le détecter.
    await display.emulateMedia({colorScheme: 'dark'});
    const inheritedColor = async source => {
      await display.setContent(source);
      return display.evaluate(() => {
        document.documentElement.style.color = 'rgb(7, 17, 27)';
        return getComputedStyle(document.querySelector('#css-inherited')).color;
      });
    };
    const previous = await inheritedColor(variants.previous.html);
    const current = await inheritedColor(variants.current.html);
    const mutant = await inheritedColor(variants.previous.html.replace('font-color: #ffffff !important;', 'color: #ffffff !important;'));
    assert.equal(current, previous); assert.equal(previous, 'rgb(7, 17, 27)'); assert.notEqual(mutant, previous);
    await fs.writeFile(path.join(evidence, 'css-colors.json'), JSON.stringify({browser: browser.version(), observations,
      negativeControl: {previous, current, mutant, detected: true}, humanQualification: false, screenReaderExecuted: false, mailClientExecuted: false}, null, 2));
  } finally { await browser.close(); }
});
