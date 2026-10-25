'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {installDestinations,createRecorder,attachDestinations,markDestination,destinationError}=require('./runtime/tests/destinations-probe.cjs');
const {edits,transform}=require('./prepare.cjs');
function documentHarness({main=false,crypto,random=0.25,styleThrows=false,bindingRejects=false}={}){
 const listeners=new Map(),windowListeners=new Map(),rows=[];let layouts=0;
 const element=(tag,id)=>({tagName:tag,id,isConnected:true,open:id==='check-dialog',scrollTop:0,inert:false,src:id==='preview'?'blob:null/preview':'',
  getAttribute:()=>null,hasAttribute:()=>false,matches:s=>s===':modal',getBoundingClientRect(){layouts++;return {x:1,y:2,width:3,height:4}}});
 const nodes=Object.fromEntries([['check-dialog','DIALOG'],['check-confirm','BUTTON'],['preview','IFRAME']].map(([id,tag])=>[id,element(tag,id)]));
 const document={activeElement:nodes['check-confirm'],getElementById:id=>nodes[id]||null,
  addEventListener(type,fn,options){assert.equal(options.capture,true);assert.equal(options.passive,true);if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)}};
 const window={document,__dest145Send:row=>{rows.push(JSON.parse(JSON.stringify(row)));return bindingRejects?Promise.reject(Error('binding failure')):undefined;},
  addEventListener(type,fn,options){assert.equal(options.passive,true);windowListeners.set(type,fn)}};window.top=main?window:{};
 const math=Object.create(Math);math.random=()=>random;
 const context=vm.createContext({window,document,crypto,Math:math,location:{href:'blob:null/document'},performance:{now:()=>10,timeOrigin:1},
   innerWidth:1600,innerHeight:1000,scrollX:0,scrollY:577,devicePixelRatio:1,Promise,WeakMap,
   getComputedStyle(){if(styleThrows)throw Error('style unavailable');return {pointerEvents:'none',visibility:'visible'}}});
 const install=()=>vm.runInContext('('+installDestinations.toString()+')()',context);
 const fire=(type,event={})=>{const e={type,target:nodes['check-confirm'],isTrusted:true,timeStamp:9,clientX:5,clientY:6,screenX:7,screenY:8,pointerId:1,button:0,...event};for(const fn of listeners.get(type)||[])fn(e);return e;};
 return {install,rows,window,listeners,windowListeners,fire,nodes,get layouts(){return layouts;}};
}
test('serialized observer installs in opaque context with absent crypto and crypto.randomUUID',()=>{
 for(const crypto of [undefined,{}]){const h=documentHarness({crypto});h.install();h.fire('pointerdown');assert.equal(h.rows[0].kind,'installation');assert.equal(h.rows[1].pointerId,1);assert.equal(h.rows[1].clientX,5);assert.equal(h.rows[1].screenX,7);assert.equal(h.rows[1].target.id,'check-confirm');}
});
test('one installation retains distinct event IDs; repeat setup adds no listeners',()=>{
 const h=documentHarness();h.install();h.install();h.fire('pointerdown');h.fire('mousedown');
 assert.equal(h.listeners.get('pointerdown').length,1);assert.equal(h.rows.find(r=>r.kind==='repeat-install').listenersAdded,false);
 assert.deepEqual(h.rows.filter(r=>r.kind==='input').map(r=>r.eventId),[1,2]);
});
test('navigation creates distinct document labels without assuming timeOrigin uniqueness',()=>{
 const a=documentHarness({random:0.2}),b=documentHarness({random:0.3});a.install();b.install();assert.notEqual(a.rows[0].documentKey,b.rows[0].documentKey);assert.equal(a.rows[0].timeOrigin,b.rows[0].timeOrigin);
});
test('geometry only on first open look, no input listener layout reads',()=>{
 const h=documentHarness({main:true});h.install();h.fire('pointerdown');assert.equal(h.layouts,0);
 h.window.__dest145.firstOpen();h.window.__dest145.firstOpen();assert.equal(h.layouts,3);
 const r=h.rows.find(r=>r.kind==='first-open-geometry');assert.equal(r.pointerEvents,'none');assert.equal(r.modal,true);assert.equal(r.viewport.scrollY,577);
 assert.equal(r.button.uid,h.rows.find(r=>r.kind==='input').target.uid);
 h.nodes['check-confirm']={...h.nodes['check-confirm']};h.fire('click');assert.notEqual(h.rows.at(-1).target.uid,r.button.uid);
});
test('observer geometry error is recorded and does not throw into existing look',()=>{
 const h=documentHarness({styleThrows:true});h.install();assert.doesNotThrow(()=>h.window.__dest145.firstOpen());assert.equal(h.rows.at(-1).kind,'observer-error');
});
test('document overflow explicitly reports lower bound; no unbounded bridge queue',()=>{
 const h=documentHarness();h.install();for(let i=0;i<700;i++)h.fire('click');assert.equal(h.rows.length,513);
 assert.equal(h.rows.at(-1).kind,'overflow');assert.equal(h.rows.at(-1).furtherDropsUnreported,true);assert.equal(h.rows.at(-1).droppedAtLeast,1);
});
test('binding rejections handled without awaiting transport; later telemetry reports count',async()=>{
 const h=documentHarness({bindingRejects:true});h.install();await Promise.resolve();h.fire('click');assert.equal(h.rows.at(-1).metrics.rejected,1);await Promise.resolve();
});
function fakeSource(){const frame={url:()=> 'blob:null/current'};const page={mainFrame:()=>frame};return {page,frame,source:{page,frame}};}
const payload=(documentKey,sequence,eventId=sequence)=>({documentKey,sequence,kind:'input',eventId,documentURL:'blob:null/recorded',metrics:{dropped:0}});
test('public binding frame identity retained through navigation; document epochs not merged',()=>{
 const {page,frame,source}=fakeSource(),r=createRecorder(page,1);
 r.receive(source,payload('old',1));r.navigation('framenavigated',frame);r.receive(source,payload('new',1));r.receive(source,payload('old',2));
 assert.equal(r.record.documents.length,2);const rows=r.record.rows.filter(x=>x.kind==='browser');
 assert.deepEqual(rows.map(x=>x.frame.id),[1,1,1]);assert.deepEqual(rows.map(x=>x.documentEpoch),[1,2,1]);assert.equal(rows[2].data.documentURL,'blob:null/recorded');
});
test('duplicate/gap/nonmonotone inputs are retained and flagged, not silently deduplicated',()=>{
 const {page,source}=fakeSource(),r=createRecorder(page,1);for(const [seq,event]of[[1,1],[1,1],[3,3],[2,2]])r.receive(source,payload('d',seq,event));
 const d=r.record.documents[0];assert.equal(d.duplicates,1);assert.equal(d.duplicateEventIds,1);assert.equal(d.gaps,1);assert.equal(d.nonMonotone,1);assert.equal(r.record.rows.length,4);
});
test('node rows, document table and source errors bounded; serialization remains explicit',()=>{
 const {page,source}=fakeSource(),r=createRecorder(page,1);
 for(let i=1;i<=2200;i++)r.receive(source,payload('d',i));assert.equal(r.record.rows.length,2000);assert.equal(r.record.dropped,200);
 for(let i=0;i<70;i++)r.receive(source,payload('extra'+i,1));assert.equal(r.record.documents.length,64);assert.equal(r.record.documentLimitExceeded,7);
 for(let i=0;i<30;i++)r.receive({page:{}},null);assert.equal(r.record.observerErrors.length,20);assert.equal(r.record.observerErrorDrops,10);
 assert.match(JSON.stringify(r.record),/unknown: no drain/);
});
test('installation uses public exposeBinding then addInitScript before caller navigation; failure is nonthrowing',async()=>{
 const calls=[];const page={on(){},async exposeBinding(name,callback){calls.push(name);assert.equal(typeof callback,'function');},async addInitScript(fn){calls.push('init');assert.equal(fn,installDestinations)}};
 await attachDestinations(page);assert.deepEqual(calls,['__dest145Send','init']);
 await attachDestinations({on(){},async exposeBinding(){throw Error('setup failed')}});
});
test('exact source inverse, original app and 1000ms diagnostic unchanged',()=>{
 for(const r of JSON.parse(fs.readFileSync(__dirname+'/INPUTS.json'))){
  const original=fs.readFileSync(path.join(__dirname,'original',r.path),'utf8'),current=fs.readFileSync(path.join(__dirname,'runtime',r.path),'utf8');
  assert.equal(edits[r.path]?transform(current,edits[r.path],true):current,original,r.path);
 }
 const helper=fs.readFileSync(__dirname+'/runtime/tests/browser-support.cjs','utf8');
 const original=fs.readFileSync(__dirname+'/original/tests/browser-support.cjs','utf8');
 assert.equal((helper.match(/\bawait\b/g)||[]).length,(original.match(/\bawait\b/g)||[]).length);
});
test('original failure snapshot deadline and primary survive nonresponding evaluate',async()=>{
 const {exportDiagnosticError}=require('./runtime/tests/export-diagnostics.cjs');
 const primary=Error('synthetic primary'),start=performance.now();const error=await exportDiagnosticError({evaluate:()=>new Promise(()=>{})},primary,{label:'probe',selector:'x',lastPhase:'before-confirm'});
 assert.equal(error.cause,primary);assert.match(error.message,/synthetic primary/);assert.match(error.message,/Snapshot diagnostique indisponible/);
 assert(performance.now()-start>=900&&performance.now()-start<2500);
});
test('existing confirm look and click order are identical; observer errors cannot replace click rejection',async()=>{
 const primary=Error('synthetic click rejection');
 function helper(file){
  const module={exports:{}};
  const mockRequire=name=>name==='playwright'?{}:name==='./destinations-probe.cjs'?require('./runtime/tests/destinations-probe.cjs'):require(name);
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,require:mockRequire,__dirname:path.dirname(file),process,setTimeout,console});
  return module.exports;
 }
 async function run(file,reject){
  const actions=[],page={
   evaluate(fn){actions.push('look');return Promise.resolve(vm.runInNewContext('('+fn.toString()+')()',{
    window:{__dest145:{firstOpen(){throw Error('synthetic observer error');}}},
    document:{getElementById:id=>id==='check-dialog'?{open:true}:{hidden:true}}
   }));},
   locator(selector){actions.push(selector);return {async click(){actions.push('click');if(reject)throw primary;}}}
  };
  const call=helper(file).confirmChecks(page,new Promise(()=>{}));
  if(reject)await assert.rejects(call,error=>error===primary);else await call;
  return actions;
 }
 for(const reject of [false,true])assert.deepEqual(
  await run(__dirname+'/runtime/tests/browser-support.cjs',reject),
  await run(__dirname+'/original/tests/browser-support.cjs',reject)
 );
});
test('string truncation and stale frame URL remain explicit in serialized evidence',()=>{
 const h=documentHarness();h.install();h.nodes['check-confirm'].id='x'.repeat(2048);h.fire('click');
 assert.equal(h.rows.at(-1).target.id.length,1024);assert(h.rows.at(-1).metrics.stringTruncations>0);
 const {page,source}=fakeSource(),r=createRecorder(page,1);r.receive(source,h.rows.at(-1));
 const row=JSON.parse(JSON.stringify(r.record)).rows[0];
 assert.equal(row.data.documentURL,'blob:null/document');assert.equal(row.frame.urlAtReceipt,'blob:null/current');
});
test('exact Chromium filter selects one of four registered tests, retaining nine names and three exports',()=>{
 const registered=[],fakeTest=(name,callback)=>registered.push({name,callback});fakeTest.after=()=>{};
 const module={exports:{}};
 const source=fs.readFileSync(__dirname+'/runtime/tests/export-names-browser.test.cjs','utf8');
 vm.runInNewContext(source+'\nmodule.exports={cases,longNames,selectors};',{
  module,process,require:name=>name==='node:test'?fakeTest:{},Date,Buffer
 });
 const pattern=/^noms des fichiers exportés, trois types d’export \(Chromium\)$/;
 assert.equal(registered.length,4);assert.equal(registered.filter(x=>pattern.test(x.name)).length,1);
 assert.equal(module.exports.cases.length+module.exports.longNames.length,9);
 assert.equal(module.exports.selectors.length,3);assert.equal(module.exports.cases[3].name,'  ..Rentrée--');
});
