const test = require('node:test');
const {chromium, open, click, expand, selectBlock, state, assert} = require('./browser-support.cjs');

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
