const fs = require('node:fs');
const http = require('node:http');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const crypto = require('node:crypto');
const sourcePath = process.argv[3];
const source = fs.readFileSync(sourcePath, 'utf8');
const start = source.indexOf('async function withPreview(');
const end = source.indexOf('\ntest(', start);
if (start < 0 || end < 0) throw new Error('Exact withPreview declaration unavailable');
if (process.argv[2] === '--child') {
  const mode = process.argv[4], counts = {listen: 0, hostClose: 0, browserClose: 0};
  const resourceServer = async () => {
    const server = http.createServer((request, response) => response.end('owned probe'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); counts.listen++;
    return {origin: 'http://127.0.0.1:' + server.address().port, close: async () => {
      counts.hostClose++; await new Promise(resolve => server.close(resolve));
    }};
  };
  const chromium = {launch: async () => {
    if (mode === 'launch-reject') throw new Error('injected-launch-rejection');
    return {newPage: async () => ({goto: async () => {}}), close: async () => {
      counts.browserClose++; if (mode === 'close-reject') throw new Error('injected-close-rejection');
    }};
  }};
  const actual = vm.runInNewContext(source.slice(start, end) + '\nwithPreview;', {resourceServer, chromium});
  (async () => {
    let error = null;
    try { await actual(async () => { if (mode === 'callback-reject') throw new Error('injected-callback-rejection'); }); }
    catch (cause) { error = cause.message; }
    process.stdout.write(JSON.stringify({mode, counts, error}) + '\n');
  })().catch(cause => { process.stderr.write(cause.stack); process.exitCode = 1; });
} else {
  const rows = [];
  for (const mode of ['launch-reject', 'close-reject', 'callback-reject', 'success']) {
    const r = spawnSync(process.execPath, [__filename, '--child', sourcePath, mode], {timeout: 1500, encoding: 'utf8'});
    const observation = r.stdout.trim() ? JSON.parse(r.stdout.trim()) : null;
    rows.push({mode, status: r.status, signal: r.signal, timedOut: r.error?.code === 'ETIMEDOUT', observation});
  }
  const result = {layer: 'fault injection at browser boundary with real owned HTTP handle; exact source function', source_sha256: crypto.createHash('sha256').update(source).digest('hex'), rows};
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  const expectedErrors = {'launch-reject': 'injected-launch-rejection', 'close-reject': 'injected-close-rejection', 'callback-reject': 'injected-callback-rejection', success: null};
  const passed = rows.every(r => !r.timedOut && r.status === 0 && r.observation?.counts.hostClose === 1 && r.observation?.error === expectedErrors[r.mode]);
  process.exitCode = passed ? 0 : 1;
}
