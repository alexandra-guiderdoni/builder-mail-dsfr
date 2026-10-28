/* Exécute uniquement le premier test de schéma : aucun parcours navigateur lancé. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const {tapReporterArgs} = require('./run-engines.cjs');
for (const fail of [false, true]) test(`schéma : dossiers possédés nettoyés après ${fail ? 'échec injecté' : 'succès'}, témoin préservé`, async t => {
  const owned = await fs.mkdtemp(path.join(os.tmpdir(), 'infra-schema-'));
  t.after(() => fs.rm(owned, {recursive: true, force: true}));
  const tempParent = path.join(owned, 'temporaires'), witness = path.join(tempParent, 'schema-temoin');
  await fs.mkdir(witness, {recursive: true}); await fs.writeFile(path.join(witness, 'keep.json'), '{"keep":true}');
  let target = path.join(root, 'tests/schema-validation.test.cjs');
  if (fail) {
    let source = await fs.readFile(target, 'utf8');
    source = source.replace("require('./browser-support.cjs')", 'require(' + JSON.stringify(path.join(root, 'tests/browser-support.cjs')) + ')');
    const marker = 'const results = validate(...files);';
    assert(source.includes(marker)); source = source.replace(marker, "throw new Error('panne de validateur injectée après création');");
    target = path.join(owned, 'schema-failure.test.cjs'); await fs.writeFile(target, source);
  }
  const env = {...process.env, TMPDIR: tempParent};
  // Un nouveau runner est un enfant indépendant, pas le worker node:test de son parent.
  delete env.NODE_TEST_CONTEXT;
  const run = spawnSync(process.execPath, ['--test', ...tapReporterArgs(env.NODE_OPTIONS), '--test-concurrency=1', '--test-name-pattern=^le validateur exerce', target], {cwd: root, env, encoding: 'utf8', timeout: 30000});
  assert.equal(run.error, undefined);
  assert.match(run.stdout, /le validateur exerce/, `code=${run.status}\nstderr=${run.stderr}`);
  assert.doesNotMatch(run.stderr, /recursively/);
  assert.equal(run.status, fail ? 1 : 0, run.stdout + run.stderr);
  t.diagnostic(JSON.stringify({childScope: 'premier test sans navigateur uniquement', injectedFailure: fail, exit: run.status,
    counts: Object.fromEntries([...run.stdout.matchAll(/^# (tests|pass|fail|cancelled|skipped) (\d+)$/gm)].map(([, key, count]) => [key, Number(count)]))}));
  if (fail) assert.match(run.stdout + run.stderr, /panne de validateur injectée/);
  assert.deepEqual(await fs.readdir(tempParent), ['schema-temoin']);
  assert.equal(await fs.readFile(path.join(witness, 'keep.json'), 'utf8'), '{"keep":true}');
});
