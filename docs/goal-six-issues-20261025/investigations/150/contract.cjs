'use strict';
const assert=require('node:assert/strict');
const POINT=Object.freeze({x:1365,y:990});
function assertGeometry(s) {
 assert.deepEqual(s.viewport,{width:1600,height:1000,scrollY:577});
 assert.deepEqual(s.frame,{left:735,top:458,right:1375,bottom:1029,width:640,height:571});
 assert(POINT.x>s.dialog.right,'point must lie right of dialog');
 assert(POINT.x>s.frame.left&&POINT.x<s.frame.right&&POINT.y>s.frame.top&&POINT.y<s.frame.bottom);
 assert(POINT.y<1000);assert(s.open&&s.modal);assert.equal(s.inert,false);
 assert.equal(s.pointerEvents,'none');assert.equal(s.active.id,'title');
 assert(s.src.startsWith('blob:null/'),'opaque blob URL required');
}
function verdict(cycles,trace) {
 assert.equal(trace.dropped,0,'trace loss invalidates observation');
 assert.equal(cycles.length,2);
 for(const c of cycles) {
  assert.equal(c.before,c.prior+1,'positive child control before modal');
  assert.equal(c.after,c.modalCount+1,'positive child control after modal');
 }
 const childClicks=trace.rows.filter(r=>r.kind==='child-event-received'&&r.type==='click');
 assert(childClicks.every(r=>r.isTrusted===true));
 assert.equal(new Set(childClicks.map(r=>r.event)).size,childClicks.length,'duplicate event IDs');
 assert.equal(childClicks.length,trace.childClicks,'trace/count agreement');
 assert.equal(cycles.at(-1).after,trace.childClicks,'child/parent final count agreement');
 return {routingObserved:cycles.some(c=>c.modalCount>c.before),
  qualification:'synthetic standalone only; absence does not exonerate application; no Chromium cause attribution'};
}
module.exports={POINT,assertGeometry,verdict};
