const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding:'utf8'}))};
for (const name of ['model.js','render.js','imports.js']) vm.runInThisContext(fs.readFileSync('app/source/'+name,'utf8'),{filename:name});
const {Model:M, Render:R, Imports:I} = MailBuilder;
const footers = MailBuilder.catalog.components.filter(c => c.family === 'Pieds de page' && c.fields.some(f => f.type === 'url'));
const mail = 'mailto:service+revue@example.invalid?subject='+encodeURIComponent('S’abonner à la revue');
const footerDoc = (id, value) => {const d=M.create('Footer',[id]);const field=M.component(d.blocks[0].component).fields.find(f=>f.type==='url');d.blocks[0].values[field.key]=value;return d;};

test('les quatre composants de pied de page acceptent une adresse mailto et un objet UTF-8', () => {
  assert.deepEqual(footers.map(c=>c.id), ['mail-47','mail-48','mail-49','mail-50']);
  for(const c of footers) for(const value of [mail, 'mailto:service@example.invalid', 'MAILTO:service@example.invalid?subject=Bonjour',
      'mailto:service@example.invalid?subject='+encodeURIComponent('R&D + 100 %')]) {
    const doc=footerDoc(c.id,value);
    assert.deepEqual(I.parse(JSON.stringify(doc)).value,doc);
    assert.ok(R.html(doc).includes('href="'+R.escape(value)+'"'));
    assert.ok(R.plain(doc).includes(value));
  }
});

test('mailto reste refusé dans les autres composants, tous les liens source et le validateur HTTPS', () => {
  assert.throws(()=>M.url(mail), /HTTPS/);
  for(const c of MailBuilder.catalog.components) {
    const doc=M.create('Périmètre',[c.id]);doc.blocks[0].source=mail;
    assert.throws(()=>M.document(doc),/HTTPS/);
    if(c.family==='Pieds de page') continue;
    for(const f of c.fields.filter(f=>f.type==='url')) {
      doc.blocks[0].source='';doc.blocks[0].values[f.key]=mail;
      assert.throws(()=>M.document(doc),/HTTPS/);
    }
  }
});

test('les pieds de page refusent destinataires multiples, paramètres et contrôles indésirables', () => {
  const invalid = [
    'mailto:', 'mailto:service', 'mailto:.service@example.invalid', 'mailto:service..revue@example.invalid',
    'mailto:service@example..invalid', 'mailto:service@-example.invalid', 'mailto:service@example.invalid,autre@example.invalid',
    'mailto:service@example.invalid;autre@example.invalid', 'mailto:Nom <service@example.invalid>',
    'mailto:service@example.invalid#fragment', 'mailto:service@example.invalid?body=Texte',
    'mailto:service@example.invalid?bcc=autre@example.invalid', 'mailto:service@example.invalid?%62cc=autre@example.invalid',
    'mailto:service@example.invalid?subject=A&subject=B', 'mailto:service@example.invalid?subject=Espace brut',
    'mailto:service@example.invalid?subject=A%0d%0aBcc%3Aautre', 'mailto:service@example.invalid?subject=A%250D%250AB',
    'mailto:service@example.invalid?subject=A%25%30%44%25%30%41B',
    'mailto:service@example.invalid?subject=A%25%32%35%30%44%25%32%35%30%41B',
    'mailto:service@example.invalid?subject=A%26B%25%30%44%25%30%41C',
    'mailto:service@example.invalid?subject=A%2BB%25%30%44%25%30%41C',
    'mailto:service@example.invalid?subject=A%25%30%44%25%30%41B%',
    'mailto:service@example.invalid?subject='+Array.from({length:20}).reduce(value=>encodeURIComponent(value),'\r\n'),
    'mailto:service@example.invalid?subject=A%00B', 'mailto:service@example.invalid?subject=A%7FB',
    'mailto:service@example.invalid?subject=A\nB'
  ];
  for(const c of footers) for(const value of invalid) assert.throws(()=>M.document(footerDoc(c.id,value)),/mailto/,value);
});

test('les règles HTTPS des pieds de page et l’empreinte du catalogue sont conservées', () => {
  for(const c of footers) {
    assert.doesNotThrow(()=>M.document(footerDoc(c.id,'https://example.invalid/abonnement')));
    for(const value of ['javascript:alert(1)','data:text/html,test','http://example.invalid/','https://user:pass@example.invalid/']) {
      assert.throws(()=>M.document(footerDoc(c.id,value)),/HTTPS/);
    }
  }
  assert.equal(MailBuilder.catalog.id,'6ca8ea12a0dcbdd6e59f287b6435b06367b8a44c4278f74858e8cddd6e72af8b');
});
