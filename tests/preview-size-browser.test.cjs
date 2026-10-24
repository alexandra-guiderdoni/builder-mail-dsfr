const test = require('node:test');
const http = require('node:http');
const path = require('node:path');
const {open, enterEditor, click, expand, saved, chromium, fs, root, assert} = require('./browser-support.cjs');

async function server() {
  let forbidden = 0;
  const instance = http.createServer(async (req, res) => {
    if (req.url === '/forbidden') { forbidden++; res.end('witness'); return; }
    try {
      const base = path.join(root, 'app/distribution/web'), pathname = new URL(req.url, 'http://127.0.0.1').pathname;
      const file = path.resolve(base, pathname === '/' ? 'index.html' : pathname.slice(1));
      assert(file.startsWith(base + path.sep)); const bytes = await fs.readFile(file);
      res.writeHead(200, {'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.png') ? 'image/png' : 'application/json'}); res.end(bytes);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  return {origin: 'http://127.0.0.1:' + instance.address().port, get forbidden() { return forbidden; }, reset() { forbidden = 0; }, close: () => new Promise(resolve => instance.close(resolve))};
}
async function composition(page, all, title) {
  const value = await page.evaluate(({all, title}) => JSON.stringify(MailBuilder.Model.create(title, all ? MailBuilder.catalog.components.map(c => c.id) : [0])), {all, title});
  await expand(page, 'Importer du JSON'); await page.locator('#json-input').fill(value); await click(page, '[data-action=json-import]');
  await page.locator('#notice').filter({hasText: 'Composition ou bibliothèque JSON ajoutée.'}).waitFor(); await saved(page);
  const frame = await (await page.locator('#preview').elementHandle()).contentFrame();
  await frame.waitForFunction(expected => document.title === expected, title);
  await frame.evaluate(async () => { await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); await document.fonts.ready; });
  await frame.waitForFunction(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight, null, {timeout: 10000});
  return frame;
}

test('aperçu isolé : 52 blocs jusqu’au pied de page, redimensionnement et réduction sur les deux distributions', async () => {
  const host = await server(), browser = await chromium.launch();
  try {
    for (const web of [false, true]) {
      const {page, context, observations} = await open(browser);
      if (web) { await page.goto(host.origin); await page.waitForFunction(() => MailBuilder.ready); await enterEditor(page); }
      const frame = await composition(page, true, 'Composition mesurée');
      const before = await page.evaluate(() => JSON.stringify(MailBuilder.doc()));
      for (const width of [1280, 1024, 390, 320]) {
        await page.setViewportSize({width, height: 900});
        await frame.waitForFunction(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight, null, {timeout: 10000});
        const geometry = await frame.evaluate(() => ({scroll: document.documentElement.scrollHeight, client: document.documentElement.clientHeight, last: [...document.body.children].filter(e => e.tagName !== 'SCRIPT').at(-1).getBoundingClientRect().bottom}));
        assert(geometry.scroll <= geometry.client && geometry.last <= geometry.client, JSON.stringify(geometry));
      }
      assert.equal(await page.evaluate(() => JSON.stringify(MailBuilder.doc())), before);
      assert.equal(await page.locator('#preview').getAttribute('sandbox'), 'allow-scripts');
      const large = await page.locator('#preview').evaluate(e => e.getBoundingClientRect().height);
      const small = await composition(page, false, 'Composition courte');
      const height = await page.locator('#preview').evaluate(e => e.getBoundingClientRect().height);
      assert(height < large / 2, JSON.stringify({large, height}));
      assert.equal(await small.locator('script').count(), 1);
      assert(await page.evaluate(() => MailBuilder.catalog.components.every(c => !/<script\b/i.test(MailBuilder.Render.html(MailBuilder.Model.create(c.id, [c.id]))))));
      assert.deepEqual(observations.errors, []); await context.close();
    }
  } finally { await browser.close(); await host.close(); }
});

test('aperçu : origine opaque, script étranger et réseau bloqués, messages forgés ignorés', async () => {
  const host = await server(), browser = await chromium.launch();
  try {
    await fetch(host.origin + '/forbidden'); assert.equal(host.forbidden, 1); host.reset();
    const {page, context} = await open(browser);
    await page.goto(host.origin); await page.waitForFunction(() => MailBuilder.ready); await enterEditor(page);
    const frame = await composition(page, false, 'Sécurité de l’aperçu');
    const isolation = await frame.evaluate(async endpoint => {
      let denied = false; try { parent.document; } catch (e) { denied = e.name === 'SecurityError'; }
      const script = document.createElement('script'); script.textContent = 'window.foreignScriptExecuted = true'; document.body.append(script);
      let fetchRejected = false; try { await fetch(endpoint); } catch { fetchRejected = true; }
      return {parentDenied: denied, scriptExecuted: window.foreignScriptExecuted === true, fetchRejected};
    }, host.origin + '/forbidden');
    assert.deepEqual(isolation, {parentDenied: true, scriptExecuted: false, fetchRejected: true}); assert.equal(host.forbidden, 0);
    const spoof = await page.evaluate(() => {
      const frame = document.getElementById('preview'), token = frame.src.split('#')[1], baseline = frame.style.height;
      const payload = {type: 'mail-preview-size', token, height: 1, width: frame.clientWidth};
      const messages = [{source: window, origin: 'null', data: payload}, {source: frame.contentWindow, origin: 'null', data: {...payload, token: 'ancien'}}, {source: frame.contentWindow, origin: 'null', data: {...payload, width: 0}}, {source: frame.contentWindow, origin: 'null', data: {...payload, height: -1}}, {source: frame.contentWindow, origin: location.origin, data: payload}];
      return messages.map(message => { dispatchEvent(new MessageEvent('message', message)); return frame.style.height === baseline; });
    });
    assert.deepEqual(spoof, [true, true, true, true, true]); await context.close();
  } finally { await browser.close(); await host.close(); }
});

test('la frappe continue conserve le champ et la position de lecture sans effondrement de l’aperçu', async () => {
  const host = await server(), browser = await chromium.launch();
  try {
    for (const web of [false, true]) {
      const {page, context} = await open(browser);
      if (web) { await page.goto(host.origin); await page.waitForFunction(() => MailBuilder.ready); await enterEditor(page); }
      await composition(page, true, 'Frappe continue');
      const blocks = await page.evaluate(() => [MailBuilder.doc().blocks.find(b => MailBuilder.Model.component(b.component).headings.length).id, MailBuilder.doc().blocks.find(b => b.component === 'mail-19').id]);
      for (const [index, id] of blocks.entries()) {
        await click(page, `[data-select="${id}"]`);
        const input = page.locator('textarea[data-field]').first(), initial = index ? Array(35).fill('Une ligne de contenu.').join('\n') : 'Titre';
        await input.fill(initial); await saved(page);
        const frame = await (await page.locator('#preview').elementHandle()).contentFrame();
        await frame.waitForFunction(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight);
        await input.focus(); await page.keyboard.press('ControlOrMeta+End');
        await input.evaluate(e => window.scrollTo(0, window.scrollY + e.getBoundingClientRect().bottom - innerHeight + 100));
        await input.evaluate(e => {
          const f = document.getElementById('preview');
          window.typing = {node: e, top: e.getBoundingClientRect().top, initial: f.getBoundingClientRect().height, samples: [], heights: []};
          e.addEventListener('input', () => window.typing.samples.push({same: e === document.activeElement, top: e.getBoundingClientRect().top, selection: e.selectionStart, length: e.value.length}));
          window.typing.observer = new MutationObserver(() => window.typing.heights.push(f.getBoundingClientRect().height));
          window.typing.observer.observe(f, {attributes: true, attributeFilter: ['style']});
        });
        const suffix = ' suite continue du contenu'; await input.pressSequentially(suffix, {delay: 8}); await saved(page);
        await frame.waitForFunction(text => document.body.textContent.includes(text), suffix, {timeout: 10000});
        const result = await input.evaluate(e => { const t = window.typing; t.observer.disconnect(); return {same: t.node === e, samples: t.samples, top: t.top, initial: t.initial, heights: t.heights, value: e.value}; });
        assert(result.same); assert.equal(result.value, initial + suffix); assert.equal(result.samples.length, suffix.length);
        assert(result.samples.every(s => s.same && s.selection === s.length && Math.abs(s.top - result.top) < 1), JSON.stringify(result.samples));
        assert(result.heights.every(h => h >= result.initial - 2), JSON.stringify(result.heights));
      }
      await context.close();
    }
  } finally { await browser.close(); await host.close(); }
});

test('une image chargée après la mesure agrandit puis réduit le même aperçu', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser), frame = await composition(page, false, 'Image tardive');
    const before = await page.evaluate(() => JSON.stringify(MailBuilder.doc()));
    const initial = await page.locator('#preview').evaluate(e => e.clientHeight);
    await frame.evaluate(async () => {
      const image = document.createElement('img'); image.id = 'late-image'; image.alt = 'Image de recette'; image.style.cssText = 'display:block;width:100px;height:auto';
      document.body.insertBefore(image, document.body.lastElementChild);
      const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 1200;
      image.src = canvas.toDataURL('image/png'); await image.decode();
    });
    await page.waitForFunction(height => document.getElementById('preview').clientHeight > height + 1100, initial);
    await frame.waitForFunction(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight);
    await frame.evaluate(async () => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 100; const image = document.getElementById('late-image'); image.src = canvas.toDataURL('image/png'); await image.decode(); });
    await page.waitForFunction(height => document.getElementById('preview').clientHeight < height + 200, initial);
    await frame.waitForFunction(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight);
    assert.equal(await page.evaluate(() => JSON.stringify(MailBuilder.doc())), before);
  } finally { await browser.close(); }
});

test('une mesure reçue avant le chargement du nouvel aperçu ne change pas la hauteur du cadre ; la même mesure après chargement est appliquée', async () => {
  const browser = await chromium.launch();
  try {
    const {page, context} = await open(browser);
    const frame = await composition(page, true, 'Mesure prématurée');
    const id = await page.evaluate(() => MailBuilder.doc().blocks.find(b => MailBuilder.Model.component(b.component).headings.length).id);
    await click(page, `[data-select="${id}"]`);
    const input = page.locator('textarea[data-field]').first(); await input.fill('Titre'); await saved(page);
    await frame.waitForFunction(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight);
    const result = await page.evaluate(() => {
      const f = document.getElementById('preview'), baseline = f.getBoundingClientRect().height, previousToken = f.src.split('#')[1];
      const send = (token, height) => { dispatchEvent(new MessageEvent('message', {source: f.contentWindow, origin: 'null', data: {type: 'mail-preview-size', token, height, width: f.clientWidth}})); return f.getBoundingClientRect().height; };
      window.previewRace = {send, loaded: false}; f.addEventListener('load', () => { window.previewRace.loaded = true; }, {once: true});
      /* L’état « nouveau document posé, pas encore chargé » est construit ici, pas espéré d’un rafraîchissement différé : */
      /* `show` pose un jeton neuf de façon synchrone, et la mesure partielle part dans la même tâche, comme sous Firefox. */
      MailBuilder.Preview.show(MailBuilder.doc());
      const token = f.src.split('#')[1], half = Math.round(baseline / 2);
      return {baseline, previousToken, token, premature: half, afterPremature: send(token, half), afterStale: send(previousToken, half)};
    });
    assert.notEqual(result.token, result.previousToken, JSON.stringify(result));
    assert.equal(result.afterPremature, result.baseline, JSON.stringify(result));
    assert.equal(result.afterStale, result.baseline, JSON.stringify(result));
    await page.waitForFunction(() => window.previewRace.loaded);
    const settled = await (await page.locator('#preview').elementHandle()).contentFrame();
    await settled.waitForFunction(() => document.readyState === 'complete' && document.title === 'Mesure prématurée' && document.body.textContent.includes('Titre'));
    await page.waitForFunction(baseline => Math.abs(document.getElementById('preview').getBoundingClientRect().height - baseline) <= 2, result.baseline);
    /* Contrôle négatif : une fois le document chargé, la même mesure avec le jeton courant est, elle, appliquée. */
    const applied = await page.evaluate(half => window.previewRace.send(document.getElementById('preview').src.split('#')[1], half), result.premature);
    assert(applied < result.baseline / 2 + 8 && applied >= result.premature, JSON.stringify({...result, applied}));
    await context.close();
  } finally { await browser.close(); }
});
