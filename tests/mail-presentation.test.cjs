const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
global.window=global;
global.MailBuilder={catalog:JSON.parse(execFileSync('python3',['-B','-c','import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'],{encoding:'utf8',maxBuffer:20*1024*1024}))};
for(const file of ['model.js','render.js'])vm.runInThisContext(fs.readFileSync('app/source/'+file,'utf8'),{filename:file});
const A=MailBuilder,M=A.Model,R=A.Render;
const forbidden=new Set('align alink background bgcolor border cellpadding cellspacing char charoff clear color compact frameborder hspace link marginheight marginwidth text valign vlink vspace size width height'.split(' '));
function presentation(source){
 const found=[];
 for(const [,tag,attributes] of source.matchAll(/<([a-z][\w:-]*)\b([^<>]*?)>/gi))for(const [,attribute] of attributes.matchAll(/\s([\w:-]+)\s*=\s*["']/g)){
  if(!forbidden.has(attribute)||(attribute==='size'&&tag==='select')||(['width','height'].includes(attribute)&&['img','object','embed','canvas','svg'].includes(tag)))continue;
  found.push(tag+'['+attribute+']');
 }
 return found;
}
test('les 52 sorties HTML ne contiennent aucun attribut de présentation interdit par le test 10.1.2',()=>{
 for(let index=0;index<52;index++){
  const html=R.html(M.create('Présentation',[index]));
  assert.deepEqual(presentation(html),[],'Composant '+index);
  assert(!/\bfloat\s*:/i.test(html),'Aucune dépendance aux flottants dans le composant '+index);
 }
});
test('les dix groupes de colonnes utilisent des cellules natives et conservent leur base de largeur',()=>{
 const grouped=new Set([2,3,6,30,31,32,33,46,47,48]);
 for(let index=0;index<52;index++){
  const html=R.html(M.create('Colonnes',[index])),groups=[...html.matchAll(/data-mail-columns\s*=/g)];
  assert.equal(groups.length,grouped.has(index)?1:0,'Composant '+index);
  if(grouped.has(index)){
   assert.match(html,/data-mail-basis="496"/);
   assert.equal([...html.matchAll(/data-mail-column\s*=/g)].length,[3,48].includes(index)?3:2);
  }
 }
 assert.match(A.catalog.layoutCss,/mail-columns-stack/);
});
test('les liens source ajoutés au rendu respectent aussi 10.1.2 sans modifier les données',()=>{
 const doc=M.create('Sources',[5,19]);doc.blocks[1].source='https://exemple.invalid/dossier';doc.blocks[1].sourceLabel='Lire <dossier> & suite';
 const before=JSON.stringify(doc),html=R.html(doc);
 assert.deepEqual(presentation(html),[]);assert(html.includes('Lire &lt;dossier&gt; &amp; suite'));
 assert(R.plain(doc).includes('Lire <dossier> & suite'));assert.equal(JSON.stringify(doc),before);
});
test('le contrat canonique v1 et les déclarations Office sont conservés',()=>{
 assert.equal(A.catalog.id,'6ca8ea12a0dcbdd6e59f287b6435b06367b8a44c4278f74858e8cddd6e72af8b');
 const old=JSON.parse(fs.readFileSync('app/distribution/qualification.courriels.json','utf8')),before=JSON.stringify(old);
 assert.equal(JSON.stringify(M.library(old)),before);assert.equal(A.catalog.components.length,52);
 assert.equal(A.catalog.components.reduce((n,c)=>n+c.fields.length,0),178);
 for(const c of A.catalog.components)for(const property of ['mso-table-lspace','mso-table-rspace']){
  const count=source=>[...source.matchAll(new RegExp(property+'\\s*:','g'))].length;
  assert(count(c.semanticTemplate)>=count(c.template),c.id+' '+property);
 }
});
test('une dérive de base, de largeur, de côté ou un attribut non qualifié arrête la compilation',()=>{
 const result=execFileSync('python3',['-B','-c',`
from scripts.catalogue import compile_catalogue
from scripts.mail_layout import css_template
source=compile_catalogue()['components'][6]['template']
mutations=[source.replace('width="496"','width="497"'),source.replace('width="331"','width="332"'),source.replace('align="right"','align="left"'),source.replace('<table','<table color="red"',1)]
for changed in mutations:
    assert changed != source
    try: css_template(6,changed)
    except ValueError: pass
    else: raise AssertionError('Dérive acceptée')
print('DERIVES_REFUSEES_4')
`],{encoding:'utf8'});
 assert.equal(result.trim(),'DERIVES_REFUSEES_4');
});
