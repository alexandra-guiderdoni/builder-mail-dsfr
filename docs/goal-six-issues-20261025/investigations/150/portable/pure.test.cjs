'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {assertGeometry,verdict}=require('./contract.cjs');
const state=()=>({viewport:{width:1600,height:1000,scrollY:577},
 frame:{left:735,top:458,right:1375,bottom:1029,width:640,height:571},dialog:{right:1080},
 open:true,modal:true,inert:false,pointerEvents:'none',active:{id:'title'},src:'blob:null/synthetic'});
const cycles=()=>[{prior:0,before:1,modalCount:1,after:2},{prior:2,before:3,modalCount:3,after:4}];
const trace=count=>({dropped:0,childClicks:count,rows:Array.from({length:count},(_,i)=>({
 kind:'child-event-received',type:'click',isTrusted:true,event:'child-1:'+(i+1)}))});
test('HTML inline scripts parse without DOM or browser',()=>{
 for(const file of ['parent.html','child.html']) {
  const html=fs.readFileSync(__dirname+'/'+file,'utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1);new vm.Script(scripts[0][1],{filename:file});
 }
});
test('synthetic geometry satisfies exact preconditions',()=>assertGeometry(state()));
test('wrong geometry/modal/CSS/origin/focus prevents input',()=>{
 for(const patch of [{dialog:{right:1400}},{modal:false},{inert:true},{pointerEvents:'auto'},
 {active:{id:'other'}},{src:'blob:https://example.invalid/a'},{viewport:{width:1600,height:1000,scrollY:0}}])
  assert.throws(()=>assertGeometry({...state(),...patch}));
});
test('two positive cycles without routing remain limited nonreproduction',()=>{
 const result=verdict(cycles(),trace(4));assert.equal(result.routingObserved,false);
 assert.match(result.qualification,/absence does not exonerate/);
});
test('routing classified independently of application',()=>{
 const c=cycles();c[1].modalCount=4;c[1].after=5;
 assert.equal(verdict(c,trace(5)).routingObserved,true);
});
test('absent positive controls never count as absence of routing',()=>{
 const c=cycles();c[0].before=0;assert.throws(()=>verdict(c,trace(4)));
 const d=cycles();d[1].after=3;assert.throws(()=>verdict(d,trace(4)));
});
test('duplicate event, untrusted, dropped or missing rows disqualify',()=>{
 for(const variant of ['duplicate','untrusted','drop','missing']) {
  const t=trace(4);
  if(variant==='duplicate')t.rows[1].event=t.rows[0].event;
  if(variant==='untrusted')t.rows[0].isTrusted=false;
  if(variant==='drop')t.dropped=1;
  if(variant==='missing')t.rows.pop();
  assert.throws(()=>verdict(cycles(),t));
 }
});
test('runner import does not load Playwright or execute browser',()=>{
 const before=Object.keys(require.cache);require('./run.cjs');
 assert(!Object.keys(require.cache).filter(x=>!before.includes(x)).some(x=>x.includes('/node_modules/playwright')));
});
test('positive input uses native frame locator click without force or options',async()=>{
 const calls=[];
 const page={frameLocator(selector){calls.push(['frameLocator',selector]);return {
  locator(target){calls.push(['locator',target]);return {async click(...args){calls.push(['click',args])}}}
 }}};
 await require('./run.cjs').positiveControl(page);
 assert.deepEqual(calls,[['frameLocator','#preview'],['locator','#control'],['click',[]]]);
});
test('two synthetic child regions cover separate control and raw input points',()=>{
 const html=fs.readFileSync(__dirname+'/child.html','utf8');
 const box=id=>{
  const rule=html.match(new RegExp('#'+id+'\\{([^}]+)\\}'))[1];
  return Object.fromEntries([...rule.matchAll(/(left|top|width|height):(\d+)px/g)].map(m=>[m[1],Number(m[2])]));
 };
 const control=box('control'),target=box('target');
 assert.deepEqual([control.left+control.width/2,control.top+control.height/2],[528,41]);
 const local={x:1365-735,y:990-458};assert.deepEqual(local,{x:630,y:532});
 assert(local.x>target.left&&local.x<target.left+target.width&&local.y>target.top&&local.y<target.top+target.height);
 assert(control.top+control.height<target.top);
 assert.deepEqual([735+528,458+41],[1263,499]);
});
test('runner keeps one unchanged raw background gesture and two positive controls',()=>{
 const source=fs.readFileSync(__dirname+'/run.cjs','utf8');
 assert.equal(source.split('await page.mouse.click(POINT.x,POINT.y);').length-1,1);
 assert.equal(source.split('await positiveControl(page);').length-1,2);
 assert(!/mouse\.(move|down|up)|Promise\.all/.test(source));
});
