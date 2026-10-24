const test = require('node:test');
const {open, click, saved, chromium, assert} = require('./browser-support.cjs');

// Depuis #57, le sélecteur « Composition active » ne bascule plus sur `change` : la bascule passe par le bouton
// « Ouvrir cette composition ». La frappe d'une lettre sur un sélecteur fermé déclenche `change` sous Firefox et
// WebKit (reproduit en recette) ; sans action explicite, elle ne doit plus faire perdre la composition en cours.

async function twoCompositions(page) {
  await click(page, '[data-action=duplicate-document]'); await saved(page);
  const library = await page.evaluate(() => MailBuilder.library);
  const X = library.activeId, Y = library.documents.find(d => d.id !== X).id;
  return {X, Y};
}

const activeId = page => page.evaluate(() => MailBuilder.library.activeId);

test('frappe sur le sélecteur fermé : aucune bascule de composition active', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const {X} = await twoCompositions(page);
    assert.equal(await activeId(page), X, 'La composition dupliquée est active au départ.');
    // Les deux compositions commencent par la même lettre (« M » de « Mon premier courriel » et sa « · copie »).
    // Focaliser le sélecteur fermé puis taper « m » déclenche la recherche par frappe sous Firefox et WebKit, émet
    // `change` et basculait immédiatement avant #57. On dispatche aussi un `change` directement pour couvrir le cas
    // sans dépendre du moteur, puisque le défaut est bien la réception d'un `change` sans action explicite.
    await page.locator('#documents').focus();
    await page.keyboard.press('m');
    await page.evaluate(() => { const s = document.querySelector('#documents'); s.dispatchEvent(new Event('change', {bubbles: true})); });
    // La frappe peut avoir modifié la valeur affichée du select, mais pas l'état réel de l'application.
    assert.equal(await activeId(page), X, 'Aucune frappe ne bascule la composition active.');
  } finally { await browser.close(); }
});

test('bouton « Ouvrir cette composition » : bascule la composition sélectionnée', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const {X, Y} = await twoCompositions(page);
    await page.locator('#documents').selectOption(Y);
    await click(page, '[data-action=open-document]');
    await page.waitForFunction(y => MailBuilder.library.activeId === y, Y);
    assert.equal(await activeId(page), Y, 'Le bouton explicite bascule la composition active.');
    // Re-sélectionner X et cliquer : bascule inverse.
    await page.locator('#documents').selectOption(X);
    await click(page, '[data-action=open-document]');
    await page.waitForFunction(x => MailBuilder.library.activeId === x, X);
    assert.equal(await activeId(page), X, 'Le bouton revient à la composition précédente sans intermédiaire.');
  } finally { await browser.close(); }
});

test('rafraîchissement après sélection : la sélection en attente du sélecteur survit', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const {X, Y} = await twoCompositions(page);
    await page.locator('#documents').selectOption(Y);
    // Déclencher un rafraîchissement de la vue sans bascule (notice, blockList).
    await page.evaluate(() => MailBuilder.UI.selections());
    assert.equal(await page.locator('#documents').inputValue(), Y, 'La sélection en attente est préservée au refresh.');
    assert.equal(await activeId(page), X, 'La composition active n’a pas changé pendant ce temps.');
  } finally { await browser.close(); }
});

test('bascule par autre voie (duplication) : le sélecteur se synchronise sur la composition active', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const {X} = await twoCompositions(page);
    // Une deuxième duplication rend la nouvelle copie active : le sélecteur doit la refléter, pas X.
    await click(page, '[data-action=duplicate-document]'); await saved(page);
    const newActive = await activeId(page);
    assert.notEqual(newActive, X, 'La duplication crée une nouvelle composition active.');
    assert.equal(await page.locator('#documents').inputValue(), newActive, 'Le sélecteur affiche la composition active, pas une sélection périmée.');
  } finally { await browser.close(); }
});
