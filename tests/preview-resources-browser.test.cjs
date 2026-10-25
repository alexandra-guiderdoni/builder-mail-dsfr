const test = require('node:test');
const http = require('node:http');
const path = require('node:path');
const {chromium, fs, root, assert} = require('./browser-support.cjs');
const {waitForPreviewResources} = require('./preview-resources.cjs');

// Seules les contre-épreuves emploient cette borne ; la préparation normale garde 10 s.
const negativeTimeout = 250;

async function resourceServer() {
  const [png, font] = await Promise.all([
    fs.readFile(path.join(root, 'reference/dsfr-mail/assets/placeholder.16x9.png')),
    fs.readFile(path.join(root, 'reference/dsfr-web/dist/fonts/Marianne-Regular.woff2'))
  ]);
  const held = new Map(), pending = new Set();
  const reply = (response, pathname) => {
    const isFont = pathname.endsWith('.woff2');
    response.writeHead(200, {'Content-Type': isFont ? 'font/woff2' : 'image/png', 'Access-Control-Allow-Origin': '*'});
    response.end(isFont ? font : png);
  };
  const instance = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><iframe id="preview" sandbox="allow-scripts"></iframe>'); return; }
    if (pathname === '/broken.png') { response.writeHead(404); response.end('image absente'); return; }
    const gate = held.get(pathname);
    if (gate && !gate.released) {
      pending.add(response); response.on('close', () => pending.delete(response));
      gate.responses.push(response); gate.requestedResolve(); return;
    }
    reply(response, pathname);
  });
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  return {
    origin: 'http://127.0.0.1:' + instance.address().port,
    hold(pathname) {
      const gate = {responses: [], released: false};
      gate.requested = new Promise(resolve => { gate.requestedResolve = resolve; }); held.set(pathname, gate);
      return {requested: gate.requested, release() { gate.released = true; for (const response of gate.responses) reply(response, pathname); }};
    },
    async close() { for (const response of pending) response.destroy(); await new Promise(resolve => instance.close(resolve)); }
  };
}

async function withPreview(run) {
  const host = await resourceServer();
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage(); await page.goto(host.origin);
    const mount = async (body, title = 'Ressources attendues') => {
      const url = await page.evaluate(({body, title}) => {
        const url = URL.createObjectURL(new Blob([`<!doctype html><meta charset="utf-8"><title>${title}</title>${body}`], {type: 'text/html'}));
        document.getElementById('preview').src = url; return url;
      }, {body, title});
      const frame = await (await page.locator('#preview').elementHandle()).contentFrame();
      await frame.waitForFunction(expected => document.title === expected, title);
      return {frame, expected: {url, title}};
    };
    await run({host, page, mount});
  } finally {
    try { await browser?.close(); }
    finally { await host.close(); }
  }
}

test('la préparation géométrique refuse aussi une image cassée volontairement masquée', async () => {
  await withPreview(async ({host, mount}) => {
    const {frame, expected} = await mount(`<img src="${host.origin}/asset.png"><img style="display:none" src="${host.origin}/broken.png">`);
    await frame.waitForFunction(() => document.readyState === 'complete');
    await assert.rejects(waitForPreviewResources(frame, {...expected, imageCount: 2, timeout: negativeTimeout}), {name: 'TimeoutError'});
    assert.deepEqual(await frame.locator('img').nth(1).evaluate(image => ({complete: image.complete, width: image.naturalWidth, display: getComputedStyle(image).display})), {complete: true, width: 0, display: 'none'});
    await frame.locator('img').nth(1).evaluate((image, src) => { image.src = src; }, host.origin + '/asset.png');
    await waitForPreviewResources(frame, {...expected, imageCount: 2});
  });
});

test('la préparation géométrique refuse un inventaire incomplet puis accepte toutes les images', async () => {
  await withPreview(async ({host, mount}) => {
    const {frame, expected} = await mount(`<img src="${host.origin}/asset.png">`);
    await assert.rejects(waitForPreviewResources(frame, {...expected, imageCount: 2, timeout: negativeTimeout}), {name: 'TimeoutError'});
    await frame.evaluate(src => { const image = new Image(); image.src = src; document.body.append(image); }, host.origin + '/asset.png');
    await waitForPreviewResources(frame, {...expected, imageCount: 2});
  });
});

test('la préparation géométrique attend la réponse HTTP réelle d’une image retenue', async () => {
  await withPreview(async ({host, mount}) => {
    const gate = host.hold('/held.png');
    const {frame, expected} = await mount(`<img src="${host.origin}/held.png">`);
    await gate.requested;
    await assert.rejects(waitForPreviewResources(frame, {...expected, imageCount: 1, timeout: negativeTimeout}), {name: 'TimeoutError'});
    assert.equal(await frame.locator('img').evaluate(image => image.complete), false);
    gate.release();
    await waitForPreviewResources(frame, {...expected, imageCount: 1});
    assert.deepEqual(await frame.locator('img').evaluate(image => [image.naturalWidth, image.naturalHeight]), [1920, 1080]);
  });
});

test('la préparation géométrique refuse une URL ou un titre périmé puis accepte le document demandé', async () => {
  await withPreview(async ({page, mount}) => {
    const {frame, expected} = await mount('<p>Ancien document complet</p>');
    const requestedUrl = await page.evaluate(title => URL.createObjectURL(new Blob([`<!doctype html><title>${title}</title><p>Nouveau document</p>`], {type: 'text/html'})), expected.title);
    await assert.rejects(waitForPreviewResources(frame, {...expected, url: requestedUrl, imageCount: 0, timeout: negativeTimeout}), {name: 'TimeoutError'});
    await page.locator('#preview').evaluate((element, url) => { element.src = url; }, requestedUrl);
    await waitForPreviewResources(frame, {...expected, url: requestedUrl, imageCount: 0});
    await assert.rejects(waitForPreviewResources(frame, {url: requestedUrl, title: 'Titre final demandé', imageCount: 0, timeout: negativeTimeout}), {name: 'TimeoutError'});
    await frame.evaluate(() => { document.title = 'Titre final demandé'; });
    await waitForPreviewResources(frame, {url: requestedUrl, title: 'Titre final demandé', imageCount: 0});
  });
});

test('la préparation géométrique attend fonts.ready pour une vraie police HTTP retenue', async () => {
  await withPreview(async ({host, mount}) => {
    const {frame, expected} = await mount('<p>Texte témoin pour Marianne</p>');
    await frame.waitForFunction(() => document.readyState === 'complete');
    const gate = host.hold('/held.woff2');
    await frame.evaluate(url => {
      const face = new FontFace('PoliceRetenue', `url(${url})`);
      document.fonts.add(face); document.body.style.fontFamily = 'PoliceRetenue';
      document.body.getBoundingClientRect();
    }, host.origin + '/held.woff2');
    await gate.requested;
    assert.deepEqual(await frame.evaluate(() => ({ready: document.readyState, images: document.images.length, fonts: document.fonts.status, face: [...document.fonts][0].status})), {ready: 'complete', images: 0, fonts: 'loading', face: 'loading'});
    await assert.rejects(waitForPreviewResources(frame, {...expected, imageCount: 0, timeout: negativeTimeout}), {name: 'TimeoutError'});
    gate.release();
    await waitForPreviewResources(frame, {...expected, imageCount: 0});
    assert.deepEqual(await frame.evaluate(() => ({face: [...document.fonts][0].status, available: document.fonts.check('16px PoliceRetenue')})), {face: 'loaded', available: true});
  });
});
