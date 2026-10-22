const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
global.window = global;
global.MailBuilder = {catalog: JSON.parse(execFileSync('python3', ['-B', '-c', 'import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'], {encoding:'utf8'}))};
for (const file of ['prototype/reference/snum-packet.js','app/source/model.js','app/source/render.js','app/source/imports.js','app/snum/adapter.js']) vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const {Model:M,Render:R,Imports:I}=MailBuilder;
const headings = html => [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map(m=>({level:Number(m[1]),text:m[2].replace(/<[^>]*>/g,'').trim()}));
const levels = indices => headings(R.html(M.create('Structure',indices))).map(h=>h.level);

test('SNUM : principal, rubriques, articles et deux sous-titres frères ont des titres natifs',()=>{
  const packet=require('./fixtures/snum.cjs')(),doc=MailBuilder.SnumAdapter.convert(JSON.stringify(packet)).document;
  const before=JSON.stringify(doc),actual=headings(R.html(doc));
  assert.equal(actual[0]?.level,1);
  const article=actual.findIndex(h=>h.text===packet.articles[0].title);
  assert(article>1);assert.deepEqual(actual.slice(article-1,article+3).map(h=>h.level),[2,3,4,4]);
  assert.equal(actual[article+1].text,'À retenir');assert.equal(actual[article+2].text,'Pour le SNUM');
  assert.equal(actual.length,1+new Set(packet.articles.map(a=>a.rubric)).size+packet.articles.length*3);
  assert.equal(JSON.stringify(doc),before);
});

test('les parents absents, réordonnés ou vides ne créent ni saut ni contexte périmé',()=>{
  assert.deepEqual(levels([5,12,15,25,25,15,25,12,25]),[1,2,3,4,4,3,4,2,3]);
  assert.deepEqual(levels([15,25,25,12,25,5,25]),[1,2,2,1,2,1,2]);
  assert.deepEqual(levels([5,5,12,37,25]),[1,1,2,3,4,4,4]);
  const doc=M.create('Vide',[5,12,15,12,25]);doc.blocks[3].values.f0=' ';
  assert.deepEqual(headings(R.html(doc)).map(h=>h.level),[1,2,3,2]);
  // La section vide ferme aussi le contexte précédent quand aucun principal ne subsiste.
  doc.blocks[0].values.f0='';assert.deepEqual(headings(R.html(doc)).map(h=>h.level),[1,2,1]);
  assert.deepEqual(levels([2,4,8,19,27,40,44,47]),[]);
});

test('les titres locaux restent frères ; les liens et les champs non titrés sont conservés',()=>{
  assert.deepEqual(levels([5,12,15,34]),[1,2,3,4,4,4,4,4]);
  assert.deepEqual(levels([5,46,25]),[1,2,3,3,3]);
  const doc=M.create('Lien',[5,12,31]);const b=doc.blocks[2];b.values.f3='https://exemple.invalid/article';b.values.f4='Lire <dossier> & suite';
  const html=R.html(doc);assert.equal(headings(html).length,3);assert.match(html,/<h3[^>]*>\s*<a[^>]*href="https:\/\/exemple.invalid\/article"/);
  assert(html.includes('Lire &lt;dossier&gt; &amp; suite'));assert(!headings(html).some(h=>h.text==='Auteur'));
  const cards=headings(R.html(M.create('Cartes',[46])));assert.deepEqual(cards.map(h=>h.level),[1,2,2]);assert(!cards.some(h=>h.text.includes('aides')));
});

test('les fichiers v1 et les 52 composants gardent le même contrat sans mutation',()=>{
  const old=JSON.parse(fs.readFileSync('app/distribution/qualification.courriels.json','utf8')),before=JSON.stringify(old);
  assert.equal(MailBuilder.catalog.id,'6ca8ea12a0dcbdd6e59f287b6435b06367b8a44c4278f74858e8cddd6e72af8b');
  const lib=I.parse(before).value;for(const doc of lib.documents){const html=R.html(doc);assert(!/\{\{(?:h|level)/.test(html));}
  assert.equal(JSON.stringify(lib),before);assert.equal(JSON.stringify(old),before);
  assert.equal(MailBuilder.catalog.components.reduce((n,c)=>n+c.fields.length,0),178);
});
