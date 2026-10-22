const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {cwd: root, encoding: 'utf8'}));
const png = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'app/assets/icon-192.png')).toString('base64');
function model(file) {
  const scope = {URL, crypto, atob, btoa, MailBuilder: {catalog}}; scope.window = scope;
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8').replaceAll('@@DEMO_IMAGE@@', png).replaceAll('@@LOGO@@', png), scope);
  return scope;
}
for (const file of ['app/source/model.js', 'prototype/source/model.js']) {
  test(`${file} : un import refuse Base64 impossible, contenu non image et MIME mensonger`, () => {
    const scope = model(file);
    const validate = value => {
      if (scope.MailDocument) return scope.MailDocument.validate({...scope.MailDocument.initial(), logo: value});
      const doc = scope.MailBuilder.Model.create('Image importée', [27]); doc.blocks[0].values.f0 = value;
      return scope.MailBuilder.Model.document(doc);
    };
    assert.doesNotThrow(() => validate(png));
    for (const bad of ['data:image/png;base64,A', 'data:image/png;base64,' + btoa('Ceci est un texte, pas une image.'), png.replace('image/png', 'image/jpeg')]) {
      assert.throws(() => validate(bad), /(?:Logo|Bloc 1).*image/i, bad.slice(0, 90));
    }
  });
}
