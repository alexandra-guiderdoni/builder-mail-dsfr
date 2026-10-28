const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {webcrypto} = require('node:crypto');
const catalog = JSON.parse(execFileSync('python3', ['-B', '-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}));
const DRAFT = 'https://adresse inachevee.invalid';

// Vrai Model/State, frontières DOM/stockage remplacées ; aucune preuve navigateur native.
async function setup({failSave = false, resetOnce = false} = {}) {
  const nodes = new Map(), events = {};
  const element = id => {
    if (!nodes.has(id)) nodes.set(id, {id, textContent: '', hidden: false, disabled: false, dataset: {},
      contains: () => false, focus() {}, querySelector: sel => element(id + sel)});
    return nodes.get(id);
  };
  let notify, reloads = 0, writes = 0;
  const scope = {URL, atob, btoa, crypto: webcrypto, setTimeout: () => 1, clearTimeout() {},
    document: {getElementById: element, activeElement: element('body')},
    location: {reload() { reloads++; }}, addEventListener(type, fn) { events[type] = fn; },
    BroadcastChannel: class { addEventListener(type, fn) { notify = fn; } postMessage() {} }};
  scope.window = scope; scope.MailBuilder = {catalog};
  const context = vm.createContext(scope);
  const load = file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
  load('app/source/model.js');
  const A = scope.MailBuilder;
  let record = {token: 'token-initial', app: 'version-temoin', library: A.Model.initial()};
  A.UI = {refresh() {}, clearFieldErrors() {}};
  A.Storage = {version: record.app, load: async () => record, save: async (library, token) => {
    if (failSave) throw new Error('refus de stockage témoin');
    if (resetOnce) { resetOnce = false; throw Object.assign(new Error('La bibliothèque enregistrée a disparu du stockage.'), {storage: 'réinitialisé'}); }
    assert.equal(token, record?.token ?? null); writes++;
    return record = {token: 'token-suivant', app: 'version-temoin', library: A.Model.copy(library)};
  }};
  load('app/source/state.js'); await A.State.start();
  return {A, element, lock: () => notify({data: {type: 'takeover', token: 'token-autre'}}),
    reloads: () => reloads, writes: () => writes, record: () => record, clearRecord() { record = undefined; },
    unload() { const e = {prevented: false, preventDefault() { this.prevented = true; }}; events.beforeunload(e); return e.prevented; }};
}
function addDraft(A) {
  const block = A.doc().blocks.find(b => A.Model.component(b.component).fields.some(f => f.type === 'url'));
  const field = A.Model.component(block.component).fields.find(f => f.type === 'url');
  A.selected = block.id;
  A.State.setDraft(A.doc().id, block.id, 'field-' + field.key, DRAFT, A.Model.checkUrl(DRAFT));
  return [...A.drafts.values()][0];
}

test('reload : le garde natif protège encore le brouillon même après export du modèle', async () => {
  const h = await setup(); addDraft(h.A); h.A.State.outdated(); h.A.State.exported();
  assert.equal(h.unload(), true);
  h.A.State.reload();
  assert.equal(h.reloads(), 1, 'demande de rechargement soumise au navigateur');
  assert.equal(h.unload(), true, 'beforeunload reste actif pour une décision native explicite');
  assert.equal(h.A.drafts.size, 1);
});

test('reload propre : aucun avertissement de brouillon inventé', async () => {
  const h = await setup(); h.A.State.reload();
  assert.equal(h.reloads(), 1); assert.equal(h.unload(), false);
});

test('reprise : le brouillon suit une copie de composition sans entrer dans le modèle sauvegardé', async () => {
  const h = await setup(), old = addDraft(h.A); h.lock();
  await h.A.State.takeOver();
  assert.equal(h.writes(), 1); assert.equal(h.A.drafts.size, 1);
  const draft = [...h.A.drafts.values()][0];
  assert.notEqual(h.A.doc().id, old.doc, 'copie nécessaire même si seul le brouillon a changé');
  assert.equal(draft.doc, h.A.doc().id); assert.equal(draft.value, DRAFT);
  assert(h.A.doc().blocks.some(b => b.id === draft.block));
  assert.notEqual(draft.block, old.block); assert.equal(draft.input, old.input);
  assert.equal(h.A.selected, draft.block, 'le bloc sélectionné suit la copie');
  assert.equal(JSON.stringify(h.record().library).includes(DRAFT), false);
  assert.match(h.element('save-state').textContent, /champs invalides restent non enregistrés/);
  assert.throws(() => h.A.State.guard(), /Corrigez ce lien/);
  h.A.State.dropDraft(draft.doc, draft.block, draft.input);
  assert.doesNotThrow(() => h.A.State.guard());
});

test('reprise : un bloc supprimé ailleurs demeure dans la copie portant le brouillon', async () => {
  const h = await setup(), old = addDraft(h.A); h.lock();
  const remote = h.record().library.documents.find(d => d.id === old.doc);
  remote.blocks = remote.blocks.filter(b => b.id !== old.block);
  await h.A.State.takeOver();
  const draft = [...h.A.drafts.values()][0]; assert(draft);
  assert.equal(draft.doc, h.A.doc().id); assert(h.A.doc().blocks.some(b => b.id === draft.block));
  assert.equal(h.A.library.documents.find(d => d.id === old.doc).blocks.some(b => b.id === old.block), false);
});

test('reprise refusée : brouillon et identifiants initiaux conservés', async () => {
  const h = await setup({failSave: true}), old = addDraft(h.A); h.lock();
  await assert.rejects(h.A.State.takeOver(), /refus de stockage témoin/);
  const draft = [...h.A.drafts.values()][0];
  assert.equal(h.writes(), 0); assert.equal(draft.doc, old.doc); assert.equal(draft.block, old.block);
  assert.equal(draft.value, DRAFT); assert.equal(h.unload(), true);
});

test('reprise sans travail divergent : aucune copie superflue', async () => {
  const h = await setup(), id = h.A.doc().id, count = h.A.library.documents.length; h.lock();
  await h.A.State.takeOver();
  assert.equal(h.A.doc().id, id); assert.equal(h.A.library.documents.length, count);
  assert.equal(h.A.drafts.size, 0); assert.match(h.element('notice').textContent, /rien n’avait changé/);
});

// #166 et #169 : retours cohérents lors de la perte de propriété.
test('stockage disparu : bandeau dédié puis reprise qui réenregistre la mémoire', async () => {
  const h = await setup({resetOnce: true}); h.clearRecord();
  await h.A.State.change(lib => { lib.documents[0].name = 'Travail en mémoire'; });
  assert.equal(h.element('editing').disabled, true);
  assert.match(h.element('read-only-message').textContent, /stockage/);
  assert.doesNotMatch(h.element('read-only-message').textContent, /autre fenêtre|en copies/);
  assert.throws(() => h.A.State.save(), /stockage/);
  await h.A.State.takeOver();
  assert.equal(h.element('read-only').hidden, true);
  assert.equal(h.record().library.documents[0].name, 'Travail en mémoire');
  assert.match(h.element('notice').textContent, /enregistrée de nouveau/);
  assert.doesNotMatch(h.element('notice').textContent, /rien n’avait changé/);
});

test('verrouillage : ancienne notice retirée et ancienne fin différée refusée', async () => {
  const h = await setup(); h.A.notice('Main reprise auparavant');
  const ticket = h.A.State.noticeTicket(); h.lock();
  assert.equal(h.element('notice').textContent, '');
  h.A.notice('Ancien succès différé', ticket);
  assert.equal(h.element('notice').textContent, '');
  assert.equal(h.element('read-only').hidden, false);
});

for (const kind of ['takeover', 'version']) test(`pending-save : le verrou ${kind} reste prioritaire après résolution tardive`, async () => {
  const h = await setup(), real = h.A.Storage.save; let release, started;
  const beginning = new Promise(resolve => { started = resolve; });
  h.A.Storage.save = (...args) => new Promise((resolve, reject) => { release = () => real(...args).then(resolve, reject); started(); });
  const saving = h.A.State.change(lib => { lib.documents[0].name = 'Modification en cours'; });
  await beginning;
  if (kind === 'version') h.A.State.outdated(); else h.lock();
  const locked = h.element('save-state').textContent, spoken = h.element('save-announce').textContent, error = h.element('error').textContent;
  release(); await saving;
  assert.equal(h.element('editing').disabled, true);
  assert.equal(h.element('save-state').textContent, locked, 'la fin ancienne ne réintroduit aucun succès contradictoire');
  assert.equal(h.element('save-announce').textContent, spoken);
  assert.equal(h.element('error').textContent, error, 'la cause courante reste affichée');
});


for (const [kind, removed, positions] of [['first', 0, [0, 1]], ['middle', 1, [0, 1, 2]], ['last', 1, [0, 1]]]) {
  test(`footer drafts : retrait ${kind}, précédents conservés et suivants recalés sans contaminer le modèle`, async () => {
    const h = await setup(), A = h.A, doc = A.doc().id, block = A.doc().blocks[0].id;
    // Le cas middle teste le contrat d'indexation avec trois positions synthétiques ; l'UI en autorise deux.
    for (const i of positions) A.State.setDraft(doc, block, 'field-footer-url-' + i, DRAFT + '/' + i, 'URL invalide ' + i);
    A.State.setDraft(doc, block, 'article-source', DRAFT + '/source', 'Autre champ');
    A.State.setDraft(doc, block + '-autre', 'field-footer-url-0', DRAFT + '/bloc', 'Autre bloc');
    A.State.setDraft(doc + '-autre', block, 'field-footer-url-0', DRAFT + '/composition', 'Autre composition');
    const before = [...A.drafts.values()].map(d => ({...d}));
    const model = JSON.stringify(A.library), stored = JSON.stringify(h.record().library);
    A.State.dropFooterDraft(doc, block, removed);
    const expected = before.filter(d => !(d.doc === doc && d.block === block && d.input === 'field-footer-url-' + removed)).map(d => {
      if (d.doc !== doc || d.block !== block || !d.input.startsWith('field-footer-url-')) return d;
      const index = Number(d.input.slice('field-footer-url-'.length));
      return index > removed ? {...d, input: 'field-footer-url-' + (index - 1)} : d;
    });
    const normalize = values => values.map(d => JSON.stringify(d)).sort();
    assert.equal(JSON.stringify(normalize([...A.drafts.values()])), JSON.stringify(normalize(expected)));
    for (const d of A.drafts.values()) assert(A.drafts.has(`${d.doc}|${d.block}|${d.input}`), 'clé cohérente après remappage');
    assert.equal(JSON.stringify(A.library), model); assert.equal(JSON.stringify(h.record().library), stored);
    assert(!JSON.stringify(A.Model.library(A.library)).includes(DRAFT), 'la sérialisation JSON du modèle valide ne contient aucun brouillon');
    assert.throws(() => A.State.guard(), /Corrigez ce lien/);
    assert.equal(h.unload(), true, 'les survivants restent protégés contre un abandon');
  });
}
