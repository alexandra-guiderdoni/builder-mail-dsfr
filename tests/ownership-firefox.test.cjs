/* Firefox réel chargé en VM : processus/FS/WebSocket/horloge inertes, aucun navigateur alloué. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {EventEmitter} = require('node:events');
const source = fs.readFileSync(process.env.FIREFOX_OWNERSHIP_SOURCE || path.join(__dirname, 'firefox-support.mjs'), 'utf8').replace(/^import .*;\n/gm, '').replace('export class Firefox', 'globalThis.Firefox = class Firefox');
function setup({profileExists = false, sessionPID, gracefulExit = false, refusesKill = false, acceptsWithoutExit = false, protocolFailure = false, preferenceFailure = false} = {}) {
  const children = [], processSignals = [], requests = [], timers = new Map(), removed = [], operations = [], profileFiles = new Map();
  let inode = 1, symlink = false, nextTimer = 0;
  function exit(child, code = 0, signal = null) { child.exitCode = code; child.signalCode = signal; child.emit('exit', code, signal); }
  class Socket {
    static OPEN = 1;
    constructor() { this.readyState = 1; queueMicrotask(() => this.onopen()); }
    send(text) {
      const request = JSON.parse(text); requests.push(request);
      const child = children.at(-1);
      if (request.method === 'session.end' && gracefulExit) exit(child);
      const result = request.method === 'session.new' ? {capabilities: {browserVersion: 'témoin', 'moz:processID': sessionPID ?? child.pid}} : request.method === 'browsingContext.create' ? {context: 'synthetic-tab'} : {};
      queueMicrotask(() => this.onmessage({data: JSON.stringify(request.method === 'session.end' && protocolFailure ? {id: request.id, type: 'error', error: 'synthetic', message: 'session.end refusé'} : {id: request.id, type: 'success', result})}));
    }
    close() { this.readyState = 3; }
  }
  const scope = {console, path, WebSocket: Socket, queueMicrotask,
    fs: {
      async mkdir(directory, options) { if (!directory.endsWith('/profile')) return; if (profileExists && !options?.recursive) throw Object.assign(new Error('profil préexistant'), {code: 'EEXIST'}); profileExists = true; },
      async lstat() { return {dev: 1, ino: inode, isDirectory: () => !symlink, isSymbolicLink: () => symlink}; },
      async writeFile(filename, content, options) {
        operations.push({operation: 'writeFile', filename, content, flag: options?.flag});
        if (preferenceFailure) throw new Error('écriture préférences refusée');
        if (options?.flag === 'wx' && profileFiles.has(filename)) throw new Error('fichier préexistant');
        profileFiles.set(filename, content);
      },
      async rm(filename) { removed.push(filename); },
      async stat() { return {mtimeMs: Date.now() + 1}; },
      async readFile() { return JSON.stringify({ws_host: '127.0.0.1', ws_port: 0}); }
    },
    spawn(binary, args) {
      operations.push({operation: 'spawn', preferences: profileFiles.get('/owned/profile/user.js')});
      const child = Object.assign(new EventEmitter(), {pid: 100 + children.length, exitCode: null, signalCode: null, args, binary, signals: [], unref() {},
        kill(signal) { this.signals.push(signal); if (refusesKill) return false; if (acceptsWithoutExit) return true; exit(this, null, signal); return true; }});
      children.push(child); return child;
    },
    process: {env: {}, kill(pid, signal) { processSignals.push({pid, signal}); if (signal === 0) throw Object.assign(new Error('absent'), {code: 'ESRCH'}); const child = children.find(c => c.pid === pid); if (child) exit(child, null, signal); }},
    setTimeout(fn, ms) { const timer = {id: ++nextTimer, fn, ms}; timers.set(timer.id, timer); if (ms === 5000) queueMicrotask(() => { if (timers.delete(timer.id)) fn(); }); return timer; },
    clearTimeout(timer) { timers.delete(timer.id); }
  };
  vm.runInNewContext(source, scope, {filename: 'tests/firefox-support.mjs'});
  return {Firefox: scope.Firefox, children, processSignals, requests, removed, timers, operations, profileFiles, replaceProfile() { inode++; }, symlinkProfile() { symlink = true; }};
}

test('Firefox ownership : profil préexistant refusé avant toute allocation', async () => {
  const h = setup({profileExists: true}), firefox = new h.Firefox('/owned');
  await assert.rejects(firefox.start(), /préexistant|EEXIST/);
  assert.equal(h.children.length, 0); assert.equal(h.requests.length, 0); assert.equal(h.operations.length, 0);
  const receipt = await firefox.stop(); assert.equal(receipt.cleanup_error, null);
  assert.equal(h.processSignals.length, 0);
});
for (const headless of [true, false]) test(`Firefox ownership : nouvelle instance isolée, mode ${headless ? 'headless' : 'visible'} explicite`, async () => {
  const h = setup(), firefox = new h.Firefox('/owned', {headless}); await firefox.start();
  assert(h.children[0].args.includes('--no-remote')); assert(h.children[0].args.includes('--new-instance'));
  assert.equal(h.children[0].args.includes('--headless'), headless);
  assert.equal(firefox.allocation.mode, headless ? 'headless' : 'visible');
  assert.equal(firefox.allocation.status, 'owned-session');
  assert.deepEqual(h.removed, ['/owned/profile/WebDriverBiDiServer.json']);
  const receipt = await firefox.stop(); assert.equal(receipt.cleanup_error, null); assert.equal(receipt.exit_observed, true);
  assert.deepEqual(h.processSignals, []); assert.deepEqual(h.children[0].signals, ['SIGTERM']);
});

test('Firefox ownership : session.end terminé interdit tout signal au PID potentiellement recyclé', async () => {
  const h = setup({gracefulExit: true}), firefox = new h.Firefox('/owned'); await firefox.start();
  const receipt = await firefox.stop();
  assert.equal(receipt.cleanup_error, null); assert.equal(receipt.exit_observed, true); assert.equal(receipt.session_end, 'acknowledged');
  assert.deepEqual(h.children[0].signals, []); assert.deepEqual(h.processSignals, []);
});

test('Firefox ownership : PID de session différent refusé sans session.end ni signal de ce PID', async () => {
  const h = setup({sessionPID: 9999}), firefox = new h.Firefox('/owned'); let primary;
  try { await firefox.start(); } catch (cause) { primary = cause; }
  const receipt = await firefox.stop();
  assert.match(primary?.message || '', /Identité du processus/);
  assert(receipt.cleanup_error); assert.equal(receipt.primary_error, primary.message);
  assert.equal(h.requests.some(x => x.method === 'session.end'), false);
  assert.deepEqual(h.processSignals, []); assert.deepEqual(h.children[0].signals, ['SIGTERM']);
  await assert.rejects(firefox.start(), /Fermeture précédente non observée/);
});

test('Firefox ownership : stop sans lancement ne signale jamais une propriété PID ou launch injectée', async () => {
  const h = setup(), firefox = new h.Firefox('/owned'); let foreignSignals = 0;
  firefox.pid = 9999; firefox.launch = {kill() { foreignSignals++; }}; firefox.ws = {readyState: 0, close() { foreignSignals++; }};
  const receipt = await firefox.stop();
  assert.equal(receipt.cleanup_error, null); assert.equal(receipt.status, 'not-started');
  assert.equal(foreignSignals, 0); assert.deepEqual(h.processSignals, []);
});

test('Firefox ownership : seul le ChildProcess capturé est fermé, même si les propriétés publiques changent', async () => {
  const h = setup(), firefox = new h.Firefox('/owned'); await firefox.start(); let foreignSignals = 0;
  firefox.pid = 9999; firefox.launch = {kill() { foreignSignals++; }}; firefox.ws = {readyState: 0, close() { foreignSignals++; }};
  const receipt = await firefox.stop();
  assert.equal(receipt.cleanup_error, null); assert.equal(foreignSignals, 0);
  assert.deepEqual(h.children[0].signals, ['SIGTERM']); assert.deepEqual(h.processSignals, []);
});

test('Firefox ownership : fermeture non observée et erreur primaire séparées, sans relance', async () => {
  const h = setup({refusesKill: true}), firefox = new h.Firefox('/owned'); await firefox.start();
  firefox.start_error = new Error('erreur primaire témoin');
  const receipt = await firefox.stop();
  assert(receipt.cleanup_error); assert.equal(receipt.exit_observed, false); assert.equal(receipt.primary_error, 'erreur primaire témoin');
  assert.equal(receipt.status, 'error'); assert.equal(firefox.cleanup_error, receipt.cleanup_error);
  firefox.cleanup = {cleanup_error: null}; firefox.cleanup_error = null; // Un reçu mutable n’est pas l’autorité de relance.
  await assert.rejects(firefox.start(), /Fermeture précédente non observée/);
  assert.equal(h.children.length, 1); assert.deepEqual(h.processSignals, []);
});

test('Firefox ownership : stop concurrent et répété est idempotent', async () => {
  const h = setup(), firefox = new h.Firefox('/owned'); await firefox.start();
  const [first, second] = await Promise.all([firefox.stop(), firefox.stop()]);
  assert.equal(first, second); assert.equal(await firefox.stop(), first);
  assert.equal(h.requests.filter(x => x.method === 'session.end').length, 1);
  assert.deepEqual(h.children[0].signals, ['SIGTERM']); assert.deepEqual(h.processSignals, []);
});

test('Firefox ownership : même instance réutilise seulement son profil inchangé après fermeture observée', async () => {
  const h = setup(), firefox = new h.Firefox('/owned'); await firefox.start(); await firefox.stop();
  await firefox.start(); assert.equal(h.children.length, 2); assert.equal(firefox.allocation.session_pid, h.children[1].pid);
  await firefox.stop(); h.replaceProfile();
  await assert.rejects(firefox.start(), /Identité du profil/);
  assert.equal(h.children.length, 2); assert.deepEqual(h.processSignals, []);
});

test('Firefox ownership : profil devenu lien symbolique refusé avant une nouvelle instance', async () => {
  const h = setup(), firefox = new h.Firefox('/owned'); await firefox.start(); await firefox.stop(); h.symlinkProfile();
  await assert.rejects(firefox.start(), /Identité du profil/); assert.equal(h.children.length, 1);
});

test('Firefox ownership : session.end refusé reste dans le reçu, fermeture enfant contrôlée observée', async () => {
  const h = setup({protocolFailure: true}), firefox = new h.Firefox('/owned'); await firefox.start();
  const receipt = await firefox.stop();
  assert.equal(receipt.session_end, 'error'); assert.match(receipt.session_end_error, /session.end refusé/);
  assert.equal(receipt.exit_observed, true); assert.equal(receipt.cleanup_error, null);
  assert.deepEqual(h.processSignals, []);
});

test('Firefox ownership : démarrages concurrents refusés sans remplacer le processus possédé', async () => {
  const h = setup(), firefox = new h.Firefox('/owned');
  const first = firefox.start();
  await assert.rejects(firefox.start(), /Démarrage de recette encore en cours/);
  await first; assert.equal(h.children.length, 1);
  const receipt = await firefox.stop(); assert.equal(receipt.cleanup_error, null);
});

test('Firefox ownership : stop pendant la préparation interdit toute allocation ultérieure', async () => {
  const h = setup(), firefox = new h.Firefox('/owned');
  const started = assert.rejects(firefox.start(), /Démarrage de recette interrompu/);
  const receipt = await firefox.stop(); await started;
  assert(receipt.cleanup_error); assert.equal(h.children.length, 0);
  await assert.rejects(firefox.start(), /Fermeture précédente non observée/);
  assert.deepEqual(h.processSignals, []);
});


test('Firefox ownership : signal accepté ne vaut pas sortie observée', async () => {
  const h = setup({acceptsWithoutExit: true}), firefox = new h.Firefox('/owned'); await firefox.start();
  const receipt = await firefox.stop();
  assert.equal(receipt.signalled, true); assert.equal(receipt.exit_observed, false);
  assert(receipt.cleanup_error.some(x => x.stage === 'child-exit'));
  await assert.rejects(firefox.start(), /Fermeture précédente non observée/);
  assert.deepEqual(h.processSignals, []); assert.deepEqual(h.children[0].signals, ['SIGTERM']);
});

for (const failure of ['receipt', 'missing', 'throw']) test(`Recette Firefox : nettoyage ${failure} reste distinct de l’erreur primaire`, async () => {
  const recipe = fs.readFileSync(path.join(__dirname, '../scripts/recipe_firefox.mjs'), 'utf8');
  const start = recipe.indexOf('const cleanupReceipt = '), end = recipe.indexOf('const saved = ', start);
  assert(start >= 0 && end > start);
  const final = /await cleanupReceipt\(\); if \(report\.cleanup_error\) report\.verdict = 'ECHEC_NETTOYAGE';/.exec(recipe);
  assert(final, 'la finalisation consomme explicitement le reçu');
  const report = {verdict: 'ECHEC', failure: 'erreur primaire conservée'}, process = {};
  const firefox = {async stop() { if (failure === 'throw') throw new Error('nettoyage refusé'); return failure === 'missing' ? undefined : {status: 'error', cleanup_error: [{stage: 'child-exit', message: 'sortie inconnue'}]}; }};
  const scope = {report, process, firefox};
  vm.runInNewContext(recipe.slice(start, end) + ';globalThis.finish = async () => {' + final[0] + '}; globalThis.stopped = stopped;', scope);
  await scope.finish();
  assert.equal(report.failure, 'erreur primaire conservée'); assert.equal(report.verdict, 'ECHEC_NETTOYAGE');
  assert(report.cleanup_error); assert.equal(process.exitCode, 1); assert.equal(report.cleanup_receipts.length, 1);
  await assert.rejects(scope.stopped(), /Fermeture Firefox non prouvée/);
});


test('Firefox bootstrap : préférence locale créée exclusivement avant le premier spawn', async () => {
  const h = setup(), firefox = new h.Firefox('/owned', {headless: false});
  await firefox.start();
  assert.equal(h.operations.length, 2);
  const [write, spawned] = h.operations;
  assert.equal(write.operation, 'writeFile');
  assert.equal(write.filename, '/owned/profile/user.js');
  assert.equal(write.flag, 'wx');
  assert.equal(write.content, 'user_pref("browser.shell.checkDefaultBrowser", false);\n');
  assert.equal(spawned.operation, 'spawn'); assert.equal(spawned.preferences, write.content);
  assert.equal((await firefox.stop()).cleanup_error, null);
});

test('Firefox bootstrap : redémarrage conserve les préférences ajoutées par la recette', async () => {
  const h = setup(), firefox = new h.Firefox('/owned');
  await firefox.start(); await firefox.stop();
  const filename = '/owned/profile/user.js';
  const preferences = h.profileFiles.get(filename) + 'user_pref("browser.zoom.full", true);\n';
  h.profileFiles.set(filename, preferences);
  await firefox.start();
  assert.equal(h.operations.filter(item => item.operation === 'writeFile').length, 1);
  assert.equal(h.profileFiles.get(filename), preferences);
  assert.equal(h.operations.at(-1).preferences, preferences);
  assert.equal((await firefox.stop()).cleanup_error, null);
});

test('Firefox bootstrap : échec écriture interdit spawn et réutilisation du profil partiel', async () => {
  const h = setup({preferenceFailure: true}), firefox = new h.Firefox('/owned');
  await assert.rejects(firefox.start(), /écriture préférences refusée/);
  assert.equal(h.children.length, 0); assert.equal((await firefox.stop()).cleanup_error, null);
  await assert.rejects(firefox.start(), /préexistant/);
  assert.equal(h.children.length, 0);
});
