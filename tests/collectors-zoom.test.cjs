const test = require('node:test');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const {newCollection, collectionFailure} = require('../scripts/collector_receipt.cjs');
const root = path.resolve(__dirname, '..');
const recipe = () => import(pathToFileURL(path.join(root, 'scripts/recipe_page_flow_firefox.mjs')).href);
const reference = {width: 1200, height: 800, outerWidth: 1220, outerHeight: 900, dpr: 2, screenWidth: 1920, screenHeight: 1080, visualScale: 1};
// #196 : à 200 % natif, Firefox contracte aussi fenêtre et écran en pixels CSS (mesure de #179).
const zoomed = {width: 600, height: 400, outerWidth: 610, outerHeight: 450, dpr: 4, screenWidth: 960, screenHeight: 540, visualScale: 1};

test('importer l’oracle pur n’alloue aucun Firefox ; références et facteur relatif cohérent sont reconnus avec leurs limites', async () => {
  const {qualifyZoom} = await recipe();
  const baseline = qualifyZoom(reference, reference, 1);
  const twice = qualifyZoom(reference, zoomed, 2);
  assert.equal(baseline.qualified, true); assert.equal(twice.qualified, true);
  assert.deepEqual(twice.ratios, {dpr: 2, width: 2, height: 2, outerWidth: 2, screenWidth: 2});
  assert.equal(twice.absoluteZoomVerified, false); assert.match(twice.limits, /not a browser-UI zoom reading/);
});

for (const [name, measured] of [
  ['zoom inchangé', reference], ['DPR seul', {...reference, dpr: 4}],
  ['viewport seul', {...reference, width: 600, height: 400}],
  ['fenêtre et écran stables (modèle non observé)', {...reference, width: 600, height: 400, dpr: 4}],
  ['fenêtre différente', {...zoomed, outerWidth: 620}],
  ['écran différent', {...zoomed, screenWidth: 1280}],
  ['pinch', {...zoomed, visualScale: 2}],
  ['mesure incomplète', {width: 600, height: 400, dpr: 4}],
]) test(`facteur 200 % demandé mais ${name} : qualification refusée`, async () => {
  const {qualifyZoom} = await recipe();
  assert.equal(qualifyZoom(reference, measured, 2).qualified, false);
});

test('un reçu de nettoyage manquant/refusé interdit une réussite et préserve l’erreur primaire', async () => {
  const {consumeCleanupReceipt} = await recipe();
  for (const result of [undefined, {}, {cleanup_error: undefined}, {cleanup_error: {code: 'BIRTH_MISMATCH', message: 'identity changed'}}]) {
    const report = newCollection(root, {errors: []}); collectionFailure(report, 'collection', new Error('primary'));
    assert.equal(consumeCleanupReceipt(report, result), false);
    assert.equal(report.collection_errors[0].message, 'primary');
    assert.ok(report.cleanup_errors.length); assert.equal(report.completed, false);
  }
  const report = newCollection(root, {errors: []});
  assert.equal(consumeCleanupReceipt(report, {cleanup_error: null, status: 'closed', exit_observed: true}), true);
  assert.equal(report.cleanup_errors.length, 0);
});
