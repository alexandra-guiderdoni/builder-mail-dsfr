const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

// #233 : la recette refuse un répertoire déjà utilisé avant toute écriture. Le remplacement du reçu canonique par un reçu
// incomplet reste le contrat de beginCollection (tests/collectors-receipt.test.cjs) : il ne doit simplement pas être atteint ici.
const recipe = path.resolve(__dirname, '../scripts/recipe_page_flow_firefox.mjs');
const listing = directory => fs.readdirSync(directory, {recursive: true}).map(String).sort();

test('#233 : un répertoire de recette non vide est refusé sans rien écrire, depuis n’importe quel répertoire courant', t => {
  const used = fs.mkdtempSync(path.join(os.tmpdir(), 'page-flow-utilise-')), elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'page-flow-ailleurs-'));
  t.after(() => { fs.rmSync(used, {recursive: true, force: true}); fs.rmSync(elsewhere, {recursive: true, force: true}); });
  const receipt = path.join(used, 'recu.json'), passed = JSON.stringify({completed: true, collection_status: 'completed', run_id: 'collector-precedent'});
  fs.writeFileSync(receipt, passed);
  const before = listing(used);
  // Lancée hors du dépôt : la racine vient de l’emplacement du script, pas du répertoire courant.
  const run = spawnSync(process.execPath, [recipe, used], {cwd: elsewhere, encoding: 'utf8', timeout: 60000});
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stderr, /Répertoire de recette non vide/);
  assert.equal(fs.readFileSync(receipt, 'utf8'), passed, 'le reçu existant est intact');
  assert.deepEqual(listing(used), before, 'aucun fichier ajouté au répertoire refusé');
  assert.deepEqual(listing(elsewhere), [], 'rien n’est créé dans le répertoire courant');
});
