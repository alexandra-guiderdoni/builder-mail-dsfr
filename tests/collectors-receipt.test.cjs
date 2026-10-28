const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {newCollection, beginCollection, finishCollection, collectionFailure} = require('../scripts/collector_receipt.cjs');
const root = path.resolve(__dirname, '..');
const hash = value => createHash('sha256').update(value).digest('hex');
async function fixture(t, {git = true} = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'collector-receipt-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const source = path.join(directory, 'source.js'); await fs.writeFile(source, 'source measured');
  // Un vrai HEAD dans un dépôt possédé par ce test, indépendant des droits du checkout CI.
  if (git) {
    execFileSync('git', ['init', '--quiet', directory]);
    execFileSync('git', ['add', '--', 'source.js'], {cwd: directory});
    execFileSync('git', ['-c', 'user.name=Collector fixture', '-c', 'user.email=collector@example.invalid',
      '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'fixture'], {cwd: directory});
  }
  return {directory, source, sources: {[source]: hash(await fs.readFile(source))}};
}
const initial = () => ({completed: false, errors: []});

test('le reçu courant incomplet remplace le canonique après archivage exact de l’ancien', async t => {
  const {directory, sources} = await fixture(t), old = '{"completed":true,"run_id":"old"}\n';
  await fs.writeFile(path.join(directory, 'browser.json'), old);
  const report = newCollection(directory, initial());
  await beginCollection(directory, 'browser.json', report);
  const started = JSON.parse(await fs.readFile(path.join(directory, 'browser.json'), 'utf8'));
  assert.notEqual(started.run_id, 'old'); assert.equal(started.completed, false);
  assert.equal(started.collection_status, 'running'); assert.match(started.git_parent, /^[0-9a-f]{40}$/, JSON.stringify(started.proof_errors));
  assert.equal(await fs.readFile(report.previous_receipt.file, 'utf8'), old);
  assert.equal(report.previous_receipt.sha256, hash(old));
  report.completed = true;
  await finishCollection({root, output: directory, filename: 'browser.json', report, sources});
  const current = JSON.parse(await fs.readFile(path.join(directory, 'browser.json'), 'utf8'));
  assert.equal(current.completed, true); assert.equal(current.collection_status, 'completed');
  assert.equal(current.run_id, started.run_id); assert.equal(current.collected_at, started.collected_at);
  assert.deepEqual(current, JSON.parse(await fs.readFile(path.join(directory, 'runs', current.run_id, 'browser.json'), 'utf8')));
});

for (const code of ['ENOENT', 'EACCES']) test(`source ${code} : nouveau reçu d’échec écrit, erreurs primaire/preuve/nettoyage distinctes`, async t => {
  const {directory, source, sources} = await fixture(t), report = newCollection(directory, initial());
  await beginCollection(directory, 'receipt.json', report);
  collectionFailure(report, 'collection', new Error('primary failure'));
  collectionFailure(report, 'cleanup', new Error('owned cleanup refused'));
  const io = {...fs, readFile: async filename => {
    if (filename === source) throw Object.assign(new Error('source unavailable'), {code});
    return fs.readFile(filename);
  }};
  await finishCollection({root, output: directory, filename: 'receipt.json', report, sources}, io);
  const saved = JSON.parse(await fs.readFile(path.join(directory, 'receipt.json'), 'utf8'));
  assert.equal(saved.completed, false); assert.equal(saved.collection_status, 'incomplete');
  assert.equal(saved.collection_errors[0].message, 'primary failure');
  assert.equal(saved.cleanup_errors[0].message, 'owned cleanup refused');
  const sourceError = saved.proof_errors.find(error => error.phase === 'proof' && error.operation === 'source-read' && error.file === source);
  assert.ok(sourceError, JSON.stringify(saved.proof_errors)); assert.equal(sourceError.code, code);
});

test('Git non-repo et source ENOENT restent deux preuves distinctes, sans fin favorable', async t => {
  const {directory, source, sources} = await fixture(t, {git: false});
  const report = newCollection(directory, initial());
  await beginCollection(directory, 'receipt.json', report);
  await fs.unlink(source); report.completed = true;
  await finishCollection({root: directory, output: directory, filename: 'receipt.json', report, sources});
  const saved = JSON.parse(await fs.readFile(path.join(directory, 'receipt.json'), 'utf8'));
  assert.equal(saved.git_parent, null); assert.equal(saved.completed, false);
  assert.equal(saved.proof_errors.length, 2);
  const gitError = saved.proof_errors.find(error => error.phase === 'proof' && error.operation === 'git-parent');
  const sourceError = saved.proof_errors.find(error => error.phase === 'proof' && error.operation === 'source-read' && error.file === source);
  assert.ok(gitError); assert.equal(gitError.exit_status, 128); assert.equal(gitError.signal, null);
  assert.deepEqual(gitError.command, ['git', 'rev-parse', 'HEAD']); assert.equal(gitError.cwd, directory);
  assert.match(gitError.stderr, /not a git repository/i);
  assert.ok(sourceError); assert.equal(sourceError.code, 'ENOENT');
});

test('une source modifiée ou aucune source mesurée ne donne jamais une fin favorable', async t => {
  const {directory, source, sources} = await fixture(t);
  for (const expected of [sources, {}]) {
    const report = newCollection(directory, initial()); await beginCollection(directory, 'receipt.json', report);
    await fs.writeFile(source, 'modified'); report.completed = true;
    await finishCollection({root, output: directory, filename: 'receipt.json', report, sources: expected});
    assert.equal(report.completed, false); assert.ok(report.proof_errors.length);
  }
});

test('un ancien canonique illisible reste intact, et le reçu courant est écrit seulement dans son run', async t => {
  const {directory, sources} = await fixture(t), target = path.join(directory, 'receipt.json'), old = '{"completed":true,"run_id":"witness"}';
  await fs.writeFile(target, old);
  const report = newCollection(directory, initial()), io = {...fs, readFile: async filename => {
    if (filename === target) throw Object.assign(new Error('previous unreadable'), {code: 'EACCES'});
    return fs.readFile(filename);
  }};
  await assert.rejects(beginCollection(directory, 'receipt.json', report, io), {code: 'EACCES'});
  collectionFailure(report, 'collection', new Error('initialization refused'));
  await finishCollection({root, output: directory, filename: 'receipt.json', report, sources});
  assert.equal(await fs.readFile(target, 'utf8'), old);
  const current = JSON.parse(await fs.readFile(path.join(directory, 'runs', report.run_id, 'receipt.json'), 'utf8'));
  assert.equal(current.completed, false); assert.ok(current.proof_errors.length);
});

// Appels réels des trois finally, exécutés sans navigateur avec la seule frontière readFile en panne.
for (const [file, marker, end] of [
  ['scripts/audit_browser.cjs', '.finally(async () => {', '});'],
  ['scripts/audit_contrasts.cjs', '.finally(async()=>{', '});'],
  ['scripts/recipe_page_flow_firefox.mjs', 'finally{', '\n}\n}\n\nif('],
]) test(`${file} conserve son reçu même si la source disparaît à la finalisation`, async t => {
  const {directory, source, sources} = await fixture(t), report = newCollection(directory, {errors: [], observations: [], negativeControls: []});
  const filename = file.includes('audit_browser') ? 'browser.json' : file.endsWith('.mjs') ? 'recu.json' : 'receipt.json';
  await beginCollection(directory, filename, report);
  report.sourceSha256 = sources; report.completed = true;
  const text = await fs.readFile(path.join(root, file), 'utf8'), at = text.lastIndexOf(marker);
  assert.notEqual(at, -1);
  const tail = text.slice(at + marker.length);
  const body = file.endsWith('.mjs') ? tail.slice(0, tail.indexOf(end)) : tail.trim().slice(0, -end.length);
  const io = {...fs, readFile: async filename => {
    if (filename === source) throw Object.assign(new Error('source deleted at final boundary'), {code: 'ENOENT'});
    return fs.readFile(filename);
  }};
  const context = {root, output: directory, out: directory, report, receipt: report, measuredFilesSha256: sources,
    finishCollection: options => finishCollection(options, io), process: {}, console: {log() {}}, snapshots: [], errors: report.errors,
    firefox: null, host: {listening: false}, stopFirefox: async () => true, collectionFailure};
  if (file.endsWith('.mjs')) {
    const {pathToFileURL} = require('node:url');
    const {consumeCleanupReceipt} = await import(pathToFileURL(path.join(root, file)).href);
    collectionFailure(report, 'collection', new Error('primary recipe failure'));
    context.firefox = {}; // Frontière synthétique : aucun Firefox alloué.
    context.stopFirefox = async () => consumeCleanupReceipt(report, {cleanup_error: 'owned cleanup incomplete'});
  }
  await vm.runInNewContext('(async()=>{' + body + '})()', context);
  const saved = JSON.parse(await fs.readFile(path.join(directory, filename), 'utf8'));
  const sourceError = saved.proof_errors.find(error => error.phase === 'proof' && error.operation === 'source-read' && error.file === source);
  assert.equal(saved.completed, false); assert.ok(sourceError, JSON.stringify(saved.proof_errors)); assert.equal(sourceError.code, 'ENOENT');
  assert.equal(context.process.exitCode, 1);
  if (file.endsWith('.mjs')) {
    assert.equal(saved.collection_errors[0].message, 'primary recipe failure');
    assert.equal(saved.cleanup_errors[0].message, 'owned cleanup incomplete');
  }
});
