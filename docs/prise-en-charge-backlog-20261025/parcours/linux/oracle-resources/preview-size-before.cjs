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
  await page.evaluate(() => { if (window.portabilityPreviewLoads) return; window.portabilityPreviewLoads = []; document.getElementById('preview').addEventListener('load', () => window.portabilityPreviewLoads.push(document.getElementById('preview').src)); });
  const value = await page.evaluate(({all, title}) => JSON.stringify(MailBuilder.Model.create(title, all ? MailBuilder.catalog.components.map(c => c.id) : [0])), {all, title});
  await expand(page, 'Importer du JSON'); await page.locator('#json-input').fill(value); await click(page, '[data-action=json-import]');
  await page.locator('#notice').filter({hasText: 'Composition ou bibliothèque JSON ajoutée.'}).waitFor(); await saved(page);
  const frame = await (await page.locator('#preview').elementHandle()).contentFrame();
  await frame.waitForFunction(expected => document.title === expected, title);
  await frame.evaluate(async () => { await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); await document.fonts.ready; });
  const requestedUrl = await page.locator('#preview').getAttribute('src');
  await frame.waitForFunction(expected => location.href === expected && document.documentElement.scrollHeight <= document.documentElement.clientHeight, requestedUrl, {timeout: 10000}).catch(async cause => {
    const inner = await frame.evaluate(() => ({scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight, bodyHeight: document.body.getBoundingClientRect().height, readyState: document.readyState, token: location.hash, last: [...document.body.children].filter(e => e.tagName !== 'SCRIPT').at(-1).getBoundingClientRect().bottom}));
    const outer = await page.evaluate(() => ({src: document.getElementById('preview').src, height: document.getElementById('preview').getBoundingClientRect().height, loads: window.portabilityPreviewLoads}));
    const currentFrame = await (await page.locator('#preview').elementHandle()).contentFrame();
    const current = await currentFrame.evaluate(() => ({token: location.hash, scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight}));
    throw new Error(`Aperçu initial non mesuré (${title}) : ${JSON.stringify({inner, outer, current, sameFrame: currentFrame === frame, frameUrl: frame.url(), currentUrl: currentFrame.url()})}`, {cause});
  });
  assert.equal(await frame.evaluate(() => location.href), await page.locator('#preview').getAttribute('src'), 'Le document mesuré est celui du dernier aperçu demandé');
  return frame;
}

test('une rafale de rendus ne navigue que vers le premier puis le dernier document, même sans mesure', async () => {
  const browser = await chromium.launch();
  try {
    for (const withoutMeasurements of [false, true]) {
      const {page, context} = await open(browser, {}, page => page.addInitScript(() => {
        const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
        window.previewResources = {created: [], revoked: []};
        URL.createObjectURL = function(blob) { const url = create.call(this, blob); window.previewResources.created.push(url); return url; };
        URL.revokeObjectURL = function(url) { window.previewResources.revoked.push(url); return revoke.call(this, url); };
      }));
      await composition(page, false, 'Avant rafale');
      const before = await page.evaluate(withoutMeasurements => {
        const frame = document.getElementById('preview'), baseline = frame.getBoundingClientRect().height;
        window.previewResources = {created: [], revoked: []}; window.blockedMeasures = 0;
        if (withoutMeasurements) addEventListener('message', event => { if (event.data?.type === 'mail-preview-size') { if (event.isTrusted) window.blockedMeasures++; event.stopImmediatePropagation(); } }, {capture: true});
        const initial = frame.src.split('#')[0];
        for (let index = 0; index < 40; index++) MailBuilder.Preview.show(MailBuilder.Model.create(`Rafale ${index}`, [19]));
        let invalidRejected = false; try { MailBuilder.Preview.show(null); } catch { invalidRejected = true; }
        const active = frame.src, event = new MessageEvent('message', {origin: 'null', data: {type: 'mail-preview-size', token: active.split('#')[1], height: 1, width: frame.clientWidth}});
        Object.defineProperty(event, 'source', {value: frame.contentWindow}); dispatchEvent(event);
        return {initial, active, baseline, invalidRejected, afterMessage: frame.getBoundingClientRect().height, resources: structuredClone(window.previewResources)};
      }, withoutMeasurements);
      assert(before.invalidRejected, 'Un rendu invalide est refusé sans remplacer le dernier document valide en attente');
      assert.equal(before.resources.created.length, 1, 'Une seule navigation démarre avant le premier load ; les rendus intermédiaires ne créent pas de blobs');
      assert.equal(before.afterMessage, before.baseline, 'Aucune mesure du document en cours ne redimensionne le dernier rendu encore attendu');
      const frame = await (await page.locator('#preview').elementHandle()).contentFrame();
      await frame.waitForFunction(() => document.readyState === 'complete' && document.title === 'Rafale 39', null, {timeout: 10000});
      const after = await page.evaluate(() => ({src: document.getElementById('preview').src, resources: window.previewResources, blocked: window.blockedMeasures}));
      assert.equal(await frame.evaluate(() => location.href), after.src, 'Le dernier rendu demandé est réellement chargé');
      assert.equal(after.resources.created.length, 2, 'Seuls le premier et le dernier rendu de la rafale ont une ressource navigateur');
      assert.deepEqual(after.resources.revoked, [before.initial, before.active.split('#')[0]], 'Les deux documents remplacés sont effectivement révoqués via l’API native');
      assert.deepEqual(after.resources.created.filter(url => !after.resources.revoked.includes(url)), [after.src.split('#')[0]], 'Une seule URL vivante subsiste, celle du document courant');
      if (withoutMeasurements) assert(after.blocked > 0, 'La chaîne de navigation termine même lorsque les messages de mesure sont interceptés');
      await context.close();
    }
  } finally { await browser.close(); }
});

test('import et changement de composition chargent le bon aperçu depuis l’éditeur et depuis l’accueil', async () => {
  const browser = await chromium.launch();
  try {
    for (const fromHome of [false, true]) {
      const {page, context} = await open(browser);
      const originalId = await page.locator('#documents').inputValue();
      if (fromHome) { await click(page, '[data-action=library-home]'); await page.locator('#library-home').waitFor({state: 'visible'}); }
      const title = fromHome ? 'Import depuis accueil' : 'Import depuis éditeur';
      const imported = await composition(page, true, title);
      assert(await page.locator('#editor-page').isVisible());
      assert.equal(await page.locator('#document-name').inputValue(), title);
      assert.equal(await imported.evaluate(() => location.href), await page.locator('#preview').getAttribute('src'));
      assert.match(await page.title(), new RegExp(title));
      assert.equal(await page.evaluate(() => document.activeElement.id), 'composition-title');
      if (fromHome) {
        await click(page, '[data-action=library-home]');
        await click(page, `[data-document="${originalId}"] [data-library-action=open]`);
      } else {
        await page.locator('#documents').selectOption(originalId); await click(page, '[data-action=open-document]');
      }
      await page.locator('#document-name').waitFor({state: 'visible'});
      await page.waitForFunction(() => document.getElementById('document-name').value === 'Mon premier courriel');
      const restored = await (await page.locator('#preview').elementHandle()).contentFrame();
      const requestedUrl = await page.locator('#preview').getAttribute('src');
      await restored.waitForFunction(expected => location.href === expected && document.title === 'Mon premier courriel' && document.documentElement.scrollHeight <= document.documentElement.clientHeight, requestedUrl, {timeout: 10000});
      assert.equal(await restored.evaluate(() => location.href), await page.locator('#preview').getAttribute('src'), `Composition réouverte depuis ${fromHome ? 'l’accueil' : 'l’éditeur'} : le document chargé doit correspondre à src`);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'composition-title');
      assert(await page.locator('#block-editor input,#block-editor textarea').count() > 0);
      await context.close();
    }
  } finally { await browser.close(); }
});

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
      return messages.map(({source, ...message}) => {
        // Firefox refuse le WindowProxy opaque dans le convertisseur IDL du constructeur.
        // Événement synthétique au même seam navigateur, avec la vraie référence source.
        const event = new MessageEvent('message', message); Object.defineProperty(event, 'source', {value: source});
        dispatchEvent(event); return frame.style.height === baseline;
      });
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
    /* La frappe programme un rafraîchissement différé (`state.js:previewAfterInput`) que ni `saved()` ni `Preview.show()`
       n’attendent. On observe les chargements d’aperçu pour attendre l’aperçu issu de la frappe avant d’ouvrir la course :
       sans cette attente, le rafraîchissement différé peut remplacer le document après le `load` observé, et la mesure
       finale est alors ignorée (`loaded=false` dans `preview.js`). */
    await page.evaluate(() => {
      const f = document.getElementById('preview');
      window.previewLoads = [f.src.split('#')[1]];
      f.addEventListener('load', () => { window.previewLoads.push(f.src.split('#')[1]); });
    });
    const input = page.locator('textarea[data-field]').first(); await input.fill('Titre'); await saved(page);
    /* Attendre l’aperçu issu de la frappe : au moins un chargement supplémentaire dont le jeton diffère du jeton initial. */
    await page.waitForFunction(() => window.previewLoads.length >= 2 && window.previewLoads[window.previewLoads.length - 1] !== window.previewLoads[0], null, {timeout: 10000});
    const typed = await (await page.locator('#preview').elementHandle()).contentFrame();
    await typed.waitForFunction(() => document.readyState === 'complete' && document.body.textContent.includes('Titre'));
    await typed.waitForFunction(() => document.documentElement.scrollHeight <= document.documentElement.clientHeight);
    const result = await page.evaluate(() => {
      const f = document.getElementById('preview'), baseline = f.getBoundingClientRect().height, previousToken = f.src.split('#')[1];
      const send = (token, height) => { const event = new MessageEvent('message', {origin: 'null', data: {type: 'mail-preview-size', token, height, width: f.clientWidth}}); Object.defineProperty(event, 'source', {value: f.contentWindow}); dispatchEvent(event); return f.getBoundingClientRect().height; };
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
    /* Invariant : aucun rafraîchissement différé n’a succédé à la course ; le jeton courant doit rester `result.token`. */
    const finalToken = await page.evaluate(() => document.getElementById('preview').src.split('#')[1]);
    assert.equal(finalToken, result.token, `jeton final attendu ${result.token}, observé ${finalToken} ; chargements : ${JSON.stringify(await page.evaluate(() => window.previewLoads))}`);
    /* Contrôle négatif : une fois le document chargé, la même mesure avec le jeton courant est, elle, appliquée. */
    const applied = await page.evaluate(half => window.previewRace.send(document.getElementById('preview').src.split('#')[1], half), result.premature);
    assert(applied < result.baseline / 2 + 8 && applied >= result.premature, JSON.stringify({...result, applied}));
    // Contrôle positif indépendant : la même frontière accepte aussi un vrai postMessage
    // issu du document opaque. Aucun appel direct au gestionnaire applicatif.
    await page.evaluate(height => {
      window.realPreviewMessage = null;
      const observe = event => {
        if (event.data?.height !== height || event.source !== document.getElementById('preview').contentWindow) return;
        window.realPreviewMessage = {origin: event.origin, height: document.getElementById('preview').clientHeight}; removeEventListener('message', observe);
      };
      addEventListener('message', observe);
    }, result.premature + 20);
    await settled.evaluate(height => parent.postMessage({type: 'mail-preview-size', token: location.hash.slice(1), height, width: innerWidth}, '*'), result.premature + 20);
    await page.waitForFunction(() => window.realPreviewMessage, null, {timeout: 5000});
    assert.deepEqual(await page.evaluate(() => window.realPreviewMessage), {origin: 'null', height: result.premature + 21});
    await context.close();
  } finally { await browser.close(); }
});
