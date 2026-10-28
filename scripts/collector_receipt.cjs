/* Finalisation des reçus de collecte : identité courante, preuves et erreurs conservées. */
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash, randomUUID} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const canonicalAllowed = new WeakSet();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function collectionFailure(report, phase, error, fields = {}) {
  const entry = {phase, ...fields, code: error.code || null, message: error.message || String(error)};
  report[phase + '_errors'].push(entry);
  report.errors.push(`${phase}: ${entry.message}${fields.file ? ' (' + fields.file + ')' : ''}`);
  report.completed = false;
}

function newCollection(root, initial) {
  const report = {...initial, run_id: 'collector-' + randomUUID(), collected_at: new Date().toISOString(),
    git_parent: null, completed: false, collection_status: 'running',
    collection_errors: [], proof_errors: [], cleanup_errors: []};
  report.errors ||= [];
  try { report.git_parent = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); }
  catch (error) {
    collectionFailure(report, 'proof', error, {operation: 'git-parent',
      command: ['git', 'rev-parse', 'HEAD'], cwd: root,
      exit_status: error.status ?? null, signal: error.signal ?? null,
      stderr: error.stderr == null ? null : String(error.stderr)});
  }
  return report;
}

async function persist(output, filename, report, io) {
  const directory = path.join(output, 'runs', report.run_id);
  await io.mkdir(directory, {recursive: true});
  const bytes = JSON.stringify(report, null, 2) + '\n';
  for (const target of [path.join(directory, filename), ...(canonicalAllowed.has(report) ? [path.join(output, filename)] : [])]) {
    const temporary = target + '.' + report.run_id + '.tmp';
    await io.writeFile(temporary, bytes);
    await io.rename(temporary, target);
  }
}

async function beginCollection(output, filename, report, io = fs) {
  await io.mkdir(path.join(output, 'runs', report.run_id), {recursive: true});
  try {
    const previous = await io.readFile(path.join(output, filename));
    const archive = path.join(output, 'runs', report.run_id, 'previous-' + filename);
    await io.writeFile(archive, previous, {flag: 'wx'});
    report.previous_receipt = {file: archive, sha256: hash(previous)};
  } catch (error) {
    if (error.code !== 'ENOENT') throw error; // Ne pas écraser un ancien reçu qu'on n'a pas pu préserver.
  }
  canonicalAllowed.add(report);
  await persist(output, filename, report, io); // Incomplet dès le début : aucun ancien PASS implicite.
}

async function finishCollection({root, output, filename, report, sources}, io = fs) {
  const entries = Object.entries(sources || {});
  if (!entries.length) collectionFailure(report, 'proof', new Error('Aucune source mesurée à revérifier.'));
  for (const [file, expected] of entries) {
    try {
      const observed = hash(await io.readFile(path.resolve(root, file)));
      if (observed !== expected) collectionFailure(report, 'proof', Object.assign(new Error('Source modifiée pendant la collecte.'), {code: 'SOURCE_CHANGED'}), {file, expected, observed});
    } catch (error) { collectionFailure(report, 'proof', error, {file, operation: 'source-read'}); }
  }
  if (!canonicalAllowed.has(report)) collectionFailure(report, 'proof', new Error('Initialisation du reçu courant inachevée ; ancien canonique préservé.'));
  report.completed = report.completed === true && !report.errors.length &&
    !report.collection_errors.length && !report.proof_errors.length && !report.cleanup_errors.length;
  report.collection_status = report.completed ? 'completed' : 'incomplete';
  report.finished_at = new Date().toISOString();
  await persist(output, filename, report, io);
  return report;
}

module.exports = {newCollection, beginCollection, finishCollection, collectionFailure};
