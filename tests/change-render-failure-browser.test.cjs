const test = require('node:test');
const {open, saved, store, chromium, assert} = require('./browser-support.cjs');

// #236 : une modification acceptée en mémoire est suivie d'une tentative de sauvegarde, même si le rendu lève.
// A.UI est gelé : le rendu est mis en échec par le champ #subject, rendu introuvable le temps d'un appel.
test('#236 : le rendu qui lève n’empêche pas la sauvegarde, et son erreur remonte', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser);
    await page.evaluate(() => MailBuilder.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).name = 'Nom de départ'; }));
    await saved(page);
    const raised = await page.evaluate(async () => {
      const A = MailBuilder, field = document.getElementById('subject');
      field.id = 'subject-absent';
      try { await A.State.change(lib => { lib.documents.find(d => d.id === lib.activeId).name = 'Nom après rendu en échec'; }); return null; }
      catch (cause) { return cause.message; }
      finally { field.id = 'subject'; }
    });
    assert.ok(raised, 'l’erreur du rendu remonte à l’appelant');
    assert.equal(await page.evaluate(() => MailBuilder.doc().name), 'Nom après rendu en échec', 'la modification est en mémoire');
    await saved(page);
    assert.equal((await store(page)).library.documents[0].name, 'Nom après rendu en échec', 'la modification est enregistrée');
  } finally { await browser.close(); }
});
