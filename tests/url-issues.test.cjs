const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding: 'utf8'}))};
vm.runInThisContext(fs.readFileSync('app/source/model.js', 'utf8'), {filename: 'model.js'});
const M = MailBuilder.Model, m = M.urlMessages;

test('checkUrl distingue URL incomplète, protocole interdit, identifiants et caractères interdits', () => {
  for (const value of ['', 'https:', 'https://', 'exemple.invalid/page']) assert.equal(M.checkUrl(value), m.incomplete, value);
  for (const value of ['http://exemple.invalid/', 'javascript:alert(1)', 'ftp://exemple.invalid/', 'mailto:a@example.invalid']) assert.equal(M.checkUrl(value), m.protocol, value);
  assert.equal(M.checkUrl('https://u:p@exemple.invalid/'), m.credentials);
  for (const value of ['https://exemple.invalid/a b', 'https://exemple.invalid/\n', ' https://exemple.invalid/']) assert.equal(M.checkUrl(value), m.characters, JSON.stringify(value));
  assert.equal(new Set(Object.values(m)).size, 4);
  assert.equal(M.checkUrl('https://exemple.invalid/page'), '');
});

test('le lien source est facultatif et les pieds de page acceptent mailto', () => {
  assert.equal(M.checkUrl('', {optional: true}), '');
  assert.equal(M.checkUrl('https://', {optional: true}), m.incomplete);
  assert.equal(M.checkUrl('mailto:service@example.invalid?subject=Bonjour', {footer: true}), '');
  assert.notEqual(M.checkUrl('mailto:service@example.invalid?bcc=x@example.invalid', {footer: true}), '');
  assert.equal(M.checkUrl('mailto:service@example.invalid'), m.protocol);
});

// #163 : les formes sans autorité explicite changent de destination selon la base.
test('les URL HTTPS abrégées sont refusées à toutes les entrées du modèle', () => {
  for (const value of ['https:exemple.invalid/page', 'https:/exemple.invalid/page', 'HTTPS:exemple.invalid/page']) {
    assert.equal(M.checkUrl(value), m.incomplete, value);
    assert.equal(M.checkUrl(value, {optional: true}), m.incomplete, value);
    assert.equal(M.checkUrl(value, {footer: true}), m.incomplete, value);
    const doc = M.create('Lien abrégé', [40]);
    const field = M.component(doc.blocks[0].component).fields.find(f => f.type === 'url');
    doc.blocks[0].values[field.key] = value;
    assert.throws(() => M.document(doc), /commençant par https:\/\//);
    doc.blocks[0] = M.createBlock(19); doc.blocks[0].source = value;
    assert.throws(() => M.document(doc), /commençant par https:\/\//);
  }
  for (const value of ['https://exemple.invalid/page', 'HTTPS://exemple.invalid/page', 'https://exemple.invalid/é?q=a&b=c#partie']) {
    assert.equal(M.checkUrl(value), '');
    assert.equal(new URL(value).href, new URL(value, 'https://webmail.invalid/mail/message').href);
  }
});
