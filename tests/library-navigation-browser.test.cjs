const test = require('node:test');
const {open, chromium, assert} = require('./browser-support.cjs');

for (const [name, requests, expected] of [
  ['accueil puis autre composition', ['home', 'b'], 'b'],
  ['autre composition puis accueil', ['b', 'home'], 'home'],
  ['deux ouvertures, la dernière sélection prévaut', ['b', 'a'], 'a'],
  ['accueil puis composition déjà active', ['home', 'a'], 'a']
]) {
  test(`navigation pendant une sauvegarde : ${name}`, async () => {
    const browser = await chromium.launch();
    try {
      const {page} = await open(browser);
      const ids = await page.evaluate(async () => {
        const A = MailBuilder, a = A.Model.create('Composition A', [19]), b = A.Model.create('Composition B', [19]);
        a.blocks[0].values.f0 = 'CONTENU_COMPOSITION_A'; b.blocks[0].values.f0 = 'CONTENU_COMPOSITION_B';
        await A.State.change(lib => { lib.documents.push(a, b); lib.activeId = a.id; });
        await A.Library.open(a.id);
        return {a: a.id, b: b.id};
      });
      await page.frameLocator('#preview').locator('body').filter({hasText: 'CONTENU_COMPOSITION_A'}).waitFor();
      // Retenir une écriture à la frontière du stockage, sans simuler le modèle ou le navigateur.
      await page.evaluate(() => {
        const A = MailBuilder, storage = A.Storage; let next = true;
        window.navigationTest = {restore: () => { A.Storage = storage; }};
        A.Storage = {...storage, save: (...args) => {
          if (!next) return storage.save(...args);
          next = false;
          return new Promise((resolve, reject) => { navigationTest.release = () => storage.save(...args).then(resolve, reject); });
        }};
        navigationTest.saving = A.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).subject = 'Écriture contrôlée'; });
      });
      await page.waitForFunction(() => typeof navigationTest.release === 'function');
      await page.evaluate(async ({ids, requests}) => {
        try {
          const actions = requests.map(request => request === 'home' ? MailBuilder.Library.home() : MailBuilder.Library.open(ids[request]));
          navigationTest.release();
          await Promise.all([navigationTest.saving, ...actions]);
        } finally { navigationTest.restore(); }
      }, {ids, requests});
      const result = await page.evaluate(() => ({
        editor: !document.getElementById('editor-page').hidden,
        home: !document.getElementById('library-home').hidden,
        activeId: MailBuilder.library.activeId,
        contents: MailBuilder.library.documents.filter(d => ['Composition A', 'Composition B'].includes(d.name)).map(d => d.blocks[0].values.f0)
      }));
      assert.deepEqual(result.contents, ['CONTENU_COMPOSITION_A', 'CONTENU_COMPOSITION_B']);
      assert.equal(result.home, expected === 'home'); assert.equal(result.editor, expected !== 'home');
      if (expected !== 'home') {
        assert.equal(result.activeId, ids[expected]);
        const body = page.frameLocator('#preview').locator('body'), text = `CONTENU_COMPOSITION_${expected.toUpperCase()}`;
        await body.filter({hasText: text}).waitFor({timeout: 5000});
        assert((await body.innerText()).includes(text), 'Le document enfant doit correspondre à la composition active.');
      }
    } finally { await browser.close(); }
  });
}

test('une ouverture refusée en lecture seule préserve l’accueil demandé et ne bloque pas la suivante', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const result = await page.evaluate(async () => {
      const A = MailBuilder, a = A.library.activeId, b = A.Model.create('Composition refusée', [19]);
      await A.State.change(lib => { lib.documents.push(b); });
      A.State.outdated();
      const requests = await Promise.allSettled([A.Library.home(), A.Library.open(b.id)]);
      const home = !document.getElementById('library-home').hidden;
      await A.Library.open(a);
      return {statuses: requests.map(r => r.status), error: requests[1].reason?.message, home,
        editor: !document.getElementById('editor-page').hidden, active: A.library.activeId, initial: a};
    });
    assert.deepEqual(result.statuses, ['fulfilled', 'rejected']);
    assert.match(result.error, /autre version/);
    assert(result.home, 'Une ouverture refusée ne doit pas annuler le retour valide à l’accueil.');
    assert(result.editor, 'La composition active reste consultable après le refus.');
    assert.equal(result.active, result.initial);
  } finally { await browser.close(); }
});

test('un retour demandé pendant l’écriture déclenchée par une ouverture fixe la vue finale', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const id = await page.evaluate(async () => {
      const A = MailBuilder, b = A.Model.create('Composition B', [19]);
      await A.State.change(lib => { lib.documents.push(b); });
      const storage = A.Storage; let next = true;
      window.navigationTest = {restore: () => { A.Storage = storage; }};
      A.Storage = {...storage, save: (...args) => {
        if (!next) return storage.save(...args);
        next = false;
        return new Promise((resolve, reject) => { navigationTest.release = () => storage.save(...args).then(resolve, reject); });
      }};
      navigationTest.opening = A.Library.open(b.id);
      return b.id;
    });
    await page.waitForFunction(() => typeof navigationTest.release === 'function');
    const result = await page.evaluate(async () => {
      try {
        const home = MailBuilder.Library.home(); navigationTest.release();
        await Promise.all([navigationTest.opening, home]);
        return {active: MailBuilder.library.activeId, home: !document.getElementById('library-home').hidden,
          editor: !document.getElementById('editor-page').hidden};
      } finally { navigationTest.restore(); }
    });
    assert.equal(result.active, id); assert(result.home); assert(!result.editor);
  } finally { await browser.close(); }
});
