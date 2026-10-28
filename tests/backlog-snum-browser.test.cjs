const test = require('node:test');
const path = require('node:path');
const {root, chromium, click, assert} = require('./browser-support.cjs');
const converterURL = 'file://' + path.join(root, 'app/distribution/snum.html');
const packet = marker => { const value = require('./fixtures/snum.cjs')(); value.articles[0].title = `Article synthétique ${marker}`; return value; };

// Toute l’API clipboard et ClipboardItem sont factices. Aucun accès système n’est effectué.
function simulatedClipboard() {
  window.__clipboardJobs = [];
  window.ClipboardItem = class {
    constructor(values) { this.values = values; this.types = Object.keys(values); }
    async getType(type) { if (!(type in this.values)) throw new Error('Type absent du clipboard simulé'); return this.values[type]; }
  };
  Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {
    write(items) {
      return new Promise((resolve, reject) => {
        const job = {items: [...items], status: 'pending'};
        job.resolve = () => { job.status = 'resolved'; resolve(); };
        job.reject = message => { job.status = 'rejected'; reject(new Error(message)); };
        window.__clipboardJobs.push(job);
      });
    }
  }});
}
async function converter(browser, t) {
  const context = await browser.newContext({viewport: {width: 1400, height: 900}});
  await context.addInitScript(simulatedClipboard);
  const page = await context.newPage(); await page.goto(converterURL); await page.waitForFunction(() => window.MailBuilder?.ready);
  // Observer le règlement de la vraie fonction sans substituer son HTML ni son ordre d’annonces.
  await page.evaluate(() => {
    const copy = MailBuilder.Files.copy; window.__copyOutcomes = [];
    MailBuilder.Files = {...MailBuilder.Files, copy() {
      const pending = copy();
      window.__copyOutcomes.push(pending.then(() => ({ok: true}), cause => ({ok: false, error: cause.message})));
      return pending;
    }};
  });
  t.diagnostic('DOM et convertisseur réels ; ClipboardItem/API clipboard simulés et promesse Files.copy observée. Aucune preuve de presse-papiers système ou de vocalisation.');
  return page;
}
async function convert(page, value) {
  await page.locator('#snum-input').fill(JSON.stringify(value)); await click(page, '#convert');
  await page.waitForFunction(() => !document.getElementById('copy').disabled && !document.getElementById('preview').hidden);
  return page.evaluate(() => ({doc: JSON.parse(JSON.stringify(MailBuilder.doc())), html: MailBuilder.Render.clipboardHtml(MailBuilder.doc()), plain: MailBuilder.Render.plain(MailBuilder.doc()), notice: document.getElementById('notice').textContent}));
}
async function startCopy(page, count) {
  await click(page, '#copy'); await page.waitForFunction(count => window.__clipboardJobs.length === count, count);
}
async function payload(page, index) {
  return page.evaluate(async index => {
    const [item] = window.__clipboardJobs[index].items;
    return {types: item.types, html: await (await item.getType('text/html')).text(), plain: await (await item.getType('text/plain')).text()};
  }, index);
}
async function finishCopy(page, index, reject = false) {
  return page.evaluate(async ({index, reject}) => {
    const job = window.__clipboardJobs[index];
    if (reject) job.reject('Refus clipboard simulé pour cette recette'); else job.resolve();
    const outcome = await window.__copyOutcomes[index];
    await Promise.resolve(); // laisse aussi le gestionnaire attempt traiter le règlement, sans délai arbitraire
    return outcome;
  }, {index, reject});
}
function equalsA(actual, expected) {
  assert.deepEqual(actual.types.sort(), ['text/html', 'text/plain']);
  assert.equal(actual.html, expected.html); assert.equal(actual.plain, expected.plain);
  assert(actual.plain.includes('Article synthétique A')); assert(!actual.plain.includes('Article synthétique B'));
}

for (const reconvert of [false, true]) test(`#164 SNUM : copie A différée puis ${reconvert ? 'conversion B' : 'saisie B'} conserve le statut courant`, async t => {
  const browser = await chromium.launch();
  try {
    const page = await converter(browser, t), a = await convert(page, packet('A'));
    await startCopy(page, 1); equalsA(await payload(page, 0), a);
    let expectedDoc = a.doc;
    if (reconvert) expectedDoc = (await convert(page, packet('B'))).doc;
    else await page.locator('#snum-input').fill(JSON.stringify(packet('B')));
    const currentNotice = await page.locator('#notice').innerText();
    if (reconvert) assert(!currentNotice.includes('Courriel copié'));
    else assert.match(currentNotice, /Collecte modifiée.*reconvertissez/);
    assert.deepEqual(await finishCopy(page, 0), {ok: true});
    assert.equal(await page.locator('#notice').innerText(), currentNotice);
    assert.deepEqual(await page.evaluate(() => MailBuilder.doc()), expectedDoc);
    assert.equal(await page.locator('#copy').isDisabled(), !reconvert);
    equalsA(await payload(page, 0), a);
    assert.equal(await page.locator('#error').isHidden(), true);
  } finally { await browser.close(); }
});

test('#167 SNUM : refus puis réussite sans reconversion retire l’erreur ancienne', async t => {
  const browser = await chromium.launch();
  try {
    const page = await converter(browser, t), a = await convert(page, packet('A'));
    await startCopy(page, 1);
    const rejected = await finishCopy(page, 0, true); assert.equal(rejected.ok, false);
    await page.locator('#error').waitFor({state: 'visible'});
    assert.match(await page.locator('#error-text').innerText(), /Refus clipboard simulé/);
    assert.equal(await page.locator('#copy').isEnabled(), true);
    await startCopy(page, 2);
    assert.deepEqual(await finishCopy(page, 1), {ok: true});
    await page.locator('#notice').filter({hasText: 'Courriel copié en HTML et texte.'}).waitFor();
    assert.equal(await page.locator('#error').isHidden(), true);
    assert.equal(await page.locator('#error-text').textContent(), '');
    assert.deepEqual(await page.evaluate(() => MailBuilder.doc()), a.doc, 'aucune saisie ni reconversion entre les tentatives');
    equalsA(await payload(page, 1), a);
    assert.deepEqual(await page.evaluate(() => window.__clipboardJobs.map(job => job.status)), ['rejected', 'resolved']);
  } finally { await browser.close(); }
});

for (const reject of [false, true]) test(`#164/#167 SNUM : ${reject ? 'refus' : 'succès'} tardif ne masque pas une erreur de conversion plus récente`, async t => {
  const browser = await chromium.launch();
  try {
    const page = await converter(browser, t), a = await convert(page, packet('A'));
    await startCopy(page, 1);
    await page.locator('#snum-input').fill('{'); await click(page, '#convert');
    await page.locator('#error').waitFor({state: 'visible'});
    const recentError = await page.locator('#error-text').innerText(), recentNotice = await page.locator('#notice').innerText();
    assert(recentError.trim()); assert(!recentError.includes('Refus clipboard simulé'));
    assert.equal(await page.locator('#snum-input').getAttribute('aria-invalid'), 'true');
    const outcome = await finishCopy(page, 0, reject); assert.equal(outcome.ok, !reject);
    assert.equal(await page.locator('#error').isVisible(), true);
    assert.equal(await page.locator('#error-text').innerText(), recentError);
    assert.equal(await page.locator('#notice').innerText(), recentNotice);
    assert.equal(await page.locator('#copy').isDisabled(), true);
    assert.deepEqual(await page.evaluate(() => MailBuilder.doc()), a.doc, 'la dernière conversion valide reste A');
    equalsA(await payload(page, 0), a);
  } finally { await browser.close(); }
});
