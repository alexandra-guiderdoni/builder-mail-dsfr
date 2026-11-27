/* #234 : audit_contrasts.cjs refuse une collecte de référence incomplète, en erreur ou sans source mesurée. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const root = path.join(__dirname, '..');
const measured = 'package.json';

async function refusal(t, change) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'builder-contrast-baseline-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const baseline = path.join(directory, 'baseline'), output = path.join(directory, 'mesures');
  await fs.mkdir(baseline);
  const digest = createHash('sha256').update(await fs.readFile(path.join(root, measured))).digest('hex');
  const receipt = {completed: true, collection_status: 'completed', run_id: 'collector-test', git_parent: 'test-git',
    measuredFilesSha256: {[measured]: digest}, errors: [], collection_errors: [], proof_errors: [], cleanup_errors: []};
  await fs.writeFile(path.join(baseline, 'browser.json'), JSON.stringify({...receipt, ...change}));
  const result = spawnSync(process.execPath, ['scripts/audit_contrasts.cjs'], {cwd: root, encoding: 'utf8', timeout: 180000,
    env: {...process.env, BUILDER_CONTRAST_BASELINE: baseline, BUILDER_CONTRAST_OUTPUT: output}});
  const summary = JSON.parse(result.stdout.trim().split('\n').at(-1));
  const written = JSON.parse(await fs.readFile(path.join(output, 'receipt.json'), 'utf8'));
  return {result, summary, written};
}

for (const [label, change] of [
  ['collecte inachevée', {completed: false, collection_status: 'incomplete'}],
  ['erreur de preuve', {proof_errors: [{phase: 'proof', message: 'Source modifiée pendant la collecte.'}]}],
  ['aucune source mesurée', {measuredFilesSha256: {}}],
]) test(`audit_contrasts refuse une référence : ${label}`, async t => {
  const {result, summary, written} = await refusal(t, change);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(summary.errors.join('\n'), /Collecte de référence absente, incomplète ou en erreur/);
  assert.equal(summary.completed, false);
  assert.equal(summary.observations, 0);
  assert.equal(written.browser, undefined, 'aucun navigateur ne doit être lancé');
  assert.equal(written.completed, false);
});
