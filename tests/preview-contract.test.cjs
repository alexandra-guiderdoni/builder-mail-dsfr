const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const assert = require('node:assert/strict');

test('le bundle reste un script HTML complet et la CSP autorise les deux empreintes exactes', () => {
  const measure = fs.readFileSync('app/source/preview-measure.js', 'utf8');
  const hash = source => createHash('sha256').update(source).digest('base64');
  for (const file of ['app/distribution/portable.html', 'app/distribution/web/index.html']) {
    const html = fs.readFileSync(file, 'utf8'), scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1); assert.doesNotThrow(() => new vm.Script(scripts[0][1]));
    const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
    const scriptPolicy = /(?:^|;)script-src ([^;]+)/.exec(csp)[1];
    assert.deepEqual(scriptPolicy.match(/sha256-([^']+)/g).sort(), ['sha256-' + hash(measure), 'sha256-' + hash(scripts[0][1])].sort());
    assert(html.includes('sandbox="allow-scripts"')); assert(!html.includes('allow-same-origin'));
  }
  const snum = fs.readFileSync('app/distribution/snum.html', 'utf8');
  assert(snum.includes('sandbox=""')); assert(!snum.includes('sha256-' + hash(measure)));
  assert(!snum.includes('window.MailBuilder.previewMeasure'));
});


test('#192 : seule la politique image du builder autorise HTTPS, SNUM et les sandbox restent restreints', () => {
  for (const file of ['portable.html', 'web/index.html', 'snum.html']) {
    const html = fs.readFileSync('app/distribution/' + file, 'utf8');
    const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
    const directives = Object.fromEntries(csp.split(';').filter(Boolean).map(s => {const [key, ...values] = s.trim().split(/\s+/); return [key, values];}));
    assert.deepEqual(directives['default-src'], ["'none'"]);
    assert.deepEqual(directives['connect-src'], file === 'web/index.html' ? ["'self'"] : ["'none'"]);
    assert.deepEqual(directives['img-src'], file === 'snum.html' ? ['data:', 'blob:'] : file === 'portable.html' ? ['data:', 'blob:', 'https:'] : ["'self'", 'data:', 'blob:', 'https:']);
    assert.ok(directives['script-src'].every(value => /^'sha256-[^']+'$/.test(value)));
    assert.equal(html.includes('allow-same-origin'), false);
  }
});
