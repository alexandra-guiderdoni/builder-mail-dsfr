const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('path');
const root=path.resolve(__dirname,'../review-repo');
const reports=[];
function record(id,value){reports.push({id,...value});console.log(id,JSON.stringify(value));}
const source=f=>fs.readFileSync(path.join(root,f),'utf8');
const script=source('prototype/distribution/portable.html').match(/<script>([\s\S]*)<\/script>/)[1];
function clone(x){return JSON.parse(JSON.stringify(x));}
function app(store={current:null}){
 const els=new Map(), urls=new Map(), copies=[],downloads=[],saved=[];
 let urlId=0, loads=0;
 function el(id){if(!els.has(id)) els.set(id,{id,value:'',textContent:'',hidden:false,dataset:{},handlers:{},innerHTML:'',addEventListener(k,f){this.handlers[k]=f},querySelector(){return {focus(){}}},setAttribute(k,v){this[k]=v},getAttribute(k){return this[k]},append(){},remove(){},click(){downloads.push({name:this.download,blob:urls.get(this.href)});}});return els.get(id)}
 const actions={};for(const name of ['demo','save','restore','project','mail','copy','invalid']){const e=el('action-'+name);e.dataset.action=name;actions[name]=e;}
 const add=['text','image','button'].map(name=>{const e=el('add-'+name);e.dataset.add=name;return e});
 const document={getElementById:el,querySelectorAll(q){return q==='[data-action]'?Object.values(actions):q==='[data-add]'?add:[]},createElement(){return el('anchor-'+ ++urlId)},body:{append(){}}};
 const U=class extends URL{}; U.createObjectURL=b=>{const u='blob:probe-'+ ++urlId;urls.set(u,b);return u};U.revokeObjectURL=()=>{};
 const context={window:null,document,URL:U,Blob,console,location:{protocol:'file:'},crypto:require('crypto').webcrypto,setTimeout:()=>0,navigator:{clipboard:{async write(items){copies.push(items[0].data)}}},ClipboardItem:class{constructor(data){this.data=data}},indexedDB:null};context.window=context;
 vm.createContext(context);
 // Evaluate shipped model + renderer; storage uses a deliberate injectable adapter, not a browser IndexedDB implementation.
 const prefix=script.split('/* Stockage de recette uniquement')[0];vm.runInContext(prefix,context);
 context.PrototypeDraft={async save(d){store.current=clone(d);saved.push(clone(d));},async load(){loads++;return store.current?{doc:clone(store.current)}:undefined;}};
 vm.runInContext(source('prototype/source/editor.js'),context);
 return {context,el,actions,add,copies,downloads,saved,store,urls,async input(id,value){const e=el(id);e.value=value;e.handlers.input({target:e});await tick()},async blockInput(index,key,value){const target={value,dataset:{field:`${index}-${key}`}};el('blocks').handlers.input({target});await tick()},async action(name){await actions[name].handlers.click()},async export(){await actions.project.handlers.click();return JSON.parse(await downloads.at(-1).blob.text())}};
}
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const a=app();await tick();
 await a.blockInput(2,'url','https://example.org/old');
 await a.blockInput(2,'url','https://');
 const errorBefore=a.el('error').textContent;
 await a.action('copy');
 const html=await a.copies.at(-1)['text/html'].text();
 const exported=await a.export();
 assert.equal(exported.blocks[2].url,'https://example.org/old');assert.equal(a.el('error').hidden,true);
 record('T01_INVALID_URL_OLD_EXPORTED',{input:'https://',errorBefore,exportedURL:exported.blocks[2].url,clipboardContainsOldURL:html.includes('https://example.org/old'),errorHiddenAfterCopy:a.el('error').hidden,statusAfterProject:a.el('status').textContent});
 await a.blockInput(2,'title','');await a.input('subject','');
 await a.action('copy');const emptyHtml=await a.copies.at(-1)['text/html'].text();
 assert.match(emptyHtml,/<a href="https:\/\/example.org\/old"[^>]*><\/a>/);
 record('T02_EMPTY_ACTION_ACCEPTED',{emptyLink:/<a href="https:\/\/example.org\/old"[^>]*><\/a>/.test(emptyHtml),emptyHeading:/<h1[^>]*><\/h1>/.test(emptyHtml),validation:'accepted'});
 const invalid=clone(exported);invalid.logo='data:image/png;base64,AAAA';invalid.blocks[1].image='data:image/png;base64,AAAA';
 a.context.MailDocument.parse(JSON.stringify(invalid));record('T03_CORRUPT_IMAGE_ACCEPTED',{image:'data:image/png;base64,AAAA',decodedBytes:[0,0,0],validation:'accepted'});
 const shared={current:null},b=app(shared);await tick();await b.input('subject','Sujet de A');
 const c=app(shared);await tick();await b.input('subject','Nouveau sujet de A');await c.input('footer','Pied modifié dans B');
 assert.equal(shared.current.subject,'Sujet de A');record('T04_TWO_TABS_LAST_WRITER',{subjectAfterA:'Nouveau sujet de A',subjectStoredAfterB:shared.current.subject,footerStored:shared.current.footer,method:'two editor contexts, shared injected store adapter'});
 const d=app();await tick();await d.input('subject','Ancien');
 let resolveLoad;d.context.PrototypeDraft.load=()=>new Promise(r=>resolveLoad=r);
 const restorePromise=d.action('restore');await tick();await d.input('subject','Nouveau');resolveLoad({doc:{...d.store.current,subject:'Ancien'}});await restorePromise;
 assert.equal(d.el('subject').value,'Ancien');record('T05_PENDING_RESTORE_OVERWRITES_EDIT',{typedWhileLoadPending:'Nouveau',subjectAfterLoad:d.el('subject').value,storedSubject:d.store.current.subject,method:'injected delayed load; actual editor handler'});
 // Actual worker activated against a simulated same-origin cache inventory.
 const listeners={},deleted=[];const swContext={self:{location:{origin:'https://example.org'},clients:{claim:async()=>{}},addEventListener(k,f){listeners[k]=f}},caches:{keys:async()=>['builder-mail-prototype-other-deployment','unrelated-cache'],delete:async k=>deleted.push(k)}};
 vm.createContext(swContext);vm.runInContext(source('prototype/distribution/web/sw.js'),swContext);
 let task;listeners.activate({waitUntil(p){task=p}});await task;
 assert.deepEqual(deleted,['builder-mail-prototype-other-deployment']);record('T06_SW_OTHER_DEPLOYMENT_DELETED',{deleted,method:'actual worker with simulated CacheStorage inventory'});
 const f=app();await tick();const suspicious=f.context.MailDocument.initial();suspicious.subject='<script>alert(1)</script>';suspicious.blocks[0].body='<img src=x onerror=alert(1)>';const sanitized=f.context.MailRender.html(suspicious);
 assert(!sanitized.includes('<script>'));assert(!sanitized.includes('<img src=x'));let blocked=0;
 for(const url of ['javascript:alert(1)','http://example.org','https://u:p@example.org','https://example.org/ a']){const x=f.context.MailDocument.initial();x.blocks[2].url=url;try{f.context.MailDocument.validate(x)}catch{blocked++}}
 assert.equal(blocked,4);record('T07_SECURITY_NEGATIVE_CONTROLS',{escapedScript:true,escapedImageMarkup:true,unsafeURLsRejected:blocked});
 const count=30;const perf=f.context.MailDocument.initial();perf.blocks=Array.from({length:count},(_,i)=>({...perf.blocks[0],id:'p'+i}));const textImages=perf.blocks.filter(b=>b.type==='text'&&b.image).length;
 record('T08_UNUSED_IMAGE_FIELDS',{textBlocks:count,blocksCarryingUnusedDemoImage:textImages,serializedBytes:Buffer.byteLength(JSON.stringify(perf)),strippedBytes:Buffer.byteLength(JSON.stringify({...perf,blocks:perf.blocks.map(b=>({...b,image:''}))})),method:'actual document model from shipped artifact'});
 fs.writeFileSync(path.join(__dirname,'probe-results.json'),JSON.stringify({environment:{node:process.version,mode:'Node VM and controlled adapters; no browser execution'},commit:'c329339aee8e6ba36288197ab22000772bb248ae',results:reports},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});
