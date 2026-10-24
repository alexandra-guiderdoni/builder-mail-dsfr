const test = require('node:test');
const {open, enterEditor, expand, selectBlock, saved, state, assert} = require('./browser-support.cjs');
const {chromium, webkit} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Contrat décidé le 24 octobre 2026 (#33) : toutes les images ci-dessous sont synthétiques, générées par le test.
const KIB = 1024, MIB = 1024 * 1024;
const DISPLAY = {
  'mail-02': {f0: 76, f2: 76}, 'mail-03': {f0: 76, f2: 76, f4: 80}, 'mail-04': {f0: 150}, 'mail-06': {f1: 140},
  'mail-26': {f0: 500}, 'mail-27': {f0: 500}, 'mail-28': {f0: 500}, 'mail-29': {f0: 500}, 'mail-30': {f0: 125}, 'mail-31': {f0: 125},
  'mail-32': {f2: 130}, 'mail-33': {f4: 130}, 'mail-37': {f1: 500}, 'mail-38': {f1: 500}, 'mail-46': {f1: 460, f6: 460},
  'mail-47': {f3: 76, f5: 76}, 'mail-48': {f3: 76, f5: 76, f7: 80},
};

// GIF sans compression : codes LZW de 8 bits, effacement de table toutes les 100 valeurs.
function gif(width, height, frames) {
  const u16 = value => Buffer.from([value & 255, value >> 8]);
  const palette = Buffer.alloc(128 * 3);
  for (let i = 0; i < 128; i++) palette.set([(i * 2) & 255, (i * 37) & 255, 255 - i * 2], i * 3);
  const parts = [Buffer.from('GIF89a'), u16(width), u16(height), Buffer.from([0xF6, 0, 0]), palette];
  if (frames.length > 1) parts.push(Buffer.from([0x21, 0xFF, 0x0B]), Buffer.from('NETSCAPE2.0'), Buffer.from([3, 1, 0, 0, 0]));
  for (const frame of frames) {
    parts.push(Buffer.from([0x21, 0xF9, 4, 0, 10, 0, 0, 0, 0x2C]), u16(0), u16(0), u16(width), u16(height), Buffer.from([0, 7]));
    const codes = [128];
    for (let y = 0, run = 0; y < height; y++) for (let x = 0; x < width; x++, run++) { if (run === 100) { codes.push(128); run = 0; } codes.push(frame(x, y)); }
    codes.push(129);
    for (let i = 0; i < codes.length; i += 255) { const chunk = codes.slice(i, i + 255); parts.push(Buffer.from([chunk.length, ...chunk])); }
    parts.push(Buffer.from([0]));
  }
  return Buffer.concat([...parts, Buffer.from([0x3B])]);
}

let fixtures;
async function synthetic() {
  if (fixtures) return fixtures;
  const browser = await chromium.launch({headless: true});
  try {
    const page = await browser.newPage();
    const images = await page.evaluate(async () => {
      const random = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const draw = (width, height, paint) => { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; paint(canvas.getContext('2d'), width, height); return canvas; };
      const encode = (canvas, type, quality) => new Promise(resolve => canvas.toBlob(blob => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.slice(reader.result.indexOf(',') + 1)); reader.readAsDataURL(blob); }, type, quality));
      const scene = (ctx, w, h) => {
        const gradient = ctx.createLinearGradient(0, 0, w, h); gradient.addColorStop(0, '#2a5d8f'); gradient.addColorStop(.5, '#e8c07a'); gradient.addColorStop(1, '#3f7a3a');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h); const r = random(7);
        for (let i = 0; i < 400; i++) { ctx.fillStyle = `hsla(${r() * 360},60%,${30 + r() * 40}%,.5)`; ctx.beginPath(); ctx.arc(r() * w, r() * h, 20 + r() * 200, 0, 7); ctx.fill(); }
      };
      const grain = (amplitude, seed) => (ctx, w, h) => {
        const data = ctx.getImageData(0, 0, w, h), r = random(seed);
        for (let i = 0; i < data.data.length; i += 4) { const n = (r() - .5) * amplitude; data.data[i] += n; data.data[i + 1] += n; data.data[i + 2] += n; }
        ctx.putImageData(data, 0, 0);
      };
      const noise = (ctx, w, h) => { const data = ctx.createImageData(w, h), r = random(11); for (let i = 0; i < data.data.length; i += 4) data.data.set([r() * 256, r() * 256, 128, 255], i); ctx.putImageData(data, 0, 0); };
      const disc = (ctx, w, h) => { ctx.fillStyle = '#000091'; ctx.beginPath(); ctx.arc(w / 2, h / 2, h / 3, 0, 7); ctx.fill(); };
      return {
        photo: {type: 'image/jpeg', data: await encode(draw(4000, 3000, (ctx, w, h) => { scene(ctx, w, h); grain(24, 3)(ctx, w, h); }), 'image/jpeg', .95)},
        heavyPng: {type: 'image/png', data: await encode(draw(1800, 1350, noise), 'image/png')},
        webp: {type: 'image/webp', data: await encode(draw(1600, 900, scene), 'image/webp', .9)},
        transparentPng: {type: 'image/png', data: await encode(draw(2400, 1200, disc), 'image/png')},
        smallJpeg: {type: 'image/jpeg', data: await encode(draw(400, 300, scene), 'image/jpeg', .3)},
      };
    });
    fixtures = Object.fromEntries(Object.entries(images).map(([name, {type, data}]) => [name, {type, buffer: Buffer.from(data, 'base64')}]));
    fixtures.animatedGif = {type: 'image/gif', buffer: gif(120, 80, [(x, y) => (x + y) % 128, (x, y) => (x * y) % 128])};
    fixtures.heavyGif = {type: 'image/gif', buffer: gif(400, 300, Array.from({length: 10}, (_, f) => (x, y) => (x * 7 + y * 13 + f * 31) % 128))};
    fixtures.staticGif = {type: 'image/gif', buffer: gif(300, 200, [(x, y) => (x >> 4) % 128])};
    for (const value of Object.values(fixtures)) value.url = `data:${value.type};base64,${value.buffer.toString('base64')}`;
    assert(fixtures.photo.buffer.length > 2 * MIB && fixtures.photo.buffer.length < 10 * MIB, 'grande photo de 2 à 10 Mio');
    assert(fixtures.heavyPng.buffer.length > 4 * MIB && fixtures.heavyPng.buffer.length < 10 * MIB, 'PNG lourd de 4 à 10 Mio');
    assert(fixtures.webp.buffer.subarray(8, 12).toString() === 'WEBP', 'WebP réel');
    assert(fixtures.heavyGif.buffer.length > MIB && fixtures.animatedGif.buffer.length < MIB, 'GIF animés de part et d’autre de 1 Mio');
    return fixtures;
  } finally { await browser.close(); }
}

const inspect = (page, blockId, key) => page.evaluate(async ({blockId, key}) => {
  const value = MailBuilder.doc().blocks.find(b => b.id === blockId).values[key], image = new Image(); image.src = value; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); const alpha = (x, y) => ctx.getImageData(x, y, 1, 1).data[3];
  return {value, type: /^data:([^;]+);/.exec(value)[1], width: image.naturalWidth, height: image.naturalHeight, bytes: atob(value.slice(value.indexOf(',') + 1)).length, corner: alpha(2, 2), center: alpha(image.naturalWidth >> 1, image.naturalHeight >> 1)};
}, {blockId, key});

async function upload(page, blockId, key, fixture, name) {
  await page.evaluate(() => { MailBuilder.notice(''); MailBuilder.error(''); });
  await selectBlock(page, blockId);
  await page.locator(`[data-image-field=${key}]`).setInputFiles({name, mimeType: fixture.type, buffer: fixture.buffer});
  await page.waitForFunction(() => MailBuilder.pendingInputs === 0 && (document.querySelector('#notice').textContent.startsWith('Image locale incorporée') || !document.querySelector('#error').hidden), null, {timeout: 60000});
  return page.evaluate(() => ({notice: document.querySelector('#notice').textContent, error: document.querySelector('#error').hidden ? '' : document.querySelector('#error').textContent}));
}

async function prepare(page) {
  const ids = await page.evaluate(async () => {
    const M = MailBuilder.Model, added = [M.createBlock(27), M.createBlock(46)];
    await MailBuilder.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).blocks.push(...added); });
    return {header: MailBuilder.doc().blocks[0].id, picture: added[0].id, cards: added[1].id};
  });
  await saved(page); return ids;
}

for (const engine of [chromium, webkit]) {
  test(`${engine.name()} : le contrat chiffré est annoncé près du champ d’image et suit la largeur du gabarit`, async () => {
    const browser = await engine.launch({headless: true});
    try {
      const {page} = await open(browser), ids = await prepare(page);
      await selectBlock(page, ids.picture);
      const help = await page.locator('#field-f0').evaluate(input => (input.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)).filter(Boolean).map(e => ({text: e.textContent, visible: e.checkVisibility()})));
      assert.equal(help.length, 1, 'une aide d’import liée au champ');
      assert(help[0].visible);
      for (const expected of [/PNG, JPEG, GIF ou WebP/, /10 Mio/, /8192 pixels par côté/, /16\s777\s216 pixels au total/, /1\s000 pixels de large/, /JPEG/, /PNG/, /transparence/, /WebP est converti/, /GIF animé/, /1 Mio/, /300 Kio/, /déjà présentes ne sont pas modifiées/]) assert.match(help[0].text, expected);
      await selectBlock(page, ids.header);
      assert.match(await page.locator('#field-f0').evaluate(input => document.getElementById(input.getAttribute('aria-describedby')).textContent), /152 pixels de large/);
      const contract = await page.evaluate(() => ({target: [76, 460, 500, 600, 700, 0, undefined].map(MailBuilder.Images.targetWidth), display: Object.fromEntries(MailBuilder.catalog.components.filter(c => c.fields.some(f => f.type === 'image')).map(c => [c.id, Object.fromEntries(c.fields.filter(f => f.type === 'image').map(f => [f.key, MailBuilder.Images.displayWidth(c.id, f.key)]))]))}));
      assert.deepEqual(contract, {target: [152, 920, 1000, 1200, 1200, 1200, 1200], display: DISPLAY});
    } finally { await browser.close(); }
  });

  test(`${engine.name()} : une nouvelle image est réduite, recompressée et signalée au-delà de 300 Kio`, async () => {
    const images = await synthetic(), browser = await engine.launch({headless: true});
    try {
      const {page, observations} = await open(browser), ids = await prepare(page), results = [];
      const check = async (blockId, key, fixture, name, expected) => {
        const outcome = await upload(page, blockId, key, fixture, name);
        assert.equal(outcome.error, '', name);
        const image = await inspect(page, blockId, key);
        results.push({name, ...expected, bytes: image.bytes});
        assert.deepEqual([image.type, image.width, image.height], [expected.type, expected.width, expected.height], name);
        assert.equal(/Attention/.test(outcome.notice), image.bytes > 300 * KIB, `${name} : avertissement au-delà de 300 Kio (${image.bytes} octets)`);
        if (image.bytes > 300 * KIB) assert.match(outcome.notice, new RegExp(`${Math.ceil(image.bytes / KIB).toLocaleString('fr-FR')} Kio.*300 Kio`), name);
        return {image, outcome};
      };
      const photo = await check(ids.picture, 'f0', images.photo, 'photo.jpg', {type: 'image/jpeg', width: 1000, height: 750});
      assert(photo.image.bytes < images.photo.buffer.length / 4, 'la grande photo est allégée');
      assert.match(photo.outcome.notice, /1\s000 × 750 pixels, JPEG/);
      await check(ids.header, 'f0', images.photo, 'logo.jpg', {type: 'image/jpeg', width: 152, height: 114});
      await check(ids.cards, 'f1', images.photo, 'carte.jpg', {type: 'image/jpeg', width: 920, height: 690});
      const heavy = await check(ids.picture, 'f0', images.heavyPng, 'lourd.png', {type: 'image/jpeg', width: 1000, height: 750});
      assert(heavy.image.bytes > 300 * KIB && heavy.image.bytes < images.heavyPng.buffer.length, 'le PNG lourd est converti et signalé');
      await check(ids.picture, 'f0', images.webp, 'visuel.webp', {type: 'image/jpeg', width: 1000, height: 563});
      const transparent = await check(ids.picture, 'f0', images.transparentPng, 'transparent.png', {type: 'image/png', width: 1000, height: 500});
      assert.deepEqual([transparent.image.corner, transparent.image.center], [0, 255], 'la transparence est conservée');
      const staticGif = await check(ids.picture, 'f0', images.staticGif, 'fixe.gif', {type: 'image/jpeg', width: 300, height: 200});
      assert(!/réduite/.test(staticGif.outcome.notice), 'une image plus étroite que la cible n’est pas agrandie');
      const small = await check(ids.picture, 'f0', images.smallJpeg, 'petite.jpg', {type: 'image/jpeg', width: 400, height: 300});
      assert.equal(small.image.value, images.smallJpeg.url, 'une recompression plus lourde n’est pas retenue');
      const animated = await check(ids.picture, 'f0', images.animatedGif, 'anime.gif', {type: 'image/gif', width: 120, height: 80});
      assert.equal(animated.image.value, images.animatedGif.url, 'le GIF animé est conservé tel quel');
      assert.match(animated.outcome.notice, /GIF animé conservé tel quel/);

      await saved(page); const before = await state(page);
      const refused = await upload(page, ids.picture, 'f0', images.heavyGif, 'lourd.gif');
      assert.match(refused.error, /GIF animé.*1,2 Mio.*1 Mio/);
      assert.deepEqual(await state(page), before, 'le GIF animé trop lourd ne modifie rien');
      assert.deepEqual(observations.errors, []);
      assert(observations.requests.every(url => /^(file|data|blob):/.test(url)), 'aucune requête réseau');
      console.log(`${engine.name()} : ${results.map(r => `${r.name} ${r.width}×${r.height} ${r.type} ${r.bytes} o`).join(' ; ')}`);
    } finally { await browser.close(); }
  });

  test(`${engine.name()} : un fichier mal étiqueté ou une réduction défaillante est refusé sans modifier la composition`, async () => {
    const images = await synthetic(), browser = await engine.launch({headless: true});
    try {
      const {page, observations} = await open(browser), ids = await prepare(page), before = await state(page);
      const mislabeled = await upload(page, ids.picture, 'f0', {...images.animatedGif, type: 'image/png'}, 'anime.png');
      assert.match(mislabeled.error, /format annoncé|illisible/, 'un GIF présenté comme PNG est refusé comme avant #33');
      assert.deepEqual(await state(page), before);
      await page.evaluate(() => { const encode = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function(callback) { return encode.call(this, callback, 'image/png'); }; });
      const fallback = await upload(page, ids.picture, 'f0', images.photo, 'photo.jpg');
      assert.match(fallback.error, /réduction a échoué/, 'un encodage dans un autre format que celui demandé est refusé');
      assert.deepEqual(await state(page), before); assert.equal(await page.evaluate(() => MailBuilder.pendingInputs), 0);
      assert.deepEqual(observations.errors, []);
    } finally { await browser.close(); }
  });

  test(`${engine.name()} : les fichiers de travail et la bibliothèque existants gardent leurs images octet pour octet`, async () => {
    const images = await synthetic(), browser = await engine.launch({headless: true});
    try {
      const {page} = await open(browser);
      const originals = ['photo', 'heavyPng', 'webp', 'transparentPng', 'heavyGif', 'staticGif'].map(name => images[name].url);
      const incoming = await page.evaluate(originals => {
        const M = MailBuilder.Model, lib = M.initial(), doc = M.create('Fichier de travail existant', originals.map(() => 27));
        originals.forEach((src, i) => { doc.blocks[i].values.f0 = src; });
        lib.documents.push(doc); lib.activeId = doc.id; lib.templates.push(M.clone(doc, 'Modèle existant')); return lib;
      }, originals);
      await expand(page, 'Fichiers et récupération');
      await page.locator('#project-input').setInputFiles({name: 'existant.courriels.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming))});
      await page.waitForFunction(() => MailBuilder.doc().name === 'Fichier de travail existant' && MailBuilder.pendingInputs === 0, null, {timeout: 60000});
      await saved(page);
      const values = lib => [lib.documents.find(d => d.name === 'Fichier de travail existant'), lib.templates.find(t => t.name === 'Modèle existant')].map(d => d.blocks.map(b => b.values.f0));
      assert.deepEqual(values(await state(page)), [originals, originals], 'import sans recompression');
      await page.reload(); await page.waitForFunction(() => window.MailBuilder?.ready); await enterEditor(page);
      assert.deepEqual(values(await state(page)), [originals, originals], 'restauration sans recompression');
      const first = (await state(page)).documents.find(d => d.name === 'Fichier de travail existant').blocks[0].id;
      const outcome = await upload(page, first, 'f0', images.webp, 'nouvelle.webp');
      assert.equal(outcome.error, ''); await saved(page);
      const after = values(await state(page));
      assert.notEqual(after[0][0], originals[0]); assert.deepEqual(after[0].slice(1), originals.slice(1), 'les autres images existantes restent intactes');
      assert.deepEqual(after[1], originals);
    } finally { await browser.close(); }
  });
}
