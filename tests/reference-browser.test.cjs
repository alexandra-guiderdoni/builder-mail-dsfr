const test = require('node:test');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {root, evidence, open, chromium, fs, assert} = require('./browser-support.cjs');
test('la référence épinglée reste intacte ; couleurs, images et règles mobiles sont observées', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const source = await fs.readFile(path.join(root, 'reference/dsfr-mail/template-generique.html'));
    assert.equal(createHash('sha256').update(source).digest('hex'), '5ba14f67952bc10d1356abf8bdcbd7f3d6028a8b45f0ce968927c6444e4c3dd5');
    const {page, context} = await open(browser), html = await page.evaluate(() => MailBuilder.Render.html(MailBuilder.Model.create('Qualification du gabarit', [2, 6, 40, 41, 42])));
    const selectors = ['.darkmode', '.darkmode-1', '.darkmode-2', '.darkmode-3', '.darkmode-4', '.darkmode-5', '.darkmode-6', 'a.darkmode-button-color-primary[href]', '.darkmode-button-primary', '.darkmode-button-secondary', '.darkmode-button-tertiary', '.darkmode-button-color-primary', '.darkmode-button-color-secondary', '.darkmode-button-color-tertiary'];
    const expected = ['255, 255, 255', '206, 206, 206', '255, 255, 255', '255, 255, 255', '206, 206, 206', '255, 255, 255', '255, 255, 255', '0, 0, 145', '0, 0, 145', '133, 133, 246', '133, 133, 246', '0, 0, 145', '133, 133, 246', '133, 133, 246'];
    const rendered = await context.newPage(), observations = [];
    for (const colorScheme of ['light', 'dark']) for (const width of [1024, 600, 390]) {
      await rendered.setViewportSize({width, height: 900}); await rendered.emulateMedia({colorScheme});
      await rendered.goto('data:text/html;base64,' + Buffer.from(html).toString('base64'));
      await rendered.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
      const result = await rendered.evaluate(selectors => {
        const probes = document.createElement('div'); probes.style.cssText = 'position:absolute;left:-9999px';
        const colors = selectors.map(selector => { const a = document.createElement('a'); a.className = selector.replace(/^a/, '').replace('[href]', '').replace('.', ''); if (selector.includes('[href]')) a.href = 'https://exemple.invalid/'; a.textContent = 'Couleur'; probes.append(a); document.body.append(probes); return getComputedStyle(a).color; });
        const images = [...document.images].map(i => ({naturalWidth: i.naturalWidth, naturalHeight: i.naturalHeight, width: i.width, height: i.height, widthAttribute: i.getAttribute('width'), heightAttribute: i.getAttribute('height'), heightStyle: i.style.height}));
        return {colors, images, bodyColor: getComputedStyle(document.body).color, bodyBackground: getComputedStyle(document.body).backgroundColor, tableWidth: document.querySelector('table.wlkm-mw').getBoundingClientRect().width, viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth};
      }, selectors);
      if (colorScheme === 'dark') assert.deepEqual(result.colors, expected.map(rgb => `rgb(${rgb})`));
      const auto = result.images.find(i => i.widthAttribute === '140'); assert(auto); assert.equal(auto.heightAttribute, null); assert.equal(auto.heightStyle, 'auto'); assert(Math.abs(auto.width / auto.height - auto.naturalWidth / auto.naturalHeight) < 0.05);
      assert(result.images.every(i => i.naturalWidth > 0 && i.naturalHeight > 0));
      observations.push({colorScheme, width, ...result});
      await fs.mkdir(evidence, {recursive: true}); await rendered.screenshot({path: path.join(evidence, `gabarit-${colorScheme}-${width}.png`), fullPage: true});
    }
    await fs.writeFile(path.join(evidence, 'reference-observee.json'), JSON.stringify({adaptation: true, adaptationScope: 'Rendu CSS dérivé ; référence canonique conservée par empreinte.', browsers: [browser.version()], selectors, observations, mailClientsVerified: false}, null, 2));
  } finally { await browser.close(); }
});
