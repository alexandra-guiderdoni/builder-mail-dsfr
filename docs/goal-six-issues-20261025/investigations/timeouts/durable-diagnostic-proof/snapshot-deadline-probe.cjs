// Disposable diagnostic-only probe. No browser or application code is executed.
const assert = require('node:assert/strict');
const path = require('node:path');
const {attachExportDiagnostics, recordExportPhase, exportDiagnosticError} = require(path.resolve('tests/export-diagnostics.cjs'));
const timers = () => process.getActiveResourcesInfo().filter(type => type === 'Timeout').length;
const nextTurn = () => new Promise(resolve => setImmediate(resolve));
const decode = error => JSON.parse(error.message.split(' ; diagnostic ')[1]);
(async () => {
  const initialTimers = timers();
  let pendingCalls = 0;
  const pendingPage = {on() {}, async addInitScript() {}, evaluate() { pendingCalls++; return new Promise(() => {}); }};
  await attachExportDiagnostics(pendingPage);
  recordExportPhase(pendingPage, 'before-confirm', '#check-confirm');
  const original = new Error('PRIMARY_PENDING_RENDERER'); original.name = 'TimeoutError';
  const details = {label: 'nom attendu conservé', selector: '#check-confirm', lastPhase: 'before-confirm'};
  const start = performance.now();
  const failure = await exportDiagnosticError(pendingPage, original, details), elapsedMs = performance.now() - start;
  const fallback = decode(failure);
  assert(elapsedMs >= 900 && elapsedMs < 2500, `deadline elapsed ${elapsedMs}`);
  assert.equal(pendingCalls, 1);
  assert.deepEqual(fallback.original, {name: original.name, message: original.message, stack: original.stack});
  assert.equal(failure.cause, original);
  assert.equal(fallback.label, details.label); assert.equal(fallback.selector, details.selector);
  assert.equal(fallback.lastPhase, 'before-confirm'); assert.equal(fallback.phases[0].phase, 'before-confirm');
  assert.match(fallback.browser.unreadable, /1000 ms/); assert.match(fallback.state.unreadable, /1000 ms/);
  await nextTurn(); assert.equal(timers(), initialTimers, 'no timeout retained after fallback');

  let fastCalls = 0;
  const state = {notice: 'notice retained', error: 'error retained', checkDialog: true, focused: true};
  const browser = {events: [], active: 'check-confirm', dialog: true, focused: true};
  const fastPage = {evaluate() { fastCalls++; return Promise.resolve({state, browser}); }};
  const fastFailure = decode(await exportDiagnosticError(fastPage, original, details));
  assert.equal(fastCalls, 1); assert.deepEqual(fastFailure.state, state); assert.deepEqual(fastFailure.browser, browser);
  await nextTurn(); assert.equal(timers(), initialTimers, 'deadline timer cleared when snapshot resolves early');
  console.log(JSON.stringify({kind: 'diagnostic-only-counterexample', elapsedMs, pendingCalls, fastCalls,
    primaryAndDetailsPreserved: true, fallbackUnreadable: true, normalSnapshotShapePreserved: true,
    timersBefore: initialTimers, timersAfter: timers(), strictUnhandledRejections: process.execArgv.includes('--unhandled-rejections=strict')}));
})().catch(error => { console.error(error); process.exitCode = 1; });
