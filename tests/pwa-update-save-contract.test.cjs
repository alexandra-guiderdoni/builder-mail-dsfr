const test = require('node:test');
const vm = require('node:vm');
const native = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => native.readFileSync(path.join(root, 'app/source', name), 'utf8');
const SAVE_THEN_FLUSH = 'await A.State.save(); await A.State.flush(); ';
const MUTANTS = {
  'save() et flush() supprimés': source => source.replace(SAVE_THEN_FLUSH, ''),
  'save() seul supprimé': source => source.replace('await A.State.save(); ', ''),
  'flush() seul supprimé': source => source.replace('await A.State.flush(); ', '')
};
const ticks = async (count = 20) => { for (let i = 0; i < count; i++) await new Promise(resolve => setImmediate(resolve)); };
// Charge le vrai state.js et le pwa.js testé dans un même contexte, avec un service worker simulé qui garde une version en attente.
async function scenario({pwa = read('pwa.js'), storage = {}, loadFails = false, fakeState = null, prepare = null} = {}) {
  const log = {posted: [], reloads: 0, calls: [], errors: []}, elements = {}, listeners = {}, worker = {listeners: {}};
  const element = id => elements[id] ||= {id, hidden: true, textContent: '', disabled: false, addEventListener(type, action) { this[type] = action; }};
  const registration = {waiting: {postMessage: message => { log.posted.push(message.type); log.calls.push('post'); }}, addEventListener() {}};
  const scope = {
    document: {querySelector: () => ({}), getElementById: element},
    location: {protocol: 'https:', reload: () => { log.reloads++; }},
    navigator: {serviceWorker: {addEventListener: (type, action) => { worker[type] = action; }, register: async () => registration, ready: Promise.resolve({active: {}})}},
    addEventListener: (type, action) => { listeners[type] = action; },
    // Depuis #65, state.js temporise l’annonce de succès : le contexte isolé reçoit les minuteries de Node.
    setTimeout, clearTimeout
  };
  scope.window = scope;
  scope.MailBuilder = {
    Model: {initial: () => ({activeId: 'd', documents: [{id: 'd', blocks: [{id: 'b'}]}]}), copy: value => structuredClone(value), library: value => value, versions: value => value},
    UI: {refresh() {}, preview() {}},
    Storage: {load: async () => { if (loadFails) throw new Error('Lecture impossible.'); return null; }, save: async () => ({token: 't'}), ...storage}
  };
  vm.createContext(scope);
  vm.runInContext(read('state.js'), scope);
  const A = scope.MailBuilder;
  A.error = message => { log.errors.push(message); }; A.notice = () => {};
  await A.State.start();
  if (fakeState) A.State = {...fakeState(log)};
  if (prepare) prepare(A, log);
  vm.runInContext(pwa, scope);
  await ticks();
  assert.equal(elements.update.hidden, false, 'une version en attente doit proposer la mise à jour');
  return {A, log, worker, click: async () => { await elements.update.click(); await ticks(); }};
}
const edit = A => A.State.change(library => { library.activeId = 'd'; });
test('référence : sauvegarde, vérification, puis activation dans cet ordre', async () => {
  const run = await scenario({fakeState: log => ({save: async () => { log.calls.push('save'); }, flush: async () => { log.calls.push('flush'); }})});
  await run.click();
  assert.deepEqual(run.log.calls, ['save', 'flush', 'post']); assert.deepEqual(run.log.posted, ['ACTIVATE_UPDATE']);
  run.worker.controllerchange(); assert.equal(run.log.reloads, 1, 'le rechargement suit l’activation demandée');
});
test('sauvegarde en attente : rien ne s’active avant la fin de l’écriture', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; }); let writes = 0;
  const run = await scenario({storage: {save: async () => { writes++; await gate; return {token: 't'}; }}});
  edit(run.A); await ticks(); assert.equal(writes, 1);
  const clicking = run.click(); await ticks();
  assert.deepEqual(run.log.posted, [], 'aucune activation tant que l’écriture n’est pas terminée');
  release(); await clicking; await ticks();
  assert.deepEqual(run.log.posted, ['ACTIVATE_UPDATE']);
});
test('sauvegarde refusée : aucune activation, erreur affichée, aucun rechargement', async () => {
  const run = await scenario({storage: {save: async () => { throw new Error('Quota dépassé.'); }}});
  edit(run.A); await ticks(); run.log.errors.length = 0;
  await run.click();
  assert.deepEqual(run.log.posted, []); assert(run.log.errors.some(message => /sauvegarde doit réussir|Quota/.test(message)), run.log.errors.join('|'));
  run.worker.controllerchange(); assert.equal(run.log.reloads, 0);
});
test('flush() en échec après une sauvegarde réussie : aucune activation', async () => {
  const run = await scenario({fakeState: log => ({save: async () => { log.calls.push('save'); }, flush: async () => { log.calls.push('flush'); throw new Error('La sauvegarde doit réussir avant de recharger l’application.'); }})});
  await run.click();
  assert.deepEqual(run.log.calls, ['save', 'flush']); assert.deepEqual(run.log.posted, []); assert.equal(run.log.errors.length, 1);
  run.worker.controllerchange(); assert.equal(run.log.reloads, 0);
});
test('mode récupération : save() ne signale rien mais flush() bloque l’activation', async () => {
  const run = await scenario({loadFails: true});
  assert.equal(run.A.recoveryOnly, true);
  await run.click();
  assert.deepEqual(run.log.posted, []); assert(run.log.errors.some(message => /sauvegarde doit réussir/.test(message)), run.log.errors.join('|'));
  run.worker.controllerchange(); assert.equal(run.log.reloads, 0);
});
for (const [name, mutate] of Object.entries(MUTANTS)) test(`mutant « ${name} » : détecté par au moins un scénario`, async () => {
  const original = read('pwa.js'), mutant = mutate(original);
  assert.notEqual(mutant, original, 'le mutant doit modifier la source');
  const killed = [];
  { // sauvegarde en attente
    let release; const gate = new Promise(resolve => { release = resolve; });
    const run = await scenario({pwa: mutant, storage: {save: async () => { await gate; return {token: 't'}; }}});
    edit(run.A); await ticks(); const clicking = run.click(); await ticks();
    if (run.log.posted.length) killed.push('en attente'); release(); await clicking;
  }
  { // sauvegarde refusée
    const run = await scenario({pwa: mutant, storage: {save: async () => { throw new Error('Quota dépassé.'); }}});
    edit(run.A); await ticks(); await run.click(); if (run.log.posted.length) killed.push('refusée');
  }
  { // mode récupération
    const run = await scenario({pwa: mutant, loadFails: true}); await run.click(); if (run.log.posted.length) killed.push('récupération');
  }
  { // flush en échec, ordre des appels
    const run = await scenario({pwa: mutant, fakeState: log => ({save: async () => { log.calls.push('save'); }, flush: async () => { log.calls.push('flush'); throw new Error('x'); }})});
    await run.click(); if (run.log.posted.length || run.log.calls.join() !== 'save,flush') killed.push('flush en échec');
  }
  assert(killed.length > 0, `mutant « ${name} » survivant`);
});
