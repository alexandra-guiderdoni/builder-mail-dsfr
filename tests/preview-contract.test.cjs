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
    assert.ok(directives['script-src'].every(value => /^'sha256-[^']+'$/.test(value) || (file !== 'snum.html' && ANDI.script.includes(value))));
    assert.equal(html.includes('allow-same-origin'), false);
  }
});

// ANDI (outil d'audit d'accessibilité) : la page du builder, web et portable, autorise exactement ses chemins
// de scripts et de styles, et le jQuery 3.7.1 qu'il charge. SNUM et l'aperçu isolé n'autorisent rien de plus.
const ANDI = {script: ['https://www.ssa.gov/accessibility/andi/', 'https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js'], style: ['https://www.ssa.gov/accessibility/andi/']};
test('ANDI : seule la page du builder autorise ses chemins exacts', () => {
  for (const file of ['portable.html', 'web/index.html', 'snum.html']) {
    const html = fs.readFileSync('app/distribution/' + file, 'utf8');
    const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
    const directives = Object.fromEntries(csp.split(';').filter(Boolean).map(s => {const [key, ...values] = s.trim().split(/\s+/); return [key, values];}));
    const external = name => directives[name].filter(value => value.startsWith('https://'));
    assert.deepEqual(external('script-src'), file === 'snum.html' ? [] : ANDI.script, file);
    assert.deepEqual(external('style-src'), file === 'snum.html' ? [] : ANDI.style, file);
  }
});

// #195 : la politique de l'aperçu est incluse dans le bundle ; elle est figée comme celle de la page.
test('#195 : chaque politique CSP distribuée, page et aperçu, est figée', () => {
  const decode = value => value.replace(/&#39;/g, "'");
  const parse = csp => Object.fromEntries(decode(csp).split(';').filter(Boolean).map(s => {const [key, ...values] = s.trim().split(/\s+/); return [key, values];}));
  const preview = {'default-src': ["'none'"], 'style-src': ["'unsafe-inline'"], 'img-src': ['data:', 'https:'], 'base-uri': ["'none'"], 'form-action': ["'none'"]};
  for (const file of ['portable.html', 'web/index.html', 'snum.html']) {
    const html = fs.readFileSync('app/distribution/' + file, 'utf8');
    const policies = [...html.matchAll(/http-equiv="Content-Security-Policy" content="([^"]+)"/g)].map(match => parse(match[1]));
    assert.equal(policies.length, 2, `${file} : une politique de page et une politique d’aperçu`);
    assert.deepEqual(policies[1], preview, `${file} : politique d’aperçu`);
  }
});
