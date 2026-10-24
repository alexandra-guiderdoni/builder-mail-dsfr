#!/usr/bin/env node
// Lance les tests navigateur sur chaque moteur Playwright et sépare quatre issues : échecs produit, limitations
// d’automatisation, tests ignorés explicitement, moteur indisponible. Le point d’extension commun est tests/browser-support.cjs.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const ENGINES = ['chromium', 'webkit', 'firefox'];

function parseTap(output) {
  const results = [], lines = output.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = /^(not )?ok \d+ - (.*?)(?: # (SKIP|TODO)(?: (.*))?)?$/.exec(lines[i]);
    if (!match) continue;
    const [, failed, name, directive, reason] = match;
    if (directive) { results.push({name, status: directive.toLowerCase(), reason: reason ?? ''}); continue; }
    if (!failed) { results.push({name, status: 'pass'}); continue; }
    let message = '';
    for (let j = i + 1; j < lines.length && /^\s/.test(lines[j]); j++) {
      const detail = /^\s+error: (.*)$/.exec(lines[j]); if (detail) { message = detail[1].replace(/^['"|>-]+|['"]+$/g, '').trim() || (lines[j + 1] || '').trim(); break; }
    }
    results.push({name, status: 'fail', message});
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
    const e = engines[r.engine] ??= {pass: 0, productUnknown: 0, productKnown: 0, automation: 0, skipped: 0, total: 0};
    e.total++;
    if (r.status === 'pass') e.pass++;
    else if (r.status === 'skip' || r.status === 'todo') e.skipped++;
    else if (r.class === 'automation') e.automation++;
    else if (r.known) e.productKnown++;
    else e.productUnknown++;
  }
  return {engines, unavailable};
}
function exitCode(report) {
  if (Object.values(report.engines).some(e => e.productUnknown > 0)) return 1;
  return report.unavailable.length ? 2 : 0;
}
function selectFiles(sources) { return Object.keys(sources).filter(file => /\.launch\(/.test(sources[file])).sort(); }

function preflight(engine, root) {
  const run = spawnSync(process.execPath, ['-e', `const p=require(process.env.PLAYWRIGHT_MODULE||'playwright');p[${JSON.stringify(engine)}].launch().then(b=>b.close()).then(()=>process.exit(0),e=>{console.error(String(e.message).split('\\n')[0]);process.exit(1)})`], {cwd: root, encoding: 'utf8', timeout: 60000});
  return run.status === 0 ? null : (run.stderr.trim() || 'lancement impossible');
}
function runEngine(engine, files, dir, root, registry, timeoutMs) {
  const notes = path.join(dir, `${engine}-notes.jsonl`), results = [];
  for (const file of files) {
    const run = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', path.join(root, 'tests', file)], {cwd: root, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, env: {...process.env, MAIL_BUILDER_ENGINE: engine, MAIL_BUILDER_NOTES: notes}});
    const parsed = parseTap(run.stdout || '');
    if (!parsed.length) parsed.push({name: '(fichier entier)', status: 'fail', message: run.error ? String(run.error.message) : `aucun résultat TAP, code ${run.status}`});
    for (const r of parsed) { const full = {engine, file, ...r}; if (r.status === 'fail') Object.assign(full, classify(full, registry)); results.push(full); }
  }
  const interceptions = {};
  if (fs.existsSync(notes)) for (const line of fs.readFileSync(notes, 'utf8').split('\n').filter(Boolean)) { const n = JSON.parse(line); if (n.kind === 'clipboard-read-intercepted') interceptions[n.file] = (interceptions[n.file] || 0) + 1; }
  return {results, interceptions};
}
function render(report, results, interceptions, unavailable) {
  const out = ['Rapport multi-moteur', ''];
  for (const [engine, e] of Object.entries(report.engines)) {
    out.push(`${engine} : ${e.pass} réussis sur ${e.total} ; ${e.productUnknown} échecs produit non expliqués, ${e.productKnown} échecs produit connus, ${e.automation} limitations d’automatisation, ${e.skipped} ignorés explicitement.`);
    for (const r of results.filter(x => x.engine === engine && x.status !== 'pass')) {
      const label = r.status === 'fail' ? (r.class === 'automation' ? 'limitation d’automatisation' : r.known ? `échec produit connu${r.issue ? ' ' + r.issue : ''}` : 'échec produit non expliqué') : 'ignoré explicitement';
      out.push(`  - [${label}] ${r.file} : ${r.name}${r.reason ? ' — ' + r.reason : ''}${r.status === 'fail' && !r.reason && r.message ? ' — ' + r.message : ''}`);
    }
    const intercepted = Object.entries(interceptions[engine] || {});
    if (intercepted.length) out.push(`  Relecture du presse-papiers par interception, jamais un collage réel : ${intercepted.map(([f, n]) => `${f} (${n})`).join(', ')}.`);
  }
  for (const u of unavailable) out.push(`${u.engine} : moteur indisponible, non exécuté (limitation d’automatisation) — ${u.reason}`);
  return out.join('\n');
}
function main(argv) {
  const root = path.resolve(__dirname, '..'), option = name => (argv.find(a => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');
  const wanted = (option('engines') || ENGINES.join(',')).split(',').filter(Boolean);
  for (const w of wanted) if (!ENGINES.includes(w)) { console.error(`Moteur inconnu : ${w} (attendu : ${ENGINES.join(', ')})`); return 64; }
  const sources = Object.fromEntries(fs.readdirSync(path.join(root, 'tests')).filter(f => /\.test\.cjs$/.test(f)).map(f => [f, fs.readFileSync(path.join(root, 'tests', f), 'utf8')]));
  const only = option('files').split(',').filter(Boolean), files = selectFiles(sources).filter(f => !only.length || only.includes(f));
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'tests/engine-expectations.json'), 'utf8')).entries;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-builder-engines-')), timeoutMs = Number(option('timeout-ms')) || 180000;
  const results = [], interceptions = {}, unavailable = [];
  for (const engine of wanted) {
    const missing = preflight(engine, root);
    if (missing) { unavailable.push({engine, reason: missing}); continue; }
    const run = runEngine(engine, files, dir, root, registry, timeoutMs);
    results.push(...run.results); interceptions[engine] = run.interceptions;
  }
  const report = summarize(results, unavailable);
  console.log(render(report, results, interceptions, unavailable));
  if (option('json')) fs.writeFileSync(option('json'), JSON.stringify({...report, results, interceptions}, null, 2));
  return exitCode(report);
}
module.exports = {parseTap, classify, summarize, exitCode, selectFiles, ENGINES};
if (require.main === module) process.exit(main(process.argv.slice(2)));
