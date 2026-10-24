const test = require('node:test'), path = require('node:path');
const {root, open, click, fs, assert} = require('./browser-support.cjs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// #35 : le poids affiché est celui du HTML réellement remis au presse-papiers, en octets UTF-8.
const NOTICE = 90 * 1024, ALERT = 102 * 1024, PAUSE = 500;
const converterURL = 'file://' + path.join(root, 'app/distribution/snum.html');
const bytes = value => Buffer.byteLength(value, 'utf8');
const count = (text, part) => text.split(part).length - 1;
// Capture du contenu remis à l’API du presse-papiers ; l’écriture réelle a lieu ensuite.
const capture = page => page.addInitScript(() => {
  window.__clipboard = [];
  const Original = window.ClipboardItem;
  if (Original) window.ClipboardItem = class extends Original { constructor(items, options) { super(items, options); window.__clipboard.push(items); } };
});
const copied = page => page.evaluate(async () => {
  const items = window.__clipboard.at(-1), blob = items?.['text/html'];
  return {count: window.__clipboard.length, ...(blob ? {size: blob.size, text: await blob.text()} : {})};
});
const displayed = (page, expected) => page.waitForFunction(expected => document.getElementById('mail-weight')?.dataset.bytes === String(expected), expected, {timeout: 10000});
const clipboardHtml = page => page.evaluate(() => MailBuilder.Render.clipboardHtml(MailBuilder.doc()));
const index = (page, id) => page.evaluate(id => MailBuilder.catalog.components.findIndex(c => c.id === id), id);
const permissions = engine => engine === 'chromium' ? {permissions: ['clipboard-read', 'clipboard-write']} : {};

// Modification de la composition active par le chemin d’état de l’application (sauvegarde et rafraîchissement).
const compose = (page, mutate, argument) => page.evaluate(mutate, argument);

for (const engine of ['chromium', 'webkit']) {
  test(`${engine} : poids affiché et copié, accents et images compris`, async () => {
    const browser = await playwright[engine].launch();
    try {
      const {page, observations} = await open(browser, {offline: true, ...permissions(engine)}, capture);
      assert.match(await page.locator('[data-action=copy]').getAttribute('aria-describedby') || '', /\bmail-weight\b/);
      const article = await index(page, 'mail-31');
      await compose(page, article => MailBuilder.State.change(lib => {
        const doc = lib.documents.find(d => d.id === lib.activeId);
        doc.subject = 'Lettre d’été : à découvrir, œuvres et façades'; doc.blocks = MailBuilder.Model.create('Poids', [article]).blocks;
        Object.assign(doc.blocks[0].values, {f2: 'Déjà « prêt » ?', f4: 'Événements à Noël — à l’œuvre', f5: 'Ça s’écrit ainsi 😀'});
      }), article);
      const first = await clipboardHtml(page);
      await displayed(page, bytes(first));
      assert.ok(bytes(first) > first.length, 'les accents comptent plusieurs octets');
      const image = first.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/)[0];
      // Image synthétique plus lourde du dépôt : l’écart de poids est celui de sa donnée incorporée.
      const replacement = 'data:image/png;base64,' + (await fs.readFile(path.join(root, 'app/assets/icon-512.png'))).toString('base64');
      assert.notEqual(replacement, image);
      await compose(page, image => MailBuilder.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).blocks[0].values.f0 = image; }), replacement);
      const second = await clipboardHtml(page);
      await displayed(page, bytes(second));
      assert.equal(count(second, replacement), count(first, image));
      assert.ok(count(second, replacement) >= 1);
      assert.equal(bytes(second) - bytes(first), count(second, replacement) * (replacement.length - image.length));
      assert.equal(await page.locator('#mail-weight').getAttribute('data-level'), 'ok');
      await click(page, '[data-action=copy]');
      await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
      const result = await copied(page);
      assert.equal(result.text, second, 'le HTML remis au presse-papiers est celui qui a été pesé');
      assert.equal(result.size, bytes(second));
      assert.equal(await page.locator('#mail-weight').getAttribute('data-bytes'), String(result.size));
      // Écriture refusée après une copie réussie : l’erreur s’affiche, sans annonce de succès périmée.
      await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'write', {configurable: true, value: () => Promise.reject(new DOMException('Écriture refusée pour la recette.', 'NotAllowedError'))}));
      await compose(page, () => MailBuilder.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).subject += ' modifié'; }));
      await click(page, '[data-action=copy]');
      await page.locator('#error').filter({hasText: 'Écriture refusée pour la recette.'}).waitFor();
      assert.equal(await page.locator('#notice').textContent(), '', 'aucune annonce « Courriel copié » périmée');
      assert.deepEqual(observations.errors, []);
    } finally { await browser.close(); }
  });

  test(`${engine} : repères à 90 et 102 Kio autour des seuils, sans blocage de la copie`, async () => {
    const browser = await playwright[engine].launch();
    try {
      const {page} = await open(browser, {offline: true, ...permissions(engine)}, capture);
      const text = await page.evaluate(() => MailBuilder.catalog.components.findIndex(c => c.fields.length && c.fields.every(f => f.type === 'text')));
      await compose(page, text => MailBuilder.State.change(lib => { const doc = lib.documents.find(d => d.id === lib.activeId); doc.blocks = MailBuilder.Model.create('Seuils', [text]).blocks; doc.subject = 'a'; }), text);
      const base = bytes(await clipboardHtml(page));
      assert.ok(base < NOTICE - 1);
      for (const [target, level] of [[NOTICE - 1, 'ok'], [NOTICE, 'notice'], [ALERT - 1, 'notice'], [ALERT, 'alert']]) {
        // L’objet n’apparaît qu’une fois, dans le titre : chaque « a » ajoute un octet.
        await compose(page, length => MailBuilder.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).subject = 'a'.repeat(length); }), target - base + 1);
        assert.equal(bytes(await clipboardHtml(page)), target);
        await displayed(page, target);
        const weight = page.locator('#mail-weight');
        assert.equal(await weight.getAttribute('data-level'), level, String(target));
        const label = await weight.textContent();
        assert.ok(label.includes(target.toLocaleString('fr-FR') + ' octets'), label);
        if (level === 'ok') assert.doesNotMatch(label, /Attention|Alerte/);
        else assert.match(label, new RegExp((level === 'alert' ? 'Alerte' : 'Attention') + '.*Repères prudents, sans garantie'));
        const before = (await copied(page)).count;
        await page.evaluate(() => { document.getElementById('notice').textContent = ''; });
        await click(page, '[data-action=copy]');
        const notice = page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'});
        await notice.waitFor();
        const result = await copied(page);
        assert.equal(result.count, before + 1, 'la copie a lieu');
        assert.equal(result.size, target);
        const message = await notice.textContent();
        if (level === 'ok') assert.doesNotMatch(message, /Attention|Alerte/);
        else assert.match(message, new RegExp((level === 'alert' ? 'Alerte' : 'Attention') + '.*Repères prudents, sans garantie'));
        assert.equal(await page.locator('#error').isVisible(), false);
      }
    } finally { await browser.close(); }
  });

  test(`${engine} : aucun calcul du poids pendant la frappe, un seul après la pause`, async () => {
    const browser = await playwright[engine].launch();
    try {
      const {page} = await open(browser, {offline: true, ...permissions(engine)}, capture);
      const article = await index(page, 'mail-31');
      await compose(page, article => MailBuilder.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).blocks = MailBuilder.Model.create('Frappe', [article]).blocks; }), article);
      await displayed(page, bytes(await clipboardHtml(page)));
      await page.evaluate(() => {
        window.__inputs = []; window.__weights = []; window.__renders = [];
        document.addEventListener('input', () => window.__inputs.push(performance.now()), true);
        // Seuls clipboardHtml et exportHtml analysent le HTML : chaque analyse est un rendu de copie coûteux.
        const parse = DOMParser.prototype.parseFromString;
        DOMParser.prototype.parseFromString = function (...args) { window.__renders.push(performance.now()); return parse.apply(this, args); };
        new MutationObserver(() => window.__weights.push({at: performance.now(), bytes: document.getElementById('mail-weight').dataset.bytes})).observe(document.getElementById('mail-weight'), {attributes: true, childList: true, characterData: true, subtree: true});
      });
      const field = page.locator('#field-f4');
      await field.focus(); await field.press('End');
      await field.pressSequentially('abcdefghijklmnopqrstuvwxy', {delay: 60});
      const final = bytes(await clipboardHtml(page));
      await displayed(page, final);
      const {inputs, weights, renders} = await page.evaluate(() => ({inputs: window.__inputs, weights: window.__weights, renders: window.__renders}));
      assert.equal(inputs.length, 25);
      // L’oracle du test lui-même (clipboardHtml après la frappe) est exclu : seuls les rendus antérieurs comptent.
      const during = renders.filter(at => at >= inputs[0] && at <= inputs.at(-1));
      assert.ok(during.every(at => at - Math.max(...inputs.filter(i => i <= at)) >= PAUSE - 20), `${during.length} rendus de copie pendant la frappe`);
      assert.ok(weights.length >= 1);
      // Chaque mise à jour du poids suit une pause de saisie : jamais pendant une frappe soutenue.
      for (const update of weights) {
        const last = Math.max(...inputs.filter(at => at <= update.at));
        assert.ok(update.at - last >= PAUSE - 20, `poids recalculé ${Math.round(update.at - last)} ms après une frappe`);
      }
      const gaps = inputs.slice(1).map((at, i) => at - inputs[i]).filter(gap => gap >= PAUSE - 20).length;
      assert.ok(weights.length <= gaps + 1, `${weights.length} calculs pour ${gaps} pauses`);
      assert.equal(weights.at(-1).bytes, String(final));
      // Copie lancée avant la fin de la pause : le poids affiché devient aussitôt celui du HTML copié.
      const immediate = await page.evaluate(async () => {
        MailBuilder.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).subject += ' — copie immédiate'; });
        const before = document.getElementById('mail-weight').dataset.bytes, copying = MailBuilder.Files.copy();
        const shown = document.getElementById('mail-weight').dataset.bytes;
        await copying;
        return {before, shown, html: MailBuilder.Render.clipboardHtml(MailBuilder.doc())};
      });
      const result = await copied(page);
      assert.equal(immediate.before, String(final), 'aucun calcul avant la pause');
      assert.equal(result.text, immediate.html);
      assert.equal(immediate.shown, String(result.size));
      assert.equal(result.size, bytes(immediate.html));
    } finally { await browser.close(); }
  });

  test(`${engine} : poids indisponible tant que la copie est refusée, puis convertisseur SNUM`, async () => {
    const browser = await playwright[engine].launch();
    try {
      const {page, context} = await open(browser, {offline: true, ...permissions(engine)}, capture);
      const footer = await index(page, 'mail-50');
      await compose(page, footer => MailBuilder.State.change(lib => {
        const doc = lib.documents.find(d => d.id === lib.activeId);
        doc.blocks = MailBuilder.Model.create('Refus', [footer]).blocks; doc.blocks[0].additionalLinks = [{url: 'https://exemple.invalid/lien', label: ' '}];
      }), footer);
      await page.waitForFunction(() => document.getElementById('mail-weight')?.dataset.level === 'unavailable', null, {timeout: 10000});
      assert.match(await page.locator('#mail-weight').textContent(), /indisponible/);
      assert.equal(await page.locator('#mail-weight').getAttribute('data-bytes'), null);
      await click(page, '[data-action=copy]');
      await page.locator('#error').filter({hasText: 'intitulé'}).waitFor();
      assert.equal((await copied(page)).count, 0);

      const converter = await context.newPage(); await capture(converter);
      await converter.goto(converterURL); await converter.waitForFunction(() => window.MailBuilder?.ready);
      assert.match(await converter.locator('#copy').getAttribute('aria-describedby') || '', /\bmail-weight\b/);
      await converter.locator('#snum-input').fill(JSON.stringify(require('./fixtures/snum.cjs')()));
      await click(converter, '#convert');
      const html = await clipboardHtml(converter);
      await displayed(converter, bytes(html));
      await click(converter, '#copy'); await converter.locator('#notice').filter({hasText: 'Courriel copié'}).waitFor();
      const result = await copied(converter);
      assert.equal(result.text, html); assert.equal(result.size, bytes(html));
      await converter.locator('#snum-input').fill('{}');
      assert.equal(await converter.locator('#mail-weight').getAttribute('data-level'), 'pending');
      assert.equal(await converter.locator('#mail-weight').getAttribute('data-bytes'), null);
    } finally { await browser.close(); }
  });
}
