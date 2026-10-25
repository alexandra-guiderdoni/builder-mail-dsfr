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
 const a=app();await tick();const pending=new Map();
 a.context.FileReader=class {readAsDataURL(f){this.result=f.data;this.onload();}};
 a.context.Image=class {decode(){return new Promise(resolve=>pending.set(this.src,resolve));}};
 const fileA={type:'image/png',data:'data:image/png;base64,QUFBQQ=='};
 const event={target:{hasAttribute:()=>true,closest:()=>({dataset:{id:'image-1'}}),files:[fileA]}};
 const importPromise=a.el('blocks').handlers.change(event);await tick();
 await a.action('demo');const afterReset=(await a.export()).blocks[1].image;
 pending.get(fileA.data)();await importPromise;
 const afterDecode=(await a.export()).blocks[1].image;
 assert.notEqual(afterReset,fileA.data);assert.equal(afterDecode,fileA.data);
 record('ASTRA_T01_STALE_IMAGE_APPLIED_AFTER_REPLACE',{method:'Actual editor.js handler in Node VM; FileReader/Image/DOM/storage are controlled adapters, no browser test',initialDocumentReplaced:true,staleImageAppliedToNewDocument:afterDecode===fileA.data,staleImageAutosaved:a.saved.at(-1).blocks[1].image===fileA.data});
 fs.writeFileSync(path.join(__dirname,'image-race-results.json'),JSON.stringify(reports,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});
