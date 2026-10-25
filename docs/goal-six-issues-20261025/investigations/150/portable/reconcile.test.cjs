'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verdict}=require(process.env.CONTRACT_MODULE||'./contract.cjs');
const cycles=positive=>[{prior:0,before:1,modalCount:1,after:2},
 {prior:2,before:3,modalCount:positive?4:3,after:positive?5:4}];
const trace=count=>({dropped:0,childClicks:count,rows:Array.from({length:count},(_,i)=>({
 kind:'child-event-received',type:'click',isTrusted:true,event:'child-1:'+i}))});
test('reject positive child5 versus parent4 and four click rows',()=>{
 assert.throws(()=>verdict(cycles(true),trace(4)),/child\/parent final count agreement/);
});
test('reject negative child4 versus parent0 and zero click rows',()=>{
 assert.throws(()=>verdict(cycles(false),trace(0)),/child\/parent final count agreement/);
});
test('coherent positive child5 parent5 rows5 stays accepted',()=>{
 assert.equal(verdict(cycles(true),trace(5)).routingObserved,true);
});
test('coherent negative child4 parent4 rows4 stays accepted',()=>{
 assert.equal(verdict(cycles(false),trace(4)).routingObserved,false);
});
