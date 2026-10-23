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
