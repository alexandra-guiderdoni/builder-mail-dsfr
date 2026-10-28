const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
global.window=global;global.MailBuilder={catalog:JSON.parse(execFileSync('python3',['-c','import json;from scripts.catalogue import compile_catalogue;print(json.dumps(compile_catalogue()))'],{encoding:'utf8'}))};
for(const file of ['model.js','render.js','imports.js'])vm.runInThisContext(fs.readFileSync('app/source/'+file,'utf8'),{filename:file});
const M=MailBuilder.Model,R=MailBuilder.Render,I=MailBuilder.Imports;
const remote='https://images.example/charte.png?version=2&theme=clair';
function fixture(){const lib=M.initial(),doc=lib.documents[0],block=doc.blocks.find(b=>M.component(b.component).fields.some(f=>f.type==='image')),field=M.component(block.component).fields.find(f=>f.type==='image');return{lib,doc,block,key:field.key};}
test('#192 : les objets v1 locaux restent identiques, le validateur d’image reste incorporé',()=>{
 const{lib}=fixture(),before=JSON.stringify(lib);assert.equal(M.library(lib),lib);M.versions(lib);assert.equal(JSON.stringify(lib),before);assert.throws(()=>M.image(remote),/image incorporée/);
});
test('#192 : source distante explicite, version2, retour exact au fichier local',()=>{
 const{lib,doc,block,key}=fixture(),before=JSON.stringify(lib),image=block.values[key];block.remoteImages={[key]:remote};assert.throws(()=>M.document(doc),/version 2/);assert.throws(()=>I.parse(JSON.stringify(lib)),/version 2/);
 M.versions(lib);assert.equal(lib.version,2);assert.equal(doc.version,2);M.library(lib);assert.equal(M.imageSource(block,key),remote);assert.equal(block.values[key],image);
 const html=R.html(doc);assert.ok(html.includes('src="https://images.example/charte.png?version=2&amp;theme=clair"'));assert.ok(html.includes('referrerpolicy="no-referrer"'));
 const incoming=I.parse(JSON.stringify(lib));assert.equal(incoming.value.documents[0].blocks[0].remoteImages[key],remote);
 const mixed=M.initial();const merged=I.merge(mixed,incoming);assert.equal(merged.version,2);assert.ok(merged.documents.some(d=>d.version===2));
 M.localImage(block,key,image);M.versions(lib);assert.equal(JSON.stringify(lib),before);assert.doesNotMatch(R.html(doc),/referrerpolicy=/);
});
test('#192 : toutes les règles d’URL et les champs inconnus restent refusés',()=>{
 for(const address of ['http://images.example/a.png','https:images.example/a.png','https://u:p@images.example/a.png','https://images.example/\na.png','javascript:alert(1)']){
  const{lib,block,key}=fixture();block.remoteImages={[key]:address};M.versions(lib);assert.throws(()=>M.library(lib),/HTTPS|Identifiants|Caractères/);
 }
 const{lib,block}=fixture();block.remoteImages={notAnImage:remote};M.versions(lib);assert.throws(()=>M.library(lib),/Images distantes/);
});
test('#192 : les identités distantes nécessitent la version2 de la bibliothèque',()=>{
 const{lib,block,key}=fixture();const identity=M.copy(block);identity.remoteImages={[key]:remote};lib.identities.push({id:'identity-remote',name:'Service',blocks:[identity]});assert.throws(()=>M.library(lib),/version 2/);
 M.versions(lib);M.library(lib);assert.equal(lib.version,2);assert.equal(lib.documents[0].version,1);assert.equal(lib.identities[0].blocks[0].remoteImages[key],remote);
});

test('#192 : le schéma distribué accepte v2 et rejette les frontières v1, vide, protocole et clé',()=>{
 const Ajv=require('ajv/dist/2020'),formats=require('ajv-formats'),ajv=new Ajv({allErrors:true,strict:false});formats(ajv);
 const validate=ajv.compile(JSON.parse(fs.readFileSync('app/distribution/courriels.schema.json','utf8')));
 const{lib,doc,block,key}=fixture();block.remoteImages={[key]:remote};M.versions(lib);
 assert.equal(validate(lib),true,JSON.stringify(validate.errors));assert.equal(validate(doc),true,JSON.stringify(validate.errors));
 const cases=[(()=>{const x=M.copy(doc);x.version=1;return x;})(),(()=>{const x=M.copy(doc);delete x.blocks[0].remoteImages;return x;})(),(()=>{const x=M.copy(doc);x.blocks[0].remoteImages[key]='http://images.example/x.png';return x;})(),(()=>{const x=M.copy(doc);x.blocks[0].remoteImages={notAnImage:remote};return x;})()];
 for(const value of cases)assert.equal(validate(value),false);
});
