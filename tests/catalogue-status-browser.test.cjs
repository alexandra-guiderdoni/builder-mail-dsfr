const test = require('node:test');
const {open, expand, assert} = require('./browser-support.cjs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Délai de repos avant l’annonce : 500 ms (voir app/source/view.js).
const DELAY = 500;
const engine = playwright[process.env.MAIL_BUILDER_ENGINE || 'chromium'];

async function session(run) {
  const browser = await engine.launch();
  try {
    const {page} = await open(browser); await expand(page, 'Ajouter un composant');
    await page.clock.install({time: 0}); await page.clock.pauseAt(1000); // horloge figée : seul runFor la fait avancer
    await page.evaluate(() => {
      window.announcements = [];
      const region = document.getElementById('catalogue-status');
      if (region) new MutationObserver(() => announcements.push(region.textContent)).observe(region, {childList: true, characterData: true, subtree: true});
    });
    await run(page);
  } finally { await browser.close(); }
}
const type = async (page, text) => { for (const char of text) { await page.locator('#catalogue-search').pressSequentially(char); await page.clock.runFor(100); } };
const announcements = page => page.evaluate(() => announcements);

test('une région de statut polie existe dès le chargement et reste muette tant qu’on ne filtre pas', () => session(async page => {
  const region = page.locator('#catalogue-status');
  assert.equal(await region.getAttribute('role'), 'status');
  assert.equal(await region.textContent(), '');
  await page.clock.runFor(2000);
  assert.deepEqual(await announcements(page), []);
}));

test('le nombre de résultats est annoncé une seule fois, après une pause dans la frappe', () => session(async page => {
  await type(page, 'photo');
  assert.deepEqual(await announcements(page), [], 'aucune annonce pendant la frappe');
  await page.clock.runFor(DELAY - 100 - 1);
  assert.deepEqual(await announcements(page), [], `rien avant ${DELAY} ms de repos`);
  await page.clock.runFor(2);
  const count = await page.locator('#catalogue option').count();
  assert(count > 1);
  assert.deepEqual(await announcements(page), [`${count} composants trouvés sur 52.`]);
  assert.equal(await page.locator('#catalogue-status').textContent(), `${count} composants trouvés sur 52.`);
}));

test('zéro résultat et un seul résultat sont annoncés, puis l’effacement rend les 52', () => session(async page => {
  await type(page, 'agenda'); await page.clock.runFor(DELAY);
  assert.equal(await page.locator('#catalogue-status').textContent(), 'Aucun composant trouvé sur 52.');
  await page.locator('#catalogue-search').fill('bouton secondaire'); await page.clock.runFor(DELAY);
  assert.equal(await page.locator('#catalogue-status').textContent(), '1 composant trouvé sur 52.');
  await page.locator('#catalogue-search').fill(''); await page.clock.runFor(DELAY);
  assert.equal(await page.locator('#catalogue-status').textContent(), '52 composants trouvés sur 52.');
  assert.deepEqual(await announcements(page), ['Aucun composant trouvé sur 52.', '1 composant trouvé sur 52.', '52 composants trouvés sur 52.']);
}));
