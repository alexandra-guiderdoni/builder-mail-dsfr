'use strict';
const fs=require('node:fs'),path=require('node:path');
const BINDING='__dest145Send', LIMIT=2000;
const pages=new WeakMap(), records=[];let unobservedPages=0;
const text=value=>{const s=String(value??'');return {value:s.slice(0,8192),truncated:s.length>8192};};
// Serialized in each document, including sandboxed opaque Blob documents.
function installDestinations() {
  if(window.__dest145){window.__dest145.repeatInstall();return;}
  const documentKey='d-'+performance.timeOrigin+'-'+Array.from({length:4},()=>Math.floor(Math.random()*0x100000000).toString(16).padStart(8,'0')).join('');
  let sequence=0,eventSequence=0,uid=0,firstOpen=false,sent=0,dropped=0,rejected=0,observerErrors=0,installations=1,stringTruncations=0;
  const ids=new WeakMap(),events=new WeakMap();
  const id=o=>{if(!o||typeof o!=='object')return null;if(!ids.has(o))ids.set(o,++uid);return ids.get(o);};
  const short=s=>{const value=String(s??'');if(value.length>1024)stringTruncations++;return value.slice(0,1024);};
  const target=e=>({uid:id(e),tag:e?.tagName||null,id:short(e?.id),action:short(e?.getAttribute?.('data-action')),connected:e?.isConnected===true});
  function send(kind,data={}) {
    try {
      if(sent>=512){dropped++;if(dropped!==1)return;kind='overflow';data={droppedAtLeast:1,furtherDropsUnreported:true};}
      else sent++;
      const url=String(location.href);
      const row={kind,documentKey,installation:1,sequence:++sequence,time:performance.now(),timeOrigin:performance.timeOrigin,
        documentURL:url.slice(0,2048),urlTruncated:url.length>2048,main:window===window.top,
        metrics:{sent,dropped,rejected,observerErrors,installations,stringTruncations},...data};
      // The binding has a reply internally; the observer never awaits it or drains it.
      Promise.resolve(window.__dest145Send(row)).catch(()=>{rejected++;});
    } catch {observerErrors++;}
  }
  const safe=fn=>(...args)=>{try{return fn(...args);}catch(cause){observerErrors++;send('observer-error',{message:short(cause?.message??cause)});return undefined;}};
  const eventHandler=safe(event=>{
    if(!events.has(event))events.set(event,++eventSequence);
    send('input',{eventId:events.get(event),type:event.type,trusted:event.isTrusted===true,target:target(event.target),
      active:target(document.activeElement),stamp:event.timeStamp,
      clientX:Number.isFinite(event.clientX)?event.clientX:null,clientY:Number.isFinite(event.clientY)?event.clientY:null,
      screenX:Number.isFinite(event.screenX)?event.screenX:null,screenY:Number.isFinite(event.screenY)?event.screenY:null,
      pointerId:Number.isFinite(event.pointerId)?event.pointerId:null,button:Number.isFinite(event.button)?event.button:null,
      dialog:document.getElementById('check-dialog')?.open===true});
  });
  for(const type of ['pointerdown','mousedown','pointerup','mouseup','click','focusin','focusout','submit','close','cancel','toggle'])
    document.addEventListener(type,eventHandler,{capture:true,passive:true});
  for(const type of ['focus','blur','load','pagehide'])window.addEventListener(type,safe(()=>send('window-event',{type,active:target(document.activeElement)})),{capture:false,passive:true});
  const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  window.__dest145={
    repeatInstall:safe(()=>{installations++;send('repeat-install',{listenersAdded:false});}),
    firstOpen:safe(()=>{
      const dialog=document.getElementById('check-dialog');if(firstOpen||!dialog?.open)return;firstOpen=true;
      const button=document.getElementById('check-confirm'),frame=document.getElementById('preview');
      const style=frame?getComputedStyle(frame):null;
      send('first-open-geometry',{button:target(button),buttonRect:rect(button),dialog:target(dialog),dialogRect:rect(dialog),
        open:dialog.open,modal:dialog.matches(':modal'),scrollTop:dialog.scrollTop,
        preview:target(frame),previewRect:rect(frame),previewSrc:short(frame?.src),
        previewInert:frame?.inert===true,previewInertAttribute:frame?.hasAttribute('inert')===true,
        pointerEvents:style?.pointerEvents||null,visibility:style?.visibility||null,
        viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY,dpr:devicePixelRatio},active:target(document.activeElement),
        qualification:'intrusive layout/style in existing look RPC; not a hit-test or compositor acknowledgement'});
    })
  };
  send('installation');
}

function createRecorder(page,pageIndex) {
  const record={pageIndex,rows:[],dropped:0,observerErrors:[],observerErrorDrops:0,documentLimitExceeded:0,
    transportCompleteness:'unknown: no drain/ACK; binding delivery and later rejection may be unreported',documents:[],phase:null};
  const frames=new WeakMap(),docs=new Map(),eventIds=new Map();let frameIndex=0,seq=0;
  const frameInfo=frame=>{
    if(!frame)return null;if(!frames.has(frame))frames.set(frame,{id:++frameIndex,navigations:0});
    const v=frames.get(frame),url=frame.url();return {id:v.id,navigationsAtReceipt:v.navigations,urlAtReceipt:url.slice(0,2048),urlTruncated:url.length>2048,main:frame===page.mainFrame()};
  };
  const error=(phase,e)=>{if(record.observerErrors.length<20)record.observerErrors.push({phase,message:text(e?.message??e)});else record.observerErrorDrops++;};
  const append=row=>{if(record.rows.length<LIMIT)record.rows.push({sequence:++seq,nodeNs:process.hrtime.bigint().toString(),phaseAtReceipt:record.phase,...row});else{seq++;record.dropped++;}};
  const receive=(source,payload)=>{
    try {
      if(source.page!==page||!source.frame||typeof payload?.documentKey!=='string'||!Number.isSafeInteger(payload.sequence))throw Error('invalid binding source/payload');
      const frame=frameInfo(source.frame),key=frame.id+':'+payload.documentKey;
      if(!docs.has(key)){
        if(docs.size>=64){record.documentLimitExceeded++;return;}
        const d={frameId:frame.id,documentKey:payload.documentKey,epoch:record.documents.filter(x=>x.frameId===frame.id).length+1,epochMeaning:'ordinal of first Node receipt, not navigation time',lastSequence:0,gaps:0,duplicates:0,duplicateEventIds:0,nonMonotone:0,lastMetrics:null};
        docs.set(key,d);eventIds.set(key,new Set());record.documents.push(d);
      }
      const d=docs.get(key);
      if(payload.sequence===d.lastSequence)d.duplicates++;
      else if(payload.sequence<d.lastSequence)d.nonMonotone++;
      else if(payload.sequence>d.lastSequence+1)d.gaps+=payload.sequence-d.lastSequence-1;
      d.lastSequence=Math.max(d.lastSequence,payload.sequence);d.lastMetrics=payload.metrics??null;
      if(payload.kind==='input'){
        const ids=eventIds.get(key);if(ids.has(payload.eventId))d.duplicateEventIds++;else if(ids.size<512)ids.add(payload.eventId);
      }
      append({kind:'browser',frame,documentEpoch:d.epoch,data:payload});
    }catch(e){error('binding',e);}
  };
  const navigation=(kind,frame)=>{try{frameInfo(frame);if(kind==='framenavigated')frames.get(frame).navigations++;append({kind,frame:frameInfo(frame)});}catch(e){error(kind,e);}};
  const mark=(phase,details={})=>{
    try {record.phase={phase,...details};append({kind:'node-phase'});console.error('DEST145_PHASE '+JSON.stringify({pageIndex,...record.phase}));}catch(e){error('mark',e);}
  };
  return {record,receive,navigation,mark,error,append};
}

async function attachDestinations(page) {
  if(pages.has(page))return;
  if(records.length>=16){unobservedPages++;return;} // the selected test owns at most nine pages
  const r=createRecorder(page,records.length+1);pages.set(page,r);records.push(r.record);
  try {
    for(const kind of ['frameattached','framenavigated','framedetached'])page.on(kind,frame=>r.navigation(kind,frame));
    page.on('download',()=>r.mark('download-received'));
    page.on('pageerror',e=>r.append({kind:'pageerror',message:text(e.message)}));
    page.on('close',()=>r.append({kind:'page-close'}));
    await page.exposeBinding(BINDING,r.receive);
    await page.addInitScript(installDestinations);
    r.record.installation='prepared-before-navigation';
  } catch(e){r.record.installation='failed';r.error('installation',e);}
}
function markDestination(page,phase,details={}) {try{pages.get(page)?.mark(phase,details);}catch{}}
function destinationError(page,error,where) {
  try {markDestination(page,'primary-error',{where,name:error?.name||'Error',message:text(error?.message??error),stack:text(error?.stack)});}catch{}
}
function flushDestinations() {
  try {
    const dir=path.resolve(process.env.DEST145_OUTPUT_DIR||path.join(__dirname,'..','probe-artifacts'));fs.mkdirSync(dir,{recursive:false});
    fs.writeFileSync(path.join(dir,'destinations.json'),JSON.stringify({schema:'dest145-v1',records,unobservedPages,qualification:'observer only; no cross-context order or complete transport claim'},null,2)+'\n',{flag:'wx'});
    console.error('DEST145_OUTPUT '+JSON.stringify({filename:'destinations.json',pages:records.length,unobservedPages,dropped:records.reduce((n,r)=>n+r.dropped,0)}));
  }catch(e){console.error('DEST145_OUTPUT_ERROR '+JSON.stringify({message:text(e?.message??e),observationInvalid:true}));}
}
module.exports={installDestinations,createRecorder,attachDestinations,markDestination,destinationError,flushDestinations};
