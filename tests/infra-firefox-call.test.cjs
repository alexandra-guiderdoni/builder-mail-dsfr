/* Classe Firefox réelle ; FS, lancement, WebSocket et horloge sont inertes, sans navigateur. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {EventEmitter} = require('node:events');
const source = fs.readFileSync(path.join(__dirname, 'firefox-support.mjs'), 'utf8').replace(/^import .*;\n/gm, '').replace('export class Firefox', 'globalThis.Firefox = class Firefox');
async function setup() {
  const timers = new Map(); let next = 0, sendError, delayed = false, closed = false, kills = 0;
  class Socket {
    static OPEN = 1;
    constructor() { this.readyState = 1; queueMicrotask(() => this.onopen()); }
    send(text) {
      if (sendError) throw sendError;
      const request = JSON.parse(text);
      if (!delayed) queueMicrotask(() => this.onmessage({data: JSON.stringify({id: request.id, type: 'success', result: request.method === 'session.new' ? {capabilities: {browserVersion: 'témoin', 'moz:processID': 117}} : request.method === 'browsingContext.create' ? {context: 'synthetic-tab'} : {ok: true}})}));
    }
    close() { closed = true; this.readyState = 3; }
  }
  const scope = {path, fs: {mkdir: async () => {}, writeFile: async () => {}, lstat: async () => ({dev: 1, ino: 1, isDirectory: () => true, isSymbolicLink: () => false}), rm: async () => {}, stat: async () => ({mtimeMs: Date.now() + 1}), readFile: async () => JSON.stringify({ws_host: '127.0.0.1', ws_port: 0})},
    spawn: () => Object.assign(new EventEmitter(), {pid: 117, exitCode: null, signalCode: null, unref() {}, kill() { kills++; this.signalCode = 'SIGTERM'; this.emit('exit', null, 'SIGTERM'); return true; }}), WebSocket: Socket, queueMicrotask,
    setTimeout(fn, ms) { const timer = {id: ++next, fn, ms}; timers.set(timer.id, timer); return timer; },
    clearTimeout(timer) { timers.delete(timer.id); }, process: {env: {}}, console};
  vm.runInNewContext(source, scope, {filename: 'tests/firefox-support.mjs'});
  const firefox = new scope.Firefox('/synthetic-profile'); await firefox.start();
  return {firefox, timers, fail(error) { sendError = error; }, delay() { delayed = true; }, closed: () => closed, kills: () => kills};
}
for (const mode of ['send', 'serialization']) test(`BiDi ${mode} : rejet synchrone sans attente ni timer abandonnés`, async () => {
  const h = await setup();
  const params = mode === 'serialization' ? (() => { const x = {}; x.circular = x; return x; })() : {};
  if (mode === 'send') h.fail(new Error('send refusé'));
  await assert.rejects(h.firefox.call('synthetic.failure', params), mode === 'send' ? /send refusé/ : /circular/i);
  assert.equal(h.firefox.pending.size, 0); assert.equal(h.timers.size, 0);
});
test('BiDi : réponse normale règle et libère la bonne attente', async () => {
  const h = await setup(); const result = await h.firefox.call('synthetic.success', {});
  assert.equal(result.ok, true); assert.equal(h.firefox.pending.size, 0); assert.equal(h.timers.size, 0);
});
test('BiDi : expiration conserve le rejet attendu et libère son attente', async () => {
  const h = await setup(); h.delay();
  const result = assert.rejects(h.firefox.call('synthetic.timeout', {}), /Délai BiDi dépassé/);
  const [timer] = h.timers.values(); assert.equal(timer.ms, 30000);
  h.timers.delete(timer.id); timer.fn(); await result;
  assert.equal(h.firefox.pending.size, 0); assert.equal(h.timers.size, 0);
});
test('BiDi : stop règle les attentes une fois et libère leurs timers', async () => {
  const h = await setup(); h.delay();
  const result = assert.rejects(h.firefox.call('synthetic.pending', {}), /Session de recette fermée/);
  h.firefox.ws.readyState = 0;
  await h.firefox.stop(); await result;
  assert.equal(h.firefox.pending.size, 0); assert.equal(h.timers.size, 0);
  assert.equal(h.closed(), true); assert.equal(h.kills(), 1, 'lancement synthétique seulement');
});
