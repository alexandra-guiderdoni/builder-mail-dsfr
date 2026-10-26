// Frontière DOM/horloge contrôlée : ces tests n'émulent ni layout, ni routage navigateur.
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const catalogue = JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}));

function fixture() {
  const nodes = new Map(), windows = new Map(), timers = new Map(), blobs = new Map(), revoked = [], replacements = [];
  let now = 0, serial = 0;
  class Element {
    constructor(tag = 'DIV', id = '') {
      this.tagName = tag; this.id = id; this.listeners = new Map(); this.style = {}; this.dataset = {};
      this.hidden = false; this.open = false; this.isConnected = true; this.clientWidth = 640;
      this.attributes = new Map(); this.value = ''; this.options = []; this.selectedOptions = [];
      this.contentWindow = tag === 'IFRAME' ? {postMessage() {}} : null;
    }
    addEventListener(type, fn, options) {
      const list = this.listeners.get(type) || []; list.push({fn, once: options?.once}); this.listeners.set(type, list);
    }
    removeEventListener(type, fn) { this.listeners.set(type, (this.listeners.get(type) || []).filter(x => x.fn !== fn)); }
    emit(type, data = {}) {
      for (const entry of [...(this.listeners.get(type) || [])]) {
        if (entry.once) this.removeEventListener(type, entry.fn);
        entry.fn({target: this, preventDefault() {}, ...data});
      }
    }
    setAttribute(key, value) { this.attributes.set(key, value); }
    getAttribute(key) { return this.attributes.get(key) ?? null; }
    removeAttribute(key) { this.attributes.delete(key); if (key === 'src' || key === 'srcdoc') this[key] = ''; }
    cloneNode() {
      const copy = new Element(this.tagName, this.id);
      copy.attributes = new Map(this.attributes); copy.style = {...this.style}; copy.dataset = {...this.dataset};
      copy.hidden = this.hidden; copy.className = this.className; copy.src = this.src; copy.srcdoc = this.srcdoc;
      copy.isConnected = false; return copy;
    }
    replaceWith(next) {
      if (this.id) nodes.delete(this.id);
      this.isConnected = false; this.contentWindow = null;
      next.isConnected = true; if (next.id) nodes.set(next.id, next);
      replacements.push([this, next]);
    }
    getBoundingClientRect() { return {x: 0, y: 0, width: 640, height: 570}; }
    focus() { if (this.focusError) throw this.focusError; document.activeElement = this; }
    showModal() { if (this.showError) throw this.showError; this.open = true; }
    close() { this.open = false; timers.set(++serial, () => this.emit('close')); }
    querySelectorAll() { return []; }
    querySelector() { return null; }
    contains() { return false; }
  }
  for (const [, id] of fs.readFileSync('app/source/shell.html', 'utf8').matchAll(/id="([^"]+)"/g)) nodes.set(id, new Element('DIV', id));
  for (const id of ['preview', 'catalogue-preview']) nodes.set(id, new Element('IFRAME', id));
  const document = {getElementById: id => nodes.get(id) || null, createElement: tag => new Element(tag.toUpperCase()),
    activeElement: nodes.get('check-confirm'), fonts: {ready: Promise.resolve()}, querySelectorAll: () => [],
    documentElement: {dataset: {appVersion: 'fixture'}}};
  const context = {console, document, TextEncoder, TextDecoder, URL: {createObjectURL(blob) { const id = 'blob:test/' + ++serial; blobs.set(id, blob); return id; }, revokeObjectURL(url) { revoked.push(url); blobs.delete(url); }},
    Blob, crypto: {randomUUID: () => 'token-' + ++serial}, performance: {now: () => now},
    setTimeout: fn => { const id = ++serial; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
    requestAnimationFrame: fn => { const id = ++serial; timers.set(id, fn); return id; },
    getComputedStyle: () => ({borderTopWidth: '1', borderBottomWidth: '1', height: '570px'}),
    ResizeObserver: class { constructor(fn) { this.fn = fn; } observe() {} disconnect() {} },
    matchMedia: () => ({matches: false, addEventListener() {}}),
    addEventListener(type, fn) { const list = windows.get(type) || []; list.push(fn); windows.set(type, list); },
    MailBuilder: {catalog: catalogue, previewMeasure: {hash: 'fixture', source: '/* measure */'}}};
  context.window = context;
  vm.createContext(context);
  const load = name => vm.runInContext(fs.readFileSync('app/source/' + name, 'utf8'), context, {filename: name});
  for (const name of ['model.js', 'render.js']) load(name);
  const A = context.MailBuilder, doc = A.Model.create('Initial', [19]);
  A.doc = () => doc;
  load('preview.js'); load('checks.js');
  return {A, doc, document, nodes, load, context, blobs, revoked, replacements,
    element: id => nodes.get(id), tick: amount => { now += amount; },
    message: event => { for (const fn of windows.get('message') || []) fn(event); },
    drain() { for (let i = 0; timers.size && i < 20; i++) { const batch = [...timers.values()]; timers.clear(); for (const fn of batch) fn(); } if (timers.size) throw Error('fixture timers did not settle'); }};
}
module.exports = {fixture};
