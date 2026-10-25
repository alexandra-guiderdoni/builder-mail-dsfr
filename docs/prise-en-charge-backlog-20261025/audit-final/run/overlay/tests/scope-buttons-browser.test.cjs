const test = require('node:test');
const {click, open, enterEditor, chromium, assert, nativeAxTree, note} = require('./browser-support.cjs');

// Arbre natif CDP sous Chromium ; noms ARIA calculés par Playwright sur les autres moteurs.
async function buttons(page) {
  const nodes = await nativeAxTree(page.context(), page);
  if (nodes) return nodes.filter(n => !n.ignored && n.role?.value === 'button').map(n => n.name?.value || '');
  note({kind: 'aria-snapshot', property: 'button-accessible-names', nativeAccessibilityTree: false});
  return (await page.locator('body').ariaSnapshot()).split('\n').flatMap(line => {
    const match = /^\s*- button "(.*?)"(?: \[.*?\])?(?::.*)?$/.exec(line);
    return match ? [match[1]] : [];
  });
}
const scoped = names => names.filter(n => /^(Dupliquer|Retirer|Supprimer)/.test(n));

test('Dupliquer et Retirer nomment le bloc ou la composition dans leur intitulé accessible', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await click(page, '[data-select] >> nth=1');
    const names = scoped(await buttons(page));
    for (const expected of ['Dupliquer le bloc', 'Retirer le bloc', 'Dupliquer la composition', 'Retirer la composition'])
      assert.equal(names.filter(n => n === expected).length, 1, `${expected} attendu une fois dans ${JSON.stringify(names)}`);
    assert(!names.includes('Dupliquer') && !names.includes('Retirer'), `Intitulé sans objet dans ${JSON.stringify(names)}`);
    assert.equal(new Set(names).size, names.length, `Intitulés en double dans ${JSON.stringify(names)}`);
    // WCAG 2.5.3 : le texte visible figure dans l'intitulé accessible.
    for (const action of ['duplicate', 'remove']) for (const selector of [`[data-block-action=${action}]`, `[data-action=${action}-document]`]) {
      const [visible, name] = await page.locator(selector).evaluate(e => [e.textContent.trim(), e.getAttribute('aria-label')]);
      assert(!name || name.includes(visible), `${selector} : ${name} ne contient pas ${visible}`);
    }
  } finally { await browser.close(); }
});

test('la liste des compositions précise la composition visée par Dupliquer et Supprimer', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    await click(page, '[data-action=library-home]');
    const names = scoped(await buttons(page)), item = await page.locator('#newsletter-list [data-library-action=duplicate]').first().evaluate(e => [e.textContent.trim(), e.getAttribute('aria-label')]);
    assert(names.some(n => /^Dupliquer la composition /.test(n)), JSON.stringify(names));
    assert(names.some(n => /^Supprimer la composition /.test(n)), JSON.stringify(names));
    assert(item[1].includes(item[0]));
  } finally { await browser.close(); }
});
