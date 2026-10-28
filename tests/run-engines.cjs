#!/usr/bin/env node
// Lance les tests navigateur sur chaque moteur Playwright et sépare quatre issues : échecs produit, limitations
// d’automatisation, tests ignorés explicitement, moteur indisponible. Le point d’extension commun est tests/browser-support.cjs.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const {randomUUID} = require('node:crypto');
const ENGINES = ['chromium', 'webkit', 'firefox'];

function parseTap(output) {
  const results = [], lines = output.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = /^(not )?ok \d+ - (.*?)(?: # (SKIP|TODO)(?: (.*))?)?$/.exec(lines[i]);
    if (!match) continue;
    const [, failed, name, directive, reason] = match;
    if (directive) { results.push({name, status: directive.toLowerCase(), reason: reason ?? ''}); continue; }
    if (!failed) { results.push({name, status: 'pass'}); continue; }
    let message = '', processExitCode, processSignal, cancelled = false;
    for (let j = i + 1; j < lines.length && /^\s/.test(lines[j]); j++) {
      const detail = /^\s+error: (.*)$/.exec(lines[j]);
      if (detail) message = detail[1].replace(/^['"|>-]+|['"]+$/g, '').trim() || (lines[j + 1] || '').trim();
      const code = /^\s+exitCode: (-?\d+)\s*$/.exec(lines[j]);
      if (code) processExitCode = Number(code[1]);
      const signal = /^\s+signal: ['"]?(SIG[A-Z0-9]+)['"]?\s*$/.exec(lines[j]);
      if (signal) processSignal = signal[1];
      if (/^\s+failureType: ['"]?cancelledByParent['"]?\s*$/.test(lines[j])) cancelled = true;
    }
    results.push({name, status: 'fail', message, ...((processExitCode !== undefined || processSignal || cancelled) ? {class: 'infrastructure', ...(processExitCode !== undefined ? {processExitCode} : {}), ...(processSignal ? {processSignal} : {}), ...(cancelled ? {cancelled: true} : {})} : {})});
  }
  return results;
}
// Un échec n’est une limitation d’automatisation ou un défaut connu que s’il est inscrit au registre avec sa raison.
function classify(result, registry) {
  const entry = registry.find(e => e.engine === result.engine && e.file === result.file && e.test === result.name);
  if (!entry) return {class: 'product', known: false};
  return entry.class === 'automation' ? {class: 'automation', reason: entry.reason} : {class: 'product', reason: entry.reason, ...(entry.issue ? {issue: entry.issue} : {}), known: true};
}
function summarize(results, unavailable = []) {
  const engines = {};
  for (const r of results) {
    const e = engines[r.engine] ??= {pass: 0, productUnknown: 0, productKnown: 0, automation: 0, infrastructure: 0, budget: 0, skipped: 0, total: 0};
    e.total++;
    if (r.status === 'pass') e.pass++;
    else if (r.status === 'skip' || r.status === 'todo') e.skipped++;
    else if (r.class === 'budget') e.budget++;
    else if (r.class === 'infrastructure') e.infrastructure++;
    else if (r.class === 'automation') e.automation++;
    else if (r.known) e.productKnown++;
    else e.productUnknown++;
  }
  return {engines, unavailable};
}
function exitCode(report) {
  if (Object.values(report.engines).some(e => e.productUnknown > 0)) return 1;
  if (Object.values(report.engines).some(e => e.infrastructure > 0 || e.budget > 0)) return 3;
  return report.unavailable.length ? 2 : 0;
}
// Plan et numérotation de premier niveau : les sous-tests indentés ne gonflent pas la portée fichier.
function tapCompletion(output, results) {
  const lines = output.split('\n'), plans = lines.filter(line => /^1\.\.\d+(?:\s+#.*)?\s*$/.test(line));
  if (/^Bail out!/m.test(output)) return 'TAP interrompu par Bail out';
  if (plans.length !== 1) return 'plan TAP terminal absent ou ambigu';
  const count = Number(/^1\.\.(\d+)/.exec(plans[0])[1]);
  const numbers = lines.flatMap(line => { const m = /^(?:not )?ok (\d+) - /.exec(line); return m ? [Number(m[1])] : []; });
  if (count !== results.length || numbers.some((n, i) => n !== i + 1)) return 'plan TAP et résultats incomplets ou incohérents';
  if (lines.slice(lines.indexOf(plans[0]) + 1).some(line => /^(?:not )?ok \d+ - /.test(line))) return 'plan TAP non terminal';
  return null;
}
function processResults(run) {
  const results = parseTap(run.stdout || ''), incomplete = tapCompletion(run.stdout || '', results);
  const failure = (kind, message) => results.push({name: '(exécution du fichier)', status: 'fail', resultType: 'execution', class: kind, message});
  if (run.error?.code === 'ETIMEDOUT') failure('budget', 'budget du fichier dépassé (ETIMEDOUT)');
  else if (run.error || run.signal || (run.status !== 0 && !(run.status === 1 && !incomplete && results.some(r => r.status === 'fail')))) {
    failure('infrastructure', run.error ? String(run.error.message) : run.signal ? `processus interrompu : ${run.signal}` : `processus terminé avec le code ${run.status}`);
  }
  if (incomplete) failure('infrastructure', incomplete);
  if (!results.length) results.push({name: '(aucun test déclaré)', status: 'skip', reason: 'plan TAP 1..0'});
  return results;
}
// Préchargé dans chaque enfant : la preuve est un lancement réellement réussi, jamais le moteur demandé seul.
function recordLaunches() {
  const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  for (const engine of ENGINES) {
    const type = playwright[engine], original = type.launch;
    type.launch = async function (...args) {
      const entry = {kind: 'browser-launch', executionId: process.env.MAIL_BUILDER_EXECUTION_ID, requestedEngine: process.env.MAIL_BUILDER_ENGINE, engine, file: process.env.MAIL_BUILDER_TEST_FILE};
      const note = (phase, actual = engine) => fs.appendFileSync(process.env.MAIL_BUILDER_NOTES, JSON.stringify({...entry, engine: actual, launcherEngine: engine, phase}) + '\n');
      note('attempted');
      const browser = await original.apply(this, args);
      try { const actual = browser.browserType().name(); if (!ENGINES.includes(actual)) throw new Error('Type de navigateur lancé inconnu'); note('succeeded', actual); } catch (error) { await browser.close(); throw error; }
      return browser;
    };
  }
}
if (process.env.MAIL_BUILDER_RECORD_LAUNCHES === '1') recordLaunches();
function selectFiles(sources) { return Object.keys(sources).filter(file => /\.launch\(/.test(sources[file])).sort(); }

// NODE_OPTIONS est conservé intégralement. Node cumule ses reporters avec ceux de la CLI.
// Transcription de ParseNodeOptionsEnvVar, Node v24.22.1 src/node_options.cc (ParseNodeOptionsEnvVar).
function nodeOptionsTokens(nodeOptions) {
  const tokens = []; let quoted = false, newArgument = true;
  for (let i = 0; i < nodeOptions.length; i++) {
    let c = nodeOptions[i];
    if (c === '\\' && quoted) {
      if (i + 1 === nodeOptions.length) throw new Error('NODE_OPTIONS : échappement non terminé');
      c = nodeOptions[++i];
    } else if (c === ' ' && !quoted) { newArgument = true; continue; }
    else if (c === '"') { quoted = !quoted; continue; }
    if (newArgument) { tokens.push(c); newArgument = false; }
    else tokens[tokens.length - 1] += c;
  }
  if (quoted) throw new Error('NODE_OPTIONS : citation double non terminée');
  return tokens;
}
function tapReporterArgs(nodeOptions = process.env.NODE_OPTIONS || '') {
  const tokens = nodeOptionsTokens(nodeOptions);
  const reporters = [], destinations = [];
  for (let i = 0; i < tokens.length; i++) {
    const equals = tokens[i].indexOf('='), name = (equals < 0 ? tokens[i] : tokens[i].slice(0, equals)).replaceAll('_', '-');
    for (const [flag, values] of [['--test-reporter', reporters], ['--test-reporter-destination', destinations]]) {
      if (name !== flag) continue;
      values.push(equals < 0 ? tokens[++i] || '' : tokens[i].slice(equals + 1)); break;
    }
  }
  if (reporters.length > 1 || (reporters.length && reporters[0] !== 'tap') || destinations.length > 1 || (destinations.length && (destinations[0] !== 'stdout' || reporters.length !== 1))) {
    throw new Error('NODE_OPTIONS : reporter/destination incompatible avec un unique TAP sur stdout ; aucun sous-processus lancé');
  }
  return reporters.length ? [] : ['--test-reporter=tap'];
}

function preflight(engine, root) {
  const run = spawnSync(process.execPath, ['-e', `const p=require(process.env.PLAYWRIGHT_MODULE||'playwright');p[${JSON.stringify(engine)}].launch().then(b=>b.close()).then(()=>process.exit(0),e=>{console.error(String(e.message).split('\\n')[0]);process.exit(1)})`], {cwd: root, encoding: 'utf8', timeout: 60000});
  return run.status === 0 ? null : (run.stderr.trim() || 'lancement impossible');
}
function runEngine(engine, files, dir, root, registry, timeoutMs) {
  const reporterArgs = tapReporterArgs();
  const notes = path.join(dir, `${engine}-notes.jsonl`), results = [], executions = [], interceptions = {};
  for (const file of files) {
    const executionId = randomUUID();
    const run = spawnSync(process.execPath, ['--require', __filename, '--test', '--test-concurrency=1', ...reporterArgs, path.join(root, 'tests', file)], {cwd: root, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, env: {...process.env, NODE_TEST_CONTEXT: undefined, MAIL_BUILDER_ENGINE: engine, MAIL_BUILDER_NOTES: notes, MAIL_BUILDER_RECORD_LAUNCHES: '1', MAIL_BUILDER_TEST_FILE: file, MAIL_BUILDER_EXECUTION_ID: executionId}});
    const entries = fs.existsSync(notes) ? fs.readFileSync(notes, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(n => n.executionId === executionId) : [];
    const actualEngines = [...new Set(entries.filter(n => n.kind === 'browser-launch' && n.phase === 'succeeded').map(n => n.engine))].sort();
    const attributed = actualEngines.join('+') || 'not-observed';
    const stem = path.join(dir, `${engine}-${file}`);
    fs.writeFileSync(stem + '.tap', run.stdout || ''); fs.writeFileSync(stem + '.stderr.log', run.stderr || '');
    const execution = {executionId, file, requestedEngine: engine, actualEngines, attributionScope: 'file; no per-test browser attribution', status: run.status, signal: run.signal, errorCode: run.error?.code || null, stdout: stem + '.tap', stderr: stem + '.stderr.log'};
    fs.writeFileSync(stem + '.process.json', JSON.stringify(execution, null, 2)); executions.push(execution);
    for (const r of processResults(run)) {
      const full = {engine: attributed, requestedEngine: engine, actualEngines, attributionScope: 'file', file, ...r};
      if (r.status === 'fail' && !r.class) Object.assign(full, classify(full, registry));
      results.push(full);
    }
    const count = entries.filter(n => n.kind === 'clipboard-read-intercepted').length;
    if (count) interceptions[file] = (interceptions[file] || 0) + count;
  }
  return {results, interceptions, executions};
}
function render(report, results, interceptions, unavailable) {
  const out = ['Rapport multi-moteur', 'Les totaux incluent les tests TAP et les contrôles explicites de terminaison/complétude. Attribution par fichier : un groupe mixte ne prouve pas que chaque test a utilisé chacun de ses moteurs. not-observed signifie aucun lancement réussi observé, pas une qualification du moteur demandé.', ''];
  for (const [engine, e] of Object.entries(report.engines)) {
    out.push(`${engine} : ${e.pass} réussis sur ${e.total} ; ${e.productUnknown} échecs produit non expliqués, ${e.productKnown} échecs produit connus, ${e.automation} limitations d’automatisation, ${e.infrastructure} erreurs d’exécution/complétude, ${e.budget} budgets dépassés, ${e.skipped} ignorés explicitement.`);
    for (const r of results.filter(x => x.engine === engine && x.status !== 'pass')) {
      const label = r.status === 'fail' ? (r.class === 'budget' ? 'budget dépassé' : r.class === 'infrastructure' ? 'exécution ou TAP incomplet' : r.class === 'automation' ? 'limitation d’automatisation' : r.known ? `échec produit connu${r.issue ? ' ' + r.issue : ''}` : 'échec produit non expliqué') : 'ignoré explicitement';
      out.push(`  - [${label}] ${r.file} : ${r.name}${r.reason ? ' — ' + r.reason : ''}${r.status === 'fail' && !r.reason && r.message ? ' — ' + r.message : ''}`);
    }
  }
  for (const [requested, entries] of Object.entries(interceptions)) {
    const intercepted = Object.entries(entries);
    if (intercepted.length) out.push(`Passage demandé ${requested} — relecture du presse-papiers par interception, jamais un collage réel : ${intercepted.map(([f, n]) => `${f} (${n})`).join(', ')}.`);
  }
  for (const u of unavailable) out.push(`${u.engine} : moteur indisponible, non exécuté (limitation d’automatisation) — ${u.reason}`);
  return out.join('\n');
}
function main(argv) {
  try { tapReporterArgs(); } catch (error) { console.error(error.message); return 64; }
  const root = path.resolve(__dirname, '..'), option = name => (argv.find(a => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');
  const explicit = name => argv.some(a => a.startsWith(`--${name}=`));
  const wanted = (explicit('engines') ? option('engines') : ENGINES.join(',')).split(',').filter(Boolean);
  if (!wanted.length) { console.error('Sélection de moteurs vide'); return 64; }
  for (const w of wanted) if (!ENGINES.includes(w)) { console.error(`Moteur inconnu : ${w} (attendu : ${ENGINES.join(', ')})`); return 64; }
  const sources = Object.fromEntries(fs.readdirSync(path.join(root, 'tests')).filter(f => /\.test\.cjs$/.test(f)).map(f => [f, fs.readFileSync(path.join(root, 'tests', f), 'utf8')]));
  const only = option('files').split(',').filter(Boolean), eligible = selectFiles(sources);
  if (explicit('files') && !only.length) { console.error('Sélection de fichiers vide'); return 64; }
  for (const file of only) if (!eligible.includes(file)) { console.error(`Fichier inconnu ou non éligible au runner navigateur : ${file}`); return 64; }
  const files = eligible.filter(f => !only.length || only.includes(f));
  if (!files.length) { console.error('Aucun fichier navigateur éligible sélectionné'); return 64; }
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'tests/engine-expectations.json'), 'utf8')).entries;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-builder-engines-')), timeoutMs = Number(option('timeout-ms')) || 180000;
  const results = [], interceptions = {}, unavailable = [], executions = [];
  for (const engine of wanted) {
    const missing = preflight(engine, root);
    if (missing) { unavailable.push({engine, reason: missing}); continue; }
    const run = runEngine(engine, files, dir, root, registry, timeoutMs);
    results.push(...run.results); interceptions[engine] = run.interceptions; executions.push(...run.executions);
  }
  const report = summarize(results, unavailable);
  console.log(render(report, results, interceptions, unavailable));
  if (option('json')) fs.writeFileSync(option('json'), JSON.stringify({...report, results, interceptions, executions, evidenceDirectory: dir, attributionScope: 'file; mixed groups are not per-test coverage'}, null, 2));
  return exitCode(report);
}
module.exports = {parseTap, tapCompletion, processResults, classify, summarize, exitCode, selectFiles, runEngine, recordLaunches, render, tapReporterArgs, nodeOptionsTokens, ENGINES};
if (require.main === module) process.exit(main(process.argv.slice(2)));
