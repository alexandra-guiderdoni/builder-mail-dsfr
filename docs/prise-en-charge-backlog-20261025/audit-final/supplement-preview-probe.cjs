// Independent deterministic probe: exact preview source, simulated browser boundaries.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const source = fs.readFileSync('app/source/preview.js', 'utf8');
const listeners = {}, created = [], revoked = [], live = new Set(), assignments = [], requests = [];
let serial = 0, loading = null, current = '', resize;
const contentWindow = {postMessage: data => requests.push(data)};
const frame = {
  contentWindow, clientWidth: 620, style: {height: '500px'},
  addEventListener: (type, callback) => { listeners[type] = callback; },
  getBoundingClientRect: () => ({height: Number.parseFloat(frame.style.height)}),
  set src(value) {
    assert.equal(loading, null, 'Never assign src while another navigation is unfinished');
    current = value; loading = value.split('#')[0]; assignments.push(value);
  },
  get src() { return current; }
};
const A = {previewMeasure: {hash: 'hash', source: 'measure();'}, Render: {html(value) {
  if (value === null) throw new Error('Invalid model');
  return `<meta content="default-src &#39;none&#39;;"><title>${value}</title><body>${value}</body>`;
}}};
const context = {
  window: {MailBuilder: A}, document: {getElementById: () => frame},
  crypto: {randomUUID: () => 'token-' + (++serial)}, Blob,
  URL: {
    createObjectURL(blob) { const url = 'blob:probe-' + created.length; created.push({url, blob}); live.add(url); return url; },
    revokeObjectURL(url) { assert.notEqual(url, loading, 'Never revoke the document currently loading'); assert(live.has(url)); live.delete(url); revoked.push(url); }
  },
  addEventListener: (type, callback) => { listeners[type] = callback; },
  getComputedStyle: () => ({borderTopWidth: '1', borderBottomWidth: '1'}),
  ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} }
};
vm.runInNewContext(source, context, {filename: 'app/source/preview.js'});
const show = A.Preview.show;
const load = () => { assert(loading); loading = null; listeners.load(); };
const send = (token, overrides = {}) => listeners.message({source: contentWindow, origin: 'null', data: {type: 'mail-preview-size', token, height: 200, width: 620}, ...overrides});
const unchanged = action => { const before = frame.style.height; action(); assert.equal(frame.style.height, before); };
(async () => {
  show('first');
  for (let n = 1; n <= 39; n++) show('burst-' + n);
  assert.throws(() => show(null)); assert.equal(created.length, 1);
  unchanged(() => send('token-1')); unchanged(() => send('token-40'));
  load(); assert.equal(created.length, 2); assert.match(frame.src, /#token-40$/);
  assert.match(await created[1].blob.text(), /burst-39/);
  // A second wave arrives while the last item of the first wave is loading.
  assert.throws(() => show(null));
  for (let n = 40; n <= 79; n++) show('burst-' + n);
  assert.throws(() => show(null)); assert.equal(created.length, 2);
  resize(); assert.equal(requests.at(-1).token, 'token-80');
  unchanged(() => send('token-40')); unchanged(() => send('token-80'));
  load(); assert.equal(created.length, 3); assert.match(frame.src, /#token-80$/);
  assert.match(await created[2].blob.text(), /burst-79/);
  unchanged(() => send('token-80')); load();
  assert.equal(requests.at(-1).token, 'token-80');
  for (const action of [
    () => send('token-40'), () => send('unknown'),
    () => send('token-80', {source: {}}), () => send('token-80', {origin: 'https://foreign.invalid'}),
    () => send('token-80', {data: {type: 'mail-preview-size', token: 'token-80', height: 200, width: 619}}),
    () => send('token-80', {data: {type: 'mail-preview-size', token: 'token-80', height: -1, width: 620}})
  ]) unchanged(action);
  send('token-80'); assert.equal(frame.style.height, '203px');
  show('after-loaded'); unchanged(() => send('token-80')); unchanged(() => send('token-81'));
  load(); send('token-81'); assert.equal(frame.style.height, '203px');
  assert.equal(live.size, 1); assert.equal(revoked.length, created.length - 1);
  // No measurement is required to advance; no load means bounded retention, not success.
  show('stalled-first'); const beforeStall = created.length;
  for (let n = 0; n < 1000; n++) show('stalled-' + n);
  assert.equal(created.length, beforeStall); assert.equal(live.size, 1);
  load(); assert.match(await created.at(-1).blob.text(), /stalled-999/); load();
  assert.equal(live.size, 1); assert.equal(revoked.length, created.length - 1);
  const result = {
    method: 'Exact preview.js in VM; simulated load, URL, message and geometry boundaries; no browser proof',
    source_sha256: crypto.createHash('sha256').update(source).digest('hex'),
    checks: ['two overlapping bursts keep first then latest', 'invalid render preserves last valid and later valid remains reachable', 'no src assignment during unfinished load', 'no active-loading URL revoked', 'no measurement needed for progress', 'current-token measurement rejected until load', 'old/unknown token and wrong source/origin/width/height ignored', 'valid current measurement accepted', '1000 updates without load create no extra URL', 'one live URL after every replacement'],
    assignments, created: created.length, revoked: revoked.length, live: [...live]
  };
  fs.writeFileSync('docs/prise-en-charge-backlog-20261025/audit-final/supplement-preview-probe-result.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({checks: result.checks.length, created: result.created, revoked: result.revoked, live: result.live.length}));
})().catch(error => { console.error(error); process.exitCode = 1; });
