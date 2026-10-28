/* Les callbacks réels des recettes sont extraits sans exécuter leur parcours navigateur. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const root = path.resolve(__dirname, '..');
const recipes = ['scripts/recipe_firefox.mjs', 'scripts/recipe_installation.cjs'];
function callback(source, sandbox) {
  const marker = 'http.createServer(', start = source.indexOf(marker);
  assert(start >= 0);
  const tail = source.slice(start + marker.length), end = /\n\s*\}\);/.exec(tail);
  assert(end, 'frontière du callback réelle');
  return vm.runInNewContext('(' + tail.slice(0, end.index) + '\n})', sandbox);
}
async function serve(t, handle) {
  const errors = [];
  const server = http.createServer((request, response) => Promise.resolve(handle(request, response)).catch(error => { errors.push(error); response.destroy(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return {address: `http://127.0.0.1:${server.address().port}`, errors};
}
for (const file of recipes) test(`${file} : fichier absent ou illisible donne un 404 terminé, puis fichier valide`, async t => {
  const base = path.join(root, 'app/distribution/web');
  const handle = callback(await fs.readFile(path.join(root, file), 'utf8'), {path, URL, base, fs: {async readFile(file) {
    if (file.endsWith(path.sep + 'illisible.js')) throw Object.assign(new Error('panne synthétique'), {code: 'EACCES'});
    return fs.readFile(file);
  }}});
  const run = await serve(t, handle);
  for (const name of ['absent.js', 'illisible.js']) {
    const response = await fetch(run.address + '/' + name);
    assert.equal(response.status, 404); await response.arrayBuffer();
  }
  const response = await fetch(run.address + '/sw.js');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/javascript');
  assert.equal(await response.text(), await fs.readFile(path.join(base, 'sw.js'), 'utf8'));
  assert.deepEqual(run.errors, []);
});

test('audit_server : cible malformée renvoie 400 sans arrêter le processus possédé', async t => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'infra-audit-server-'));
  t.after(() => fs.rm(output, {recursive: true, force: true}));
  const child = spawn(process.execPath, ['scripts/audit_server.cjs'], {cwd: root, env: {...process.env, BUILDER_AUDIT_PORT: '0', BUILDER_AUDIT_OUTPUT: output}, stdio: ['ignore', 'pipe', 'pipe']});
  const exited = once(child, 'exit'); let stderr = '';
  child.stderr.on('data', data => { stderr += data; });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM'); await exited; });
  const address = await new Promise((resolve, reject) => {
    child.once('error', reject); child.once('exit', code => reject(new Error('Arrêt avant ouverture : ' + code + ' ' + stderr)));
    child.stdout.once('data', data => resolve(String(data).trim()));
  });
  const malformed = await new Promise((resolve, reject) => {
    const request = http.request(address, {path: '//['}, response => { response.resume(); response.once('end', () => resolve(response.statusCode)); });
    request.setTimeout(2000, () => request.destroy(new Error('réponse malformée non terminée')));
    request.once('error', reject); request.end();
  });
  assert.equal(malformed, 400);
  const response = await fetch(address); assert.equal(response.status, 200); await response.arrayBuffer();
  assert.equal(child.exitCode, null, stderr); assert.equal(stderr, '');
});
