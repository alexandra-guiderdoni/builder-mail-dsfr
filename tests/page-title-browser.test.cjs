const test = require('node:test'), path = require('node:path'), {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const {root, evidence, open, click, expand, saved, state, download, chromium, fs, assert} = require('./browser-support.cjs');
const output = path.join(evidence, 'page-title');
async function receipt(name, observations, completed) {
  await fs.mkdir(output, {recursive: true});
  const files = ['app/source/render.js', 'app/source/model.js', 'app/source/shell.html', 'app/distribution/portable.html', 'app/distribution/web/index.html', 'app/distribution/snum.html'];
  const sourceSha256 = Object.fromEntries(await Promise.all(files.map(async file => [file, createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex')])));
  await fs.writeFile(path.join(output, name + '.json'), JSON.stringify({completed, method: 'Distribution réelle, CSP conservée, profil isolé ; téléchargement puis ouverture du fichier, aperçu sandboxé et presse-papiers HTML', humanQualification: false, screenReaderExecuted: false, sourceSha256, observations}, null, 2));
}
async function exportedTitle(context, filename, expected) {
  const exported = await context.newPage();
  try {
    await exported.goto(pathToFileURL(path.resolve(filename)).href); assert.equal(await exported.title(), expected);
    const cdp = await context.newCDPSession(exported), {nodes} = await cdp.send('Accessibility.getFullAXTree'); await cdp.detach();
    const root = nodes.find(n => !n.ignored && n.role?.value === 'RootWebArea');
    assert.equal(root.name.value, expected); return {title: await exported.title(), nativeRoot: root};
  } finally { await exported.close(); }
}
async function previewTitle(page, expected) {
  const frame = await (await page.locator('#preview').elementHandle()).contentFrame();
  assert(frame, 'Le cadre d’aperçu doit être disponible.');
  await frame.waitForFunction(value => document.title === value, expected);
  return frame.title();
}

test('objet facultatif : aperçu et téléchargement titrés ; transformation du presse-papiers consignée', async () => {
  const browser = await chromium.launch(), observations = []; let completed = false;
  try {
    const {page, context} = await open(browser, {permissions: ['clipboard-read', 'clipboard-write']});
    const name = 'Édition & <dossier> "suivi"';
    await page.locator('#document-name').fill(name); await saved(page);
    const help = await page.locator('#subject').evaluate(e => ({required: e.getAttribute('aria-required'), descriptions: (e.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => ({id, visible: document.getElementById(id)?.checkVisibility(), text: document.getElementById(id)?.textContent}))}));
    assert.equal(help.required, null); assert(help.descriptions.some(d => d.visible && /nom.*composition.*titre/i.test(d.text)));
    observations.push({step: 'help', ...help}); await expand(page, 'Fichiers et récupération');
    for (const [i, subject] of ['', '   ', 'Objet prioritaire & suivi'].entries()) {
      await page.locator('#subject').fill(subject); await saved(page);
      const before = await state(page), expected = subject.trim() ? subject : name;
      const observedPreviewTitle = await previewTitle(page, expected); assert.equal(observedPreviewTitle, expected);
      const filename = await download(page, '[data-action=export-mail]', `titre-${i}.html`);
      const exported = await exportedTitle(context, filename, expected);
      const json = JSON.parse(await fs.readFile(await download(page, '[data-action=export-document]', `titre-${i}.json`), 'utf8'));
      assert.equal(json.subject, subject); assert.equal(json.name, name);
      const producedTitle = await page.evaluate(() => new DOMParser().parseFromString(MailBuilder.Render.clipboardHtml(MailBuilder.doc()), 'text/html').title);
      assert.equal(producedTitle, expected);
      await click(page, '[data-action=copy]'); await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
      const clipboard = await page.evaluate(async () => {
        const [raw] = await navigator.clipboard.read({unsanitized: ['text/html']}), [filtered] = await navigator.clipboard.read();
        const title = async item => new DOMParser().parseFromString(await (await item.getType('text/html')).text(), 'text/html').title;
        return {rawTitle: await title(raw), filteredTitle: await title(filtered), plain: await (await raw.getType('text/plain')).text(), expectedPlain: MailBuilder.Render.plain(MailBuilder.doc())};
      });
      assert.equal(clipboard.rawTitle, expected); assert(['', expected].includes(clipboard.filteredTitle));
      assert.equal(clipboard.plain, clipboard.expectedPlain); assert.deepEqual(await state(page), before);
      observations.push({step: 'portable', subject, expected, previewTitle: observedPreviewTitle, exported, producedTitle, clipboard, clipboardTitlePreserved: clipboard.rawTitle === expected && clipboard.filteredTitle === expected, jsonSubject: json.subject, documentUnchanged: true});
    }
    completed = true;
  } finally { await receipt('portable', observations, completed); await browser.close(); }
});

test('SNUM : titre normal inchangé et repli commun sur une sortie à objet vide injectée', async () => {
  const browser = await chromium.launch(), observations = []; let completed = false;
  try {
    const context = await browser.newContext({acceptDownloads: true}), page = await context.newPage();
    await page.goto('file://' + path.join(root, 'app/distribution/snum.html')); await page.waitForFunction(() => MailBuilder.ready);
    const packet = JSON.stringify(require('./fixtures/snum.cjs')());
    for (const negative of [false, true]) {
      if (negative) await page.evaluate(() => { const convert = MailBuilder.SnumAdapter.convert; MailBuilder.SnumAdapter = {convert: value => { const result = convert(value); result.document.subject = ''; return result; }}; });
      await page.locator('#snum-input').fill(packet); await click(page, '#convert');
      const before = await page.evaluate(() => JSON.stringify(MailBuilder.doc())), doc = JSON.parse(before), expected = negative ? doc.name : doc.subject;
      const observedPreviewTitle = await previewTitle(page, expected); assert.equal(observedPreviewTitle, expected);
      const filename = await download(page, '#export-html', `snum-titre-${negative}.html`), exported = await exportedTitle(context, filename, expected);
      const json = JSON.parse(await fs.readFile(await download(page, '#export-json', `snum-titre-${negative}.json`), 'utf8'));
      assert.equal(json.subject, doc.subject); assert.equal(await page.evaluate(() => JSON.stringify(MailBuilder.doc())), before);
      observations.push({step: negative ? 'injected-empty-converter-output' : 'normal-converter', expected, subject: doc.subject, previewTitle: observedPreviewTitle, exported, jsonSubject: json.subject, documentUnchanged: true});
    }
    completed = true;
  } finally { await receipt('snum', observations, completed); await browser.close(); }
});
