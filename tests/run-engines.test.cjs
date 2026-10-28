const test = require('node:test');
const assert = require('node:assert/strict');
const {parseTap, classify, summarize, exitCode, selectFiles} = require('./run-engines.cjs');
const tap = [
  'TAP version 13', '# Subtest: réussi', 'ok 1 - réussi', '  ---', '  duration_ms: 3', '  ...',
  '# Subtest: échoué', 'not ok 2 - échoué', '  ---', '  duration_ms: 4', "  error: 'valeur attendue'", '  ...',
  'ok 3 - ignoré # SKIP pas de collage réel', 'ok 4 - à faire # TODO plus tard', '1..4'
].join('\n');
test('la sortie TAP donne un résultat par test, avec le message d’échec et la raison d’un test ignoré', () => {
  assert.deepEqual(parseTap(tap), [
    {name: 'réussi', status: 'pass'},
    {name: 'échoué', status: 'fail', message: 'valeur attendue'},
    {name: 'ignoré', status: 'skip', reason: 'pas de collage réel'},
    {name: 'à faire', status: 'todo', reason: 'plus tard'}
  ]);
});
test('un échec absent du registre est un échec produit ; un échec inscrit prend la classe et la raison du registre', () => {
  const registry = [{engine: 'webkit', file: 'a.test.cjs', test: 'échoué', class: 'automation', reason: 'API absente'}, {engine: 'webkit', file: 'a.test.cjs', test: 'largeur', class: 'product', reason: 'défaut connu', issue: '#39'}];
  assert.deepEqual(classify({engine: 'webkit', file: 'a.test.cjs', name: 'échoué', status: 'fail'}, registry), {class: 'automation', reason: 'API absente'});
  assert.deepEqual(classify({engine: 'webkit', file: 'a.test.cjs', name: 'largeur', status: 'fail'}, registry), {class: 'product', reason: 'défaut connu', issue: '#39', known: true});
  assert.deepEqual(classify({engine: 'webkit', file: 'a.test.cjs', name: 'autre', status: 'fail'}, registry), {class: 'product', known: false});
  assert.deepEqual(classify({engine: 'firefox', file: 'a.test.cjs', name: 'échoué', status: 'fail'}, registry), {class: 'product', known: false});
});
test('le bilan sépare réussites, échecs produit, limitations d’automatisation, ignorés et moteur indisponible', () => {
  const results = [
    {engine: 'webkit', file: 'a', name: '1', status: 'pass'},
    {engine: 'webkit', file: 'a', name: '2', status: 'fail', class: 'product', known: false},
    {engine: 'webkit', file: 'a', name: '3', status: 'fail', class: 'product', known: true},
    {engine: 'webkit', file: 'a', name: '4', status: 'fail', class: 'automation'},
    {engine: 'webkit', file: 'a', name: '5', status: 'skip', reason: 'x'}
  ];
  const report = summarize(results, [{engine: 'firefox', reason: 'exécutable absent'}]);
  assert.deepEqual(report.engines.webkit, {pass: 1, productUnknown: 1, productKnown: 1, automation: 1, infrastructure: 0, budget: 0, skipped: 1, total: 5});
  assert.deepEqual(report.unavailable, [{engine: 'firefox', reason: 'exécutable absent'}]);
});
test('le code de sortie échoue sur un échec produit inconnu, signale un moteur absent, et accepte seulement le reste', () => {
  const ok = {engines: {webkit: {pass: 3, productUnknown: 0, productKnown: 1, automation: 1, skipped: 1, total: 6}}, unavailable: []};
  assert.equal(exitCode(ok), 0);
  assert.equal(exitCode({...ok, unavailable: [{engine: 'firefox', reason: 'absent'}]}), 2);
  assert.equal(exitCode({engines: {webkit: {...ok.engines.webkit, productUnknown: 1}}, unavailable: [{engine: 'firefox', reason: 'absent'}]}), 1);
});
test('seuls les fichiers qui lancent un navigateur sont rejoués par moteur', () => {
  const sources = {'a-browser.test.cjs': "const b = await chromium.launch();", 'b.test.cjs': "assert.equal(1, 1);", 'c.test.cjs': "const {chromium} = require('./browser-support.cjs'); test('x', async () => { const browser = await chromium.launch({headless: true}); });"};
  assert.deepEqual(selectFiles(sources), ['a-browser.test.cjs', 'c.test.cjs']);
});
test('chaque entrée du registre désigne un test existant, un moteur connu, une classe valide et une raison', () => {
  const fs = require('node:fs'), path = require('node:path');
  const {ENGINES} = require('./run-engines.cjs'), {entries} = JSON.parse(fs.readFileSync(path.join(__dirname, 'engine-expectations.json'), 'utf8'));
  for (const e of entries) {
    assert(ENGINES.includes(e.engine), `moteur inconnu : ${e.engine}`);
    assert(['product', 'automation'].includes(e.class), `classe invalide : ${e.class}`);
    assert(e.reason && e.reason.length > 20, `raison absente : ${e.test}`);
    assert(!e.issue || /^#\d+$/.test(e.issue), `issue mal formée : ${e.issue}`);
    assert(fs.readFileSync(path.join(__dirname, e.file), 'utf8').includes(e.test), `test absent de ${e.file} : ${e.test}`);
  }
  assert.equal(new Set(entries.map(e => [e.engine, e.file, e.test].join('|'))).size, entries.length, 'entrée en double');
});

test('un enfant réel interrompu, expiré ou à TAP tronqué ne peut pas qualifier le fichier', () => {
  const {spawnSync} = require('node:child_process');
  const {processResults} = require('./run-engines.cjs');
  const cases = [
    ['complete', "process.stdout.write('TAP version 13\\nok 1 - témoin\\n1..1\\n')", null],
    ['exit9', "process.stdout.write('TAP version 13\\nok 1 - témoin\\n1..1\\n');process.exitCode=9", 'infrastructure'],
    ['truncated', "process.stdout.write('TAP version 13\\nok 1 - témoin\\n')", 'infrastructure'],
    ['timeout', "process.stdout.write('TAP version 13\\nok 1 - témoin\\n');setInterval(()=>{},1000)", 'budget'],
    ['signal', "process.stdout.write('TAP version 13\\nok 1 - témoin\\n');process.kill(process.pid,'SIGTERM')", 'infrastructure'],
    ['assertion', "process.stdout.write('TAP version 13\\nnot ok 1 - témoin\\n1..1\\n');process.exitCode=1", 'product']
  ];
  for (const [name, code, expected] of cases) {
    const run = spawnSync(process.execPath, ['-e', code], {encoding: 'utf8', timeout: name === 'timeout' ? 1000 : 5000});
    const results = processResults(run).map(r => ({engine: 'not-observed', file: 'fixture', ...r, ...(r.status === 'fail' && !r.class ? classify({engine: 'not-observed', name: r.name, status: r.status}, []) : {})}));
    const report = summarize(results);
    assert.equal(exitCode(report) === 0, expected === null, name);
    if (expected) assert(results.some(r => r.status === 'fail' && r.class === expected), name);
    if (name === 'timeout') assert.equal(run.error.code, 'ETIMEDOUT');
    if (name === 'signal') assert.equal(run.signal, 'SIGTERM');
  }
});

test('le plan TAP doit être unique, terminal et cohérent, sans transformer les assertions en erreurs de budget', () => {
  const {processResults, tapCompletion} = require('./run-engines.cjs');
  for (const stdout of ['ok 1 - x\n1..2\n', 'ok 2 - x\n1..1\n', '1..1\nok 1 - x\n', 'ok 1 - x\n1..1\n1..1\n', 'Bail out!\n1..0\n']) {
    assert(tapCompletion(stdout, parseTap(stdout)), stdout);
    assert.notEqual(exitCode(summarize(processResults({stdout, status: 0, signal: null}).map(r => ({engine: 'x', ...r})))), 0);
  }
  assert.deepEqual(processResults({stdout: '1..0\n', status: 0, signal: null}), [{name: '(aucun test déclaré)', status: 'skip', reason: 'plan TAP 1..0'}]);
  assert.deepEqual(processResults({stdout: tap, status: 1, signal: null}), parseTap(tap), 'une assertion échouée avec TAP complet garde son attribution produit');
});

test('les lancements mixtes sont observés par fichier sans gonfler la couverture de chaque moteur demandé', () => {
  const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
  const {runEngine} = require('./run-engines.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-runner-owned-'));
  const previous = process.env.PLAYWRIGHT_MODULE;
  try {
    fs.mkdirSync(path.join(root, 'tests')); const dir = path.join(root, 'results'); fs.mkdirSync(dir);
    const stub = path.join(root, 'fake-playwright.cjs');
    fs.writeFileSync(stub, "module.exports=Object.fromEntries(['chromium','webkit','firefox'].map(name=>[name,{async launch(){return {browserType(){return {name:()=>name}},async close(){}}}}]));");
    fs.writeFileSync(path.join(root, 'tests', 'mixed.test.cjs'), "const test=require('node:test');const p=require(process.env.PLAYWRIGHT_MODULE);test('deux adaptateurs factices',async()=>{for(const name of ['chromium','webkit']){const b=await p[name].launch();await b.close();}});");
    process.env.PLAYWRIGHT_MODULE = stub;
    const run = runEngine('firefox', ['mixed.test.cjs'], dir, root, [], 10000);
    assert.equal(exitCode(summarize(run.results)), 0, JSON.stringify(run));
    assert.equal(run.results.length, 1);
    assert.equal(run.results[0].engine, 'chromium+webkit');
    assert.equal(run.results[0].requestedEngine, 'firefox');
    assert.deepEqual(run.results[0].actualEngines, ['chromium', 'webkit']);
    assert.equal(run.results[0].attributionScope, 'file');
    assert.equal(summarize(run.results).engines.firefox, undefined, 'aucune réussite attribuée à Firefox');
    assert.equal(summarize(run.results).engines.chromium, undefined, 'pas de duplication du résultat sur chacun des moteurs');
    const receipt = JSON.parse(fs.readFileSync(path.join(dir, 'firefox-mixed.test.cjs.process.json'), 'utf8'));
    assert.deepEqual(receipt.actualEngines, ['chromium', 'webkit']);
    assert.equal(receipt.status, 0);
    assert.match(receipt.attributionScope, /no per-test/);
    assert(fs.readFileSync(receipt.stdout, 'utf8').includes('deux adaptateurs factices'));
    // Le nom demandé au lanceur n’est pas la preuve du type retourné.
    fs.writeFileSync(stub, "module.exports=Object.fromEntries(['chromium','webkit','firefox'].map(name=>[name,{async launch(){return {browserType(){return {name:()=>name==='chromium'?'firefox':name}},async close(){}}}}]));");
    fs.writeFileSync(path.join(root, 'tests', 'alias.test.cjs'), "const test=require('node:test');test('type retourné',async()=>{const b=await require(process.env.PLAYWRIGHT_MODULE).chromium.launch();await b.close();});");
    const alias = runEngine('chromium', ['alias.test.cjs'], dir, root, [], 10000);
    assert.equal(exitCode(summarize(alias.results)), 0);
    assert.equal(alias.results[0].requestedEngine, 'chromium');
    assert.equal(alias.results[0].engine, 'firefox');
    assert.deepEqual(alias.results[0].actualEngines, ['firefox']);
    fs.writeFileSync(path.join(root, 'tests', 'crash.test.cjs'), "const test=require('node:test');test('avant arrêt worker',()=>{});setTimeout(()=>process.exit(9),50);");
    const crash = runEngine('firefox', ['crash.test.cjs'], dir, root, [], 10000);
    assert(crash.results.some(r => r.status === 'fail' && r.class === 'infrastructure' && r.processExitCode === 9), JSON.stringify(crash));
    assert.equal(exitCode(summarize(crash.results)), 3);


  } finally {
    if (previous === undefined) delete process.env.PLAYWRIGHT_MODULE; else process.env.PLAYWRIGHT_MODULE = previous;
    fs.rmSync(root, {recursive: true, force: true});
  }
});


test('runEngine conserve un vrai budget dépassé après le premier test réussi, avec ses pièces brutes', async t => {
  const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
  const {runEngine} = require('./run-engines.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-runner-budget-owned-'));
  const previous = process.env.PLAYWRIGHT_MODULE;
  try {
    fs.mkdirSync(path.join(root, 'tests')); const dir = path.join(root, 'results'); fs.mkdirSync(dir);
    const stub = path.join(root, 'fake-playwright.cjs');
    fs.writeFileSync(stub, "module.exports=Object.fromEntries(['chromium','webkit','firefox'].map(name=>[name,{async launch(){throw Error('aucun navigateur attendu')}}]));");
    const workerTrace = path.join(root, 'owned-worker.jsonl');
    // Cette fixture ne doit pas survivre au parent node --test tué par le budget : attente intrinsèquement finie.
    fs.writeFileSync(path.join(root, 'tests', 'budget.test.cjs'), `const fs=require('node:fs'),test=require('node:test');const log=kind=>fs.appendFileSync(${JSON.stringify(workerTrace)},JSON.stringify({kind,pid:process.pid,ppid:process.ppid,at:Date.now()})+'\\n');log('boot');test('premier témoin',()=>{});test('attente maintenue',()=>new Promise(resolve=>setTimeout(()=>{log('bounded-completion');resolve();},2000)));`);
    process.env.PLAYWRIGHT_MODULE = stub;
    const run = runEngine('firefox', ['budget.test.cjs'], dir, root, [], 1000);
    assert(run.results.some(r => r.status === 'pass' && r.name === 'premier témoin'));
    assert(run.results.some(r => r.status === 'fail' && r.class === 'budget'));
    assert(run.results.some(r => r.status === 'fail' && r.class === 'infrastructure' && /plan TAP/.test(r.message)));
    assert.equal(exitCode(summarize(run.results)), 3);
    assert.equal(run.executions[0].errorCode, 'ETIMEDOUT');
    t.diagnostic(JSON.stringify({kind: 'owned-child-timeout', status: run.executions[0].status, signal: run.executions[0].signal, errorCode: run.executions[0].errorCode}));
    assert.equal(run.results[0].engine, 'not-observed');
    assert(fs.readFileSync(run.executions[0].stdout, 'utf8').includes('ok 1 - premier témoin'));
  } finally {
    if (previous === undefined) delete process.env.PLAYWRIGHT_MODULE; else process.env.PLAYWRIGHT_MODULE = previous;
    const trace = path.join(root, 'owned-worker.jsonl'), deadline = Date.now() + 5000;
    const rows = () => fs.existsSync(trace) ? fs.readFileSync(trace, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
    let observed = rows(), worker = observed.find(row => row.kind === 'boot'), disappeared = false;
    while (Date.now() < deadline) {
      observed = rows(); worker ||= observed.find(row => row.kind === 'boot');
      if (worker && observed.some(row => row.kind === 'bounded-completion')) {
        // Signal 0 = interrogation d'existence uniquement ; jamais de signal destructif, jamais de PID historique.
        try { process.kill(worker.pid, 0); } catch (error) { if (error.code !== 'ESRCH') throw error; disappeared = true; break; }
      }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert(worker, 'le worker propre a laissé son reçu de démarrage');
    assert(observed.some(row => row.kind === 'bounded-completion'), 'la borne naturelle de la fixture a réellement terminé');
    assert(disappeared, `sortie du worker propre non observée ; preuves conservées dans ${root}`);
    t.diagnostic(JSON.stringify({kind: 'owned-fixture-cleanup', pid: worker.pid, boundedCompletion: true, existenceQuery: 'ESRCH', exitCallback: 'not-observed-not-claimed'}));
    fs.rmSync(root, {recursive: true, force: true});
  }
});


test('le rendu conserve l’avertissement d’interception même quand la couverture observée est mixte', () => {
  const {render} = require('./run-engines.cjs');
  const result = {engine: 'firefox+webkit', requestedEngine: 'firefox', file: 'mixed.test.cjs', status: 'pass'};
  const text = render(summarize([result]), [result], {firefox: {'mixed.test.cjs': 1}}, []);
  assert.match(text, /groupe mixte ne prouve pas que chaque test/);
  assert.match(text, /Passage demandé firefox.*interception, jamais un collage réel.*mixed.test.cjs/);
});


test('la CLI refuse toute sélection vide ou inconnue avant le prévol moteur', () => {
  const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, 'run-engines.cjs'), 'utf8');
  function invoke(args) {
    let preflights = 0, directories = 0; const errors = [];
    const sandbox = {module: {exports: {}}, exports: {}, __dirname, __filename: path.join(__dirname, 'run-engines.cjs'), process: {env: {}, execPath: process.execPath}, console: {log() {}, error(message) { errors.push(message); }}, require(name) {
      if (name === 'node:child_process') return {spawnSync() { preflights++; return {status: 1, stderr: 'prévol factice indisponible'}; }};
      if (name === 'node:fs') return {...fs, mkdtempSync() { directories++; return '/synthetic/no-allocation'; }};
      return require(name);
    }};
    vm.runInNewContext(source + '\nmodule.exports.invokeMain = main;', sandbox);
    const status = sandbox.module.exports.invokeMain(args);
    return {status, preflights, directories, errors};
  }
  const sources = Object.fromEntries(fs.readdirSync(__dirname).filter(f => /\.test\.cjs$/.test(f)).map(f => [f, fs.readFileSync(path.join(__dirname, f), 'utf8')]));
  const eligible = selectFiles(sources)[0], ineligible = Object.keys(sources).find(f => !selectFiles(sources).includes(f));
  assert(ineligible);
  for (const args of [
    ['--engines=chromium', '--files=typo-nonexistent.test.cjs'],
    ['--engines=chromium', `--files=${ineligible}`],
    ['--engines=chromium', `--files=${eligible},typo-nonexistent.test.cjs`],
    ['--engines=,'], ['--engines='], ['--files=,'], ['--files=']
  ]) {
    const result = invoke(args);
    assert.equal(result.status, 64, JSON.stringify({args, ...result}));
    assert.equal(result.preflights, 0); assert.equal(result.directories, 0);
    assert(result.errors.length > 0);
  }
  const valid = invoke(['--engines=firefox', `--files=${eligible}`]);
  assert.equal(valid.status, 2); assert.equal(valid.preflights, 1);
  const defaults = invoke([]);
  assert.equal(defaults.status, 2); assert.equal(defaults.preflights, 3);
});

test('NODE_OPTIONS : un seul reporter TAP effectif sans perdre les options étrangères', () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const {spawnSync} = require('node:child_process'), {tapReporterArgs} = require('./run-engines.cjs');
  const owned = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-reporter-owned-'));
  try {
    const file = path.join(owned, 'finite.test.cjs'), observed = path.join(owned, 'node-options.txt');
    fs.writeFileSync(file, `require('node:test')('option conservée',()=>{require('node:fs').writeFileSync(${JSON.stringify(observed)},process.env.NODE_OPTIONS);});`);
    for (const options of ['', '--test-reporter=tap', '--test-reporter tap', '--no-warnings --test-reporter=tap --stack-trace-limit=21', '--test-reporter="tap" --no-warnings', '"--test-reporter=tap" --test-reporter-destination stdout', '--test_reporter=tap', '--test_reporter tap --no-warnings', '--test_reporter=tap --test-reporter_destination=stdout', '--test-reporter="t\\ap" --test_reporter_destination="std\\out"']) {
      const args = tapReporterArgs(options);
      assert.deepEqual(args, options ? [] : ['--test-reporter=tap']);
      const run = spawnSync(process.execPath, ['--test', ...args, file], {env: {...process.env, NODE_TEST_CONTEXT: undefined, NODE_OPTIONS: options}, encoding:'utf8', timeout:5000});
      assert.equal(run.error, undefined); assert.equal(run.status, 0, JSON.stringify(run));
      assert.match(run.stdout, /ok 1 - option conservée/);
      assert.equal((run.stdout.match(/^1\.\.1$/gm) || []).length, 1, 'un seul flux TAP');
      assert.equal(fs.readFileSync(observed,'utf8'), options, 'NODE_OPTIONS intégralement conservé');
    }
  } finally { fs.rmSync(owned, {recursive:true,force:true}); }
});

test('NODE_OPTIONS : reporter ou destination incompatible refusé avant toute écriture ou allocation', () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const {tapReporterArgs, runEngine} = require('./run-engines.cjs');
  const owned = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-reporter-refusal-owned-')), previous = process.env.NODE_OPTIONS;
  try {
    for (const options of ['--test-reporter=spec', '--test-reporter tap --test-reporter=tap', '--test-reporter=tap --test-reporter-destination=stderr', '--test-reporter=tap --test-reporter-destination="' + path.join(owned, 'foreign.log') + '"', '--test-reporter-destination=stdout', '--test_reporter=spec', '--test-reporter=tap --test_reporter_destination=foreign.log', "--test-reporter=tap --test_reporter_destination='stdout'", '--test_reporter=tap --test-reporter-destination=std\\out', '--test_reporter=tap --test_reporter_destination=std_out', '--test-reporter=tap\t--no-warnings', '--test-reporter=tap --test-reporter-destination=stdout=extra', '--test-reporter=tap --test-reporter-destination=STDOUT', '--test-reporter=tap --test-reporter-destination="stdout "', '--test-reporter=tap --test-reporter-destination="stdout\n"']) {
      assert.throws(() => tapReporterArgs(options), /incompatible/);
      process.env.NODE_OPTIONS = options;
      assert.throws(() => runEngine('firefox', ['never.test.cjs'], owned, owned, [], 1000), /incompatible/);
      assert.deepEqual(fs.readdirSync(owned), [], 'aucun fichier ou enfant créé par le refus');
    }
  } finally {
    if(previous === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = previous;
    fs.rmSync(owned, {recursive:true,force:true});
  }
});

test('NODE_OPTIONS : scanners JS et Python suivent les espaces ASCII et échappements Node, pas ceux du shell', () => {
  const path = require('node:path'), {spawnSync} = require('node:child_process');
  const {nodeOptionsTokens} = require('./run-engines.cjs');
  const inputs = ['', '  --test_reporter=tap  --no-warnings ', '--test-reporter="t\\ap"', '--test-reporter-destination=\'stdout\'', '--test-reporter-destination=std\\out', '--test-reporter-destination="std\\out"', '--test-reporter=tap\t--no-warnings', '--test-reporter=tap\n--no-warnings', '--require="chemin avec espace" --test_reporter tap', '"" --test-reporter=tap', '--test-reporter="tap', '--test-reporter="tap\\'];
  const expected = inputs.map(value => { try { return {ok:true,tokens:nodeOptionsTokens(value)}; } catch { return {ok:false}; } });
  assert.deepEqual(expected[3].tokens, ["--test-reporter-destination='stdout'"]);
  assert.deepEqual(expected[4].tokens, ['--test-reporter-destination=std\\out']);
  assert.deepEqual(expected[5].tokens, ['--test-reporter-destination=stdout']);
  assert.deepEqual(expected[6].tokens, ['--test-reporter=tap\t--no-warnings']);
  const script = "import ast,json,sys;tree=ast.parse(open(sys.argv[1]).read());fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='node_options_tokens');ns={};exec(compile(ast.Module(body=[fn],type_ignores=[]),sys.argv[1],'exec'),ns);out=[]\nfor value in json.loads(sys.argv[2]):\n try: out.append({'ok':True,'tokens':ns['node_options_tokens'](value)})\n except SystemExit: out.append({'ok':False})\nprint(json.dumps(out))";
  const run = spawnSync('python3', ['-B','-c',script,path.join(__dirname,'audit_receipt_contract.py'),JSON.stringify(inputs)], {encoding:'utf8',timeout:5000});
  assert.equal(run.error,undefined); assert.equal(run.status,0,run.stderr);
  assert.deepEqual(JSON.parse(run.stdout),expected);
});
