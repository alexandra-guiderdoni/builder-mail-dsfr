const test = require('node:test');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.join(__dirname, '..');

function start(output) {
  const child = spawn('node', ['scripts/audit_server.cjs'], {cwd: root, env: {...process.env, BUILDER_AUDIT_PORT: '0', BUILDER_AUDIT_OUTPUT: output}, stdio: ['ignore', 'pipe', 'pipe']});
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  return new Promise((resolve, reject) => {
    child.once('exit', code => reject(new Error('serveur arrêté (code ' + code + ') : ' + stderr)));
    child.stdout.once('data', chunk => resolve({child, address: String(chunk).trim(), stderr: () => stderr}));
  });
}

test('une ressource autorisée mais absente renvoie 404, puis une requête valide réussit', async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-server-'));
  const {child, address, stderr} = await start(output);
  try {
    const missing = await fetch(address + 'mail/01.html');
    assert.equal(missing.status, 404);
    await missing.arrayBuffer();
    assert.equal(child.exitCode, null, 'le serveur doit rester vivant : ' + stderr());
    const valid = await fetch(address);
    assert.equal(valid.status, 200);
    assert.match(await valid.text(), /<html/i);
    const unknown = await fetch(address + 'inconnu.html');
    assert.equal(unknown.status, 404);
    await unknown.arrayBuffer();
    fs.mkdirSync(path.join(output, 'exports'), {recursive: true});
    fs.writeFileSync(path.join(output, 'exports', '01.html'), '<p>synthétique</p>');
    const later = await fetch(address + 'mail/01.html');
    assert.equal(later.status, 200);
    assert.equal(await later.text(), '<p>synthétique</p>');
  } finally {
    child.kill('SIGKILL');
    fs.rmSync(output, {recursive: true, force: true});
  }
});
