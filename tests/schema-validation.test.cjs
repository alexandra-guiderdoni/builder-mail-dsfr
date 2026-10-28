const test = require('node:test');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {root, evidence, open, expand, download, chromium, fs, assert} = require('./browser-support.cjs');
const dist = path.join(root, 'app/distribution');
const schemaPath = path.join(dist, 'courriels.schema.json');
const validator = path.join(__dirname, 'validate-schema.cjs');

// Validateur de développement uniquement : jsonschema (Python) contrôle le schéma 2020-12.
function validate(...files) {
  const run = spawnSync(process.execPath, [validator, schemaPath, ...files], {encoding: 'utf8'});
  assert.equal(run.error, undefined, 'node introuvable : ' + run.error);
  assert.notEqual(run.status, 2, 'validateur indisponible ou schéma invalide : ' + run.stderr);
  return JSON.parse(run.stdout);
}
const tmp = async (t, name) => {
  const directory = await fs.mkdtemp(path.join(require('node:os').tmpdir(), 'schema-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  return path.join(directory, name);
};

test('le validateur exerce bien le schéma 2020-12 et rejette un témoin invalide', async t => {
  const example = JSON.parse(await fs.readFile(path.join(dist, 'exemple.courriel.json'), 'utf8'));
  const cases = {
    'catalogue-manquant': (() => { const d = structuredClone(example); delete d.catalogue; return d; })(),
    'version-incorrecte': {...structuredClone(example), version: 2},
    'propriete-inconnue': {...structuredClone(example), inattendue: true},
    'composant-inconnu': (() => { const d = structuredClone(example); d.blocks[0].component = 'mail-999'; return d; })()
  };
  const files = [];
  for (const [name, doc] of Object.entries(cases)) { const file = await tmp(t, name + '.json'); await fs.writeFile(file, JSON.stringify(doc)); files.push(file); }
  const results = validate(...files);
  assert.equal(results.length, files.length);
  for (const result of results) assert.equal(result.valid, false, result.file + ' aurait dû être rejeté');
  assert.deepEqual(validate(path.join(dist, 'exemple.courriel.json')).map(r => r.valid), [true]);
});

test('exemples livrés et exports de l’application conformes au schéma JSON', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page} = await open(browser, {offline: true});
    await expand(page, 'Fichiers et récupération');
    const documentExport = await download(page, '[data-action=export-document]', 'schema-composition.json');
    const libraryExport = await download(page, '[data-action=export-library]', 'schema-bibliotheque.json');
    assert.equal(JSON.parse(await fs.readFile(documentExport, 'utf8')).schema, 'dsfr-mail/document');
    assert.equal(JSON.parse(await fs.readFile(libraryExport, 'utf8')).schema, 'dsfr-mail/library');
    const files = [path.join(dist, 'exemple.courriel.json'), path.join(dist, 'qualification.courriels.json'), documentExport, libraryExport];
    const results = validate(...files);
    assert.deepEqual(results.map(r => [path.basename(r.file), r.valid, r.errors]), files.map(f => [path.basename(f), true, []]));
  } finally { await browser.close(); }
});
