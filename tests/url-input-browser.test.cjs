const test = require('node:test');
const {chromium, open, click, expand, saved, selectBlock, state, assert} = require('./browser-support.cjs');

const OLD = 'https://exemple.invalid/ancien', NEW = 'https://exemple.invalid/nouveau';
async function setup(page) {
  const library = await state(page); 
  const blocks = library.documents.find(d => d.id === library.activeId).blocks;
  const article = blocks.find(b => b.component === 'mail-19'), other = blocks.find(b => b.id !== article.id);
  await selectBlock(page, article.id);
  await page.locator('#article-source').fill(OLD);
  await page.waitForFunction(old => MailBuilder.doc().blocks.some(b => b.source === old), OLD);
  await page.evaluate(() => {
    window.__out = []; const files = MailBuilder.Files;
    MailBuilder.Files = {...files, download: (data, type, name) => { window.__out.push({data, type, name}); }, json: (value, name) => { window.__out.push({data: JSON.stringify(value), type: 'json', name}); }};
  });
  return {article, other};
}
const source = page => page.evaluate(() => MailBuilder.doc().blocks.find(b => b.component === 'mail-19').source);

test('une URL en cours de saisie ne bloque pas l’éditeur et n’affiche aucune erreur à la frappe', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); const {article, other} = await setup(page);
    for (const partial of ['h', 'https:', 'https://']) {
      await page.locator('#article-source').fill(partial);
      assert.equal(await page.locator('#article-source').getAttribute('aria-invalid'), null, `Aucune erreur pendant la frappe de « ${partial} ».`);
      assert.equal(await page.locator('[data-field-error]').count(), 0);
      assert.equal(await page.locator('#error').isVisible(), false);
    }
    await page.locator('#article-source-label').fill('Source synthétique');
    assert.equal(await page.evaluate(() => MailBuilder.doc().blocks.find(b => b.component === 'mail-19').sourceLabel), 'Source synthétique', 'Un autre champ reste modifiable.');
    await selectBlock(page, other.id);
    assert.equal(await page.locator(`[data-select="${other.id}"]`).getAttribute('aria-pressed'), 'true', 'Le changement de bloc reste possible.');
    await selectBlock(page, article.id);
    assert.equal(await page.locator('#article-source').inputValue(), 'https://', 'La saisie temporaire est conservée.');
    assert.equal(await source(page), OLD, 'Le modèle garde la dernière valeur valide.');
  } finally { await browser.close(); }
});

test('non-régression de #1 : copie et exports restent bloqués sans réutiliser l’ancienne URL, puis repartent après correction', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser, {permissions: ['clipboard-read', 'clipboard-write']}); await setup(page);
    await expand(page, 'Fichiers et récupération'); await page.evaluate(() => navigator.clipboard.writeText('presse-papiers inchangé'));
    for (const invalid of ['https://', 'exemple']) {
      await page.locator('#article-source').fill(invalid);
      for (const action of ['copy', 'export-mail', 'export-document', 'export-library']) {
        await click(page, `[data-action=${action}]`);
        await page.locator('#error').filter({hasText: 'Adresse HTTPS incomplète'}).waitFor();
        assert.equal(await page.locator('#article-source').getAttribute('aria-invalid'), 'true', 'Le champ en erreur reste identifié.');
        assert.match(await page.locator('#error-article-source').textContent(), /Adresse HTTPS incomplète/);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'article-source');
        await page.locator('#error').evaluate(e => { e.textContent = ''; });
      }
      assert.deepEqual(await page.evaluate(() => window.__out), [], 'Aucune sortie n’est produite.');
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'presse-papiers inchangé', 'Le presse-papiers n’est pas écrasé.');
      assert.equal(await page.evaluate(() => JSON.stringify(MailBuilder.library).includes('ancien')), true);
    }
    await page.locator('#article-source').fill(NEW);
    assert.equal(await page.locator('[data-field-error]').count(), 0);
    await click(page, '[data-action=export-mail]');
    const out = await page.evaluate(() => window.__out);
    assert.equal(out.length, 1); assert(out[0].data.includes(NEW)); assert(!out[0].data.includes('ancien'));
    await click(page, '[data-action=copy]'); await page.locator('#notice').filter({hasText: 'Courriel copié'}).waitFor();
    const html = await page.evaluate(async () => { const [item] = await navigator.clipboard.read(); return (await item.getType('text/html')).text(); });
    assert(html.includes(NEW) && !html.includes('ancien'));
  } finally { await browser.close(); }
});

test('quatre erreurs distinctes au départ du champ, avec leur message exact', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); await setup(page);
    const cases = [
      ['exemple.invalid/page', 'Adresse HTTPS incomplète : saisissez une adresse complète commençant par https://, par exemple https://exemple.fr/page.'],
      ['http://exemple.invalid/', 'Protocole interdit : seul HTTPS est accepté, l’adresse doit commencer par https://.'],
      ['javascript:alert(1)', 'Protocole interdit : seul HTTPS est accepté, l’adresse doit commencer par https://.'],
      ['https://recette:synthetique@exemple.invalid/', 'Identifiants interdits dans l’adresse HTTPS : retirez l’identifiant et le mot de passe.'],
      ['https://exemple.invalid/a b', 'Caractères interdits dans l’adresse HTTPS : retirez les espaces et les caractères de contrôle.']
    ];
    for (const [value, message] of cases) {
      await page.locator('#article-source').fill(value);
      await page.locator('#article-source').blur();
      assert.equal(await page.locator('#error-article-source').textContent(), `Erreur : ${message}`, value);
      assert.equal(await page.locator('#article-source').getAttribute('aria-invalid'), 'true');
    }
    await page.locator('#article-source').fill('');
    assert.equal(await page.locator('[data-field-error]').count(), 0, 'Le lien source reste facultatif.');
    assert.equal(await source(page), '');
  } finally { await browser.close(); }
});

test('les liens mailto des pieds de page et le lien source facultatif restent acceptés', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); await setup(page);
    const footer = (await state(page)).documents[0].blocks.find(b => b.component === 'mail-49');
    await selectBlock(page, footer.id);
    const field = (await page.evaluate(id => MailBuilder.Model.component('mail-49').fields.filter(f => f.type === 'url').map(f => f.key), footer.id))[0];
    const mailto = 'mailto:service@example.invalid?subject=Bonjour';
    await page.locator(`#field-${field}`).fill(mailto); await page.locator(`#field-${field}`).blur();
    assert.equal(await page.locator('[data-field-error]').count(), 0);
    assert.equal(await page.evaluate(k => MailBuilder.doc().blocks.find(b => b.component === 'mail-49').values[k], field), mailto);
    await page.locator(`#field-${field}`).fill(mailto + '&bcc=autre@example.invalid'); await page.locator(`#field-${field}`).blur();
    assert.match(await page.locator(`#error-field-${field}`).textContent(), /Lien mailto de pied de page/);
  } finally { await browser.close(); }
});

test('un champ de lien obligatoire vidé bloque aussi la diffusion sans réutiliser l’ancienne valeur', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); const library = await state(page);
    const block = library.documents[0].blocks.find(b => b.component === 'mail-40'), key = await page.evaluate(() => MailBuilder.Model.component('mail-40').fields.find(f => f.type === 'url').key);
    const old = block.values[key];
    await selectBlock(page, block.id); await page.locator(`#field-${key}`).fill('');
    assert.equal(await page.locator('[data-field-error]').count(), 0);
    await page.evaluate(() => { window.__out = []; MailBuilder.Files = {...MailBuilder.Files, download: (d, t, n) => { window.__out.push(n); }}; });
    await click(page, '[data-action=export-mail]');
    await page.locator('#error').filter({hasText: 'Adresse HTTPS incomplète'}).waitFor();
    assert.deepEqual(await page.evaluate(() => window.__out), []);
    assert.equal(await page.evaluate(k => MailBuilder.doc().blocks.find(b => b.component === 'mail-40').values[k], key), old);
    assert.equal(await page.locator(`#field-${key}`).getAttribute('aria-invalid'), 'true');
  } finally { await browser.close(); }
});

// Deux compositions : X, active, porte l’ancienne URL valide ; Y ne l’a jamais portée.
async function twoCompositions(page) {
  await click(page, '[data-action=duplicate-document]'); await saved(page);
  const library = await state(page), X = library.activeId, Y = library.documents.find(d => d.id !== X).id;
  await setup(page);
  return {X, Y};
}
const refusal = 'Adresse HTTPS incomplète : saisissez une adresse complète commençant par https://, par exemple https://exemple.fr/page. Corrigez ce lien ou annulez sa modification avant cette action.';
async function settled(page, X) { await page.waitForFunction(x => !document.querySelector('#error').hidden || MailBuilder.library.activeId !== x, X); }

test('un brouillon d’URL refuse le changement de composition avec le même message et rétablit le sélecteur', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); const {X, Y} = await twoCompositions(page);
    await page.locator('#article-source').fill('https://');
    await page.locator('#documents').selectOption(Y); await settled(page, X);
    assert.equal((await state(page)).activeId, X, 'La composition active ne change pas.');
    assert.equal(await page.locator('#documents').inputValue(), X, 'Le sélecteur est rétabli sur la composition en cours.');
    assert.equal(await page.locator('#error').textContent(), refusal);
    assert.equal(await page.locator('#article-source').inputValue(), 'https://', 'La saisie temporaire est conservée.');
    assert.equal(await page.locator('#article-source').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'article-source');
    await page.locator('#error').evaluate(e => { e.textContent = ''; });
    await click(page, '[data-action=export-mail]'); await page.locator('#error').filter({hasText: 'Corrigez ce lien'}).waitFor();
    assert.equal(await page.locator('#error').textContent(), refusal, 'Même refus que pour les autres actions.');
    await page.locator('#article-source').fill(NEW); await saved(page);
    await page.locator('#documents').selectOption(Y); await page.waitForFunction(y => MailBuilder.library.activeId === y, Y); await saved(page);
    await click(page, '#library-back'); await page.locator('#library-home').waitFor({state: 'visible'});
    await click(page, `[data-document="${X}"] [data-library-action=open]`); await page.locator('#editor-page').waitFor({state: 'visible'});
    assert.equal((await state(page)).activeId, X, 'Après correction, la composition se rouvre.');
    assert.equal(await source(page), NEW);
  } finally { await browser.close(); }
});

test('un brouillon d’URL n’est diffusé depuis aucune autre composition', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser, {permissions: ['clipboard-read', 'clipboard-write']}); const {X, Y} = await twoCompositions(page);
    await expand(page, 'Fichiers et récupération'); await page.evaluate(() => navigator.clipboard.writeText('presse-papiers inchangé'));
    const leaks = () => page.evaluate(async () => {
      const [item] = await navigator.clipboard.read(), blobs = await Promise.all(item.types.map(type => item.getType(type)));
      const texts = await Promise.all(blobs.map(blob => blob.text()));
      return [...window.__out.map(o => o.data), ...texts].filter(text => text.includes('ancien')).length;
    });
    await page.locator('#article-source').fill('https://');
    await page.locator('#documents').selectOption(Y); await settled(page, X);
    await page.locator('#error').evaluate(e => { e.textContent = ''; e.hidden = true; });
    for (const action of ['export-library', 'export-document', 'copy']) {
      await click(page, `[data-action=${action}]`);
      await page.locator('#error').filter({hasText: 'Corrigez ce lien'}).or(page.locator('#notice').filter({hasText: /proposée au téléchargement|Courriel copié/})).first().waitFor();
      await page.locator('#error').evaluate(e => { e.textContent = ''; e.hidden = true; });
    }
    assert.equal(await leaks(), 0, 'Ni export ni copie ne contient l’ancienne URL valide de X.');
    await click(page, '#library-back'); await page.locator('#error').filter({hasText: 'Corrigez ce lien'}).waitFor();
    assert.equal(await page.locator('#library-home').isVisible(), false, 'L’accueil, et donc la duplication de X, restent fermés tant que le brouillon existe.');
  } finally { await browser.close(); }
});

async function importFooter(page, links) {
  const doc = await page.evaluate(links => { const doc = MailBuilder.Model.create('Pied de recette', [50]); doc.blocks[0].additionalLinks = links; return doc; }, links);
  await expand(page, 'Fichiers et récupération');
  const count = (await state(page)).documents.length;
  await page.locator('#project-input').setInputFiles({name: 'pied.courriel.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc))});
  await page.waitForFunction(count => MailBuilder.library.documents.length === count + 1, count); await saved(page);
  const id = await page.evaluate(() => MailBuilder.doc().blocks[0].id); await selectBlock(page, id);
  return id;
}

test('retirer un lien supplémentaire de pied recale les brouillons avant de redessiner les champs', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const links = [{url: 'https://exemple.invalid/premier', label: 'Premier lien'}, {url: 'https://exemple.invalid/second', label: 'Second lien'}];
    const extras = () => page.evaluate(() => MailBuilder.doc().blocks[0].additionalLinks);
    // Brouillon du lien retiré : il disparaît avec lui et ne s’affiche pas sur le lien suivant.
    await importFooter(page, links);
    await page.locator('#field-footer-url-0').fill('https://'); await page.locator('#field-footer-url-0').blur();
    await click(page, '[data-block-action=remove-footer-link][data-footer-link-index="0"]');
    await page.waitForFunction(() => MailBuilder.doc().blocks[0].additionalLinks.length === 1);
    assert.deepEqual(await extras(), [links[1]]);
    assert.equal(await page.locator('#field-footer-url-0').inputValue(), links[1].url, 'Le lien restant affiche sa propre adresse.');
    assert.equal(await page.locator('#field-footer-url-0').getAttribute('aria-invalid'), null);
    assert.equal(await page.evaluate(() => MailBuilder.drafts.size), 0);
    await saved(page);
    // Brouillon du lien suivant : il le suit à sa nouvelle place, toujours signalé.
    await importFooter(page, links);
    await page.locator('#field-footer-url-1').fill('https://'); await page.locator('#field-footer-url-1').blur();
    await click(page, '[data-block-action=remove-footer-link][data-footer-link-index="0"]');
    await page.waitForFunction(() => MailBuilder.doc().blocks[0].additionalLinks.length === 1);
    assert.deepEqual(await extras(), [links[1]], 'Le modèle garde la dernière adresse valide du lien déplacé.');
    assert.equal(await page.locator('#field-footer-url-0').inputValue(), 'https://', 'La saisie temporaire suit son lien.');
    assert.equal(await page.locator('#field-footer-url-0').getAttribute('aria-invalid'), 'true');
    assert.deepEqual(await page.evaluate(() => [...MailBuilder.drafts.values()].map(d => d.input)), ['field-footer-url-0']);
  } finally { await browser.close(); }
});

// Décision du 24 octobre (garde unique) : pendant un brouillon d’URL, les actions qui modifient la composition
// (Monter, Descendre, Retirer, Dupliquer, Ajouter, Annuler le retrait) sont refusées avec le message du lien, le
// brouillon reste visible et le focus revient sur le champ. « Annuler les champs invalides » reste le moyen
// d’abandonner le brouillon : la refuser rendrait le message « annulez sa modification » sans issue.
test('un brouillon d’URL refuse les actions de bloc avec le message du lien et laisse l’annulation possible', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser); await setup(page);
    const blocks = () => page.evaluate(() => MailBuilder.doc().blocks.map(b => b.id));
    const before = await blocks();
    await expand(page, 'Ajouter un composant'); await page.locator('#catalogue').selectOption('mail-29');
    await page.locator('#article-source').fill('https://');
    const actions = ['[data-block-action=up]', '[data-block-action=down]', '[data-block-action=duplicate]', '[data-block-action=remove]', '[data-action=add-block]'];
    for (const selector of actions) {
      if (await page.locator(selector).isDisabled()) continue;
      await click(page, selector);
      await page.locator('#error').filter({hasText: 'Corrigez ce lien'}).waitFor();
      assert.deepEqual(await blocks(), before, `« ${selector} » ne modifie pas la composition.`);
      assert.equal(await page.locator('#article-source').inputValue(), 'https://', 'Le brouillon reste visible.');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'article-source', 'Le focus revient sur le champ.');
      await page.locator('#error').evaluate(e => { e.textContent = ''; });
    }
    await click(page, '[data-action=cancel-fields]');
    assert.equal(await page.evaluate(() => MailBuilder.drafts.size), 0, 'L’annulation abandonne le brouillon.');
    assert.equal(await page.locator('#article-source').inputValue(), OLD, 'La dernière adresse valide est rétablie.');
    await click(page, '[data-block-action=duplicate]');
    await page.waitForFunction(n => MailBuilder.doc().blocks.length === n + 1, before.length);
  } finally { await browser.close(); }
});
