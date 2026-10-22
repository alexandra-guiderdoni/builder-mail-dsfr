const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function setup() {
  const png = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'app/assets/icon-192.png')).toString('base64');
  const scope = {URL, crypto, atob, btoa}; scope.window = scope;
  for (const file of ['model.js', 'render-mail.js']) vm.runInNewContext(fs.readFileSync(path.join(root, 'prototype/source', file), 'utf8').replaceAll('@@DEMO_IMAGE@@', png).replaceAll('@@LOGO@@', png), scope);
  return scope;
}
test('prototype : une action doit avoir un libellé et les titres facultatifs vides sont omis', () => {
  const {MailDocument: M, MailRender: R} = setup(), doc = M.initial();
  for (const title of ['', '   ']) { doc.blocks[2].title = title; assert.throws(() => M.validate(doc), /libellé/i); }
  doc.blocks[2].title = 'Consulter'; doc.subject = '  '; doc.blocks[0].title = ' ';
  assert.doesNotMatch(R.html(doc), /<h[12]\b/); assert.match(R.html(doc), />Consulter<\/a>/);
});
test('prototype : les paragraphes et actions ne transportent aucune image inutilisée', () => {
  const {MailDocument: M, MailRender: R} = setup(), doc = M.initial();
  assert.equal(doc.blocks[0].image, ''); assert.equal(doc.blocks[2].image, '');
  doc.blocks = Array.from({length: 30}, (_, i) => M.block('text', String(i)));
  const old = M.copy(doc); old.blocks.forEach(b => { b.image = old.logo; });
  const normalized = M.parse(JSON.stringify(old));
  assert.equal(R.html(normalized), R.html(old)); assert.equal(R.plain(normalized), R.plain(old));
  assert.ok(JSON.stringify(normalized).length < JSON.stringify(old).length / 2);
  assert.ok(normalized.blocks.every(b => b.image === ''));
});
