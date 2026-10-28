import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {Firefox} from '../tests/firefox-support.mjs';
import collectorReceipts from './collector_receipt.cjs';
const {newCollection, beginCollection, finishCollection, collectionFailure}=collectorReceipts;

export function qualifyZoom(reference, measured, requestedFactor) {
 const method='Relative DPR and CSS viewport contraction at stable outer-window and screen dimensions';
 const limits='Reference is the measured profile configured at 100%; this is not a browser-UI zoom reading, physical display attestation or accessibility qualification.';
 const fields=['width','height','outerWidth','outerHeight','dpr','screenWidth','screenHeight','visualScale'];
 const valid=value=>value&&fields.every(key=>typeof value[key]==='number'&&Number.isFinite(value[key])&&value[key]>0);
 const result={requestedFactor,reference,measured,method,limits,qualified:false,absoluteZoomVerified:false};
 if(!valid(reference)||!valid(measured)||![1,2].includes(requestedFactor))return{...result,reason:'Missing or invalid calibration/measurement'};
 const stableWindow=Math.abs(reference.outerWidth-measured.outerWidth)<=1&&Math.abs(reference.outerHeight-measured.outerHeight)<=1&&reference.screenWidth===measured.screenWidth&&reference.screenHeight===measured.screenHeight;
 const noPinch=reference.visualScale===1&&measured.visualScale===1;
 const ratios={dpr:measured.dpr/reference.dpr,width:reference.width/measured.width,height:reference.height/measured.height};
 // Two CSS pixels cover integral viewport rounding; DPR is a corroborating signal, never the sole oracle.
 const matches=Math.abs(measured.dpr-reference.dpr*requestedFactor)<=0.01&&Math.abs(reference.width-measured.width*requestedFactor)<=2&&Math.abs(reference.height-measured.height*requestedFactor)<=2;
 return{...result,ratios,stableWindow,noPinch,qualified:stableWindow&&noPinch&&matches,
  reason:!stableWindow?'Outer window or display changed':!noPinch?'Pinch zoom not excluded':!matches?'Observed scale does not match requested factor':'Relative scale supported by the measured signals'};
}

export function consumeCleanupReceipt(receipt, cleanup, resource='owned-firefox', {neverAllocated=false}={}) {
 receipt.cleanup_receipts ||= [];
 receipt.cleanup_receipts.push({resource,receipt:cleanup??null});
 if(!cleanup||typeof cleanup!=='object'||!Object.hasOwn(cleanup,'cleanup_error')||cleanup.cleanup_error===undefined){
  collectionFailure(receipt,'cleanup',new Error('Reçu de nettoyage absent ou non qualifié.'),{resource});return false;
 }
 if(cleanup.cleanup_error!==null){
  const detail=cleanup.cleanup_error;
  collectionFailure(receipt,'cleanup',Object.assign(new Error(typeof detail==='string'&&detail?detail:detail?.message||'Nettoyage incomplet.'),{code:detail?.code||'CLEANUP_INCOMPLETE'}),{resource});return false;
 }
 if(cleanup.exit_observed!==true||!(cleanup.status==='closed'||(neverAllocated&&cleanup.status==='not-started'&&cleanup.child_pid===null))){
  collectionFailure(receipt,'cleanup',new Error('Fin du processus de recette non explicitement observée.'),{resource});return false;
 }
 return true;
}

async function runRecipe() {
const root=process.cwd(),out=path.resolve(process.argv[2] || 'evidence/page-flow-firefox-'+Date.now());
const receipt=newCollection(root,{completed:false,profiles:[],cases:[],zoomChecks:[],errors:[],humanQualification:false,screenReaderExecuted:false,windowsExecuted:false});
const sql=`import sqlite3,sys,time,json
con=sqlite3.connect(sys.argv[1]);name='browser.content.full-zoom'
con.execute('INSERT OR IGNORE INTO settings (id,name) VALUES ((SELECT id FROM settings WHERE name=?),?)',(name,name))
con.execute('INSERT OR REPLACE INTO prefs (id,groupID,settingID,value,timestamp) VALUES ((SELECT prefs.id FROM prefs JOIN settings ON settings.id=prefs.settingID WHERE prefs.groupID IS NULL AND settings.name=?),NULL,(SELECT id FROM settings WHERE name=?),?,?)',(name,name,float(sys.argv[2]),int(time.time())))
con.commit();print(json.dumps(con.execute('SELECT settings.name,prefs.groupID,prefs.value,typeof(prefs.value) FROM prefs JOIN settings ON settings.id=prefs.settingID WHERE settings.name=?',(name,)).fetchall()));con.close()
`;
const hash=b=>createHash('sha256').update(b).digest('hex');
const host=http.createServer(async(req,res)=>{try{const base=path.resolve('app/distribution/web'),p=new URL(req.url,'http://127.0.0.1').pathname,file=path.resolve(base,p==='/'?'index.html':p.slice(1));assert(file.startsWith(base+path.sep));const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':'application/json'});res.end(bytes)}catch{res.writeHead(404);res.end()}});
let firefox;
async function stopFirefox(){
 try{return consumeCleanupReceipt(receipt,await firefox.stop(),'owned-firefox',{neverAllocated:firefox.allocation===null})}
 catch(error){collectionFailure(receipt,'cleanup',error,{resource:'owned-firefox'});return false}
}
const surfaces=[['portable',pathToFileURL(path.resolve('app/distribution/portable.html')).href],['web',null]],zoomReferences={};
async function zoomMeasurement(){return firefox.evaluate('({width:innerWidth,height:innerHeight,outerWidth,outerHeight,dpr:devicePixelRatio,screenWidth:screen.width,screenHeight:screen.height,visualScale:visualViewport?.scale??null})')}
async function child() {
 const src=await firefox.evaluate('document.getElementById("preview").src');
 for(let attempt=0;attempt<100;attempt++){
  const tree=await firefox.call('browsingContext.getTree',{root:firefox.context}),frame=tree.contexts[0].children?.find(f=>f.url.split('#')[0]===src.split('#')[0]);
  if(frame){try{const r=await firefox.call('script.evaluate',{target:{context:frame.context},expression:'JSON.stringify({ready:document.readyState==="complete",scroll:document.documentElement.scrollHeight,client:document.documentElement.clientHeight,width:innerWidth,last:[...document.body.children].filter(e=>e.tagName!=="SCRIPT").at(-1)?.getBoundingClientRect().bottom})',awaitPromise:true});if(r.type==='success'){const value=JSON.parse(r.result.value);if(value.ready&&value.scroll<=value.client&&value.last<=value.client)return{context:frame.context,...value}}}catch{}}
  await new Promise(resolve=>setTimeout(resolve,30));
 }
 throw Error('Aperçu encore défilant ou document absent : '+src);
}
async function key(value){await firefox.call('input.performActions',{context:firefox.context,actions:[{type:'key',id:'keyboard',actions:[{type:'keyDown',value},{type:'keyUp',value}]}]})}
async function dimensions(){return await firefox.evaluate(`(()=>{const box=e=>({client:e.clientHeight,scroll:e.scrollHeight,height:e.getBoundingClientRect().height,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom}),select=document.getElementById('catalogue');return{viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,outerWidth,outerHeight,screenWidth:screen.width,screenHeight:screen.height,visualScale:visualViewport?.scale??null},list:box(document.getElementById('block-list')),catalogue:{...box(select),size:select.size,count:select.options.length,groups:select.querySelectorAll('optgroup').length,value:select.value,last:box(select.options[select.options.length-1])},text:box(document.getElementById('field-f0')),json:box(document.getElementById('json-input')),focus:document.activeElement.id,selection:[document.getElementById('field-f0').selectionStart,document.getElementById('field-f0').selectionEnd],pageWidth:document.documentElement.scrollWidth}})()`)}
try {
 await fs.mkdir(out,{recursive:true});const preexisting=await fs.readdir(out);
 await beginCollection(out,'recu.json',receipt);assert.equal(preexisting.length,0,'Répertoire de recette non vide : aucune allocation');
 const files=(await fs.readdir('app/source')).map(f=>'app/source/'+f).concat(['scripts/build_app.py','scripts/recipe_page_flow_firefox.mjs','scripts/collector_receipt.cjs','tests/firefox-support.mjs','app/distribution/portable.html','app/distribution/web/index.html','app/distribution/web/sw.js','app/distribution/snum.html']);
 receipt.sourceSha256=Object.fromEntries(await Promise.all(files.map(async f=>[f,hash(await fs.readFile(f))])));
 await fs.copyFile(new URL(import.meta.url),path.join(out,'collecteur.mjs'));
 await new Promise(resolve=>host.listen(0,'127.0.0.1',resolve));
 surfaces[1][1]='http://127.0.0.1:'+host.address().port+'/';
 for(const factor of [1,2]) {
  firefox=new Firefox(path.join(out,'zoom-'+factor));
  await firefox.start();await firefox.navigate(pathToFileURL(path.resolve('app/distribution/portable.html')).href);if(!await stopFirefox())throw Error('Nettoyage Firefox incomplet : aucune nouvelle allocation');
  await fs.writeFile(path.join(firefox.profile,'user.js'),'user_pref("browser.zoom.full",true);\nuser_pref("accessibility.tabfocus",7);\n');
  const setting=JSON.parse(execFileSync('python3',['-c',sql,path.join(firefox.profile,'content-prefs.sqlite'),String(factor)],{encoding:'utf8'}));
  await firefox.start();receipt.profiles.push({factor,requestedFactor:factor,setting,browser:firefox.version});
  // Calibrate both origins before deliberate viewport resizing in the 100% cases.
  for(const[surface,url]of surfaces){
   await firefox.navigate(url);const measured=await zoomMeasurement();
   if(factor===1)zoomReferences[surface]=measured;
   const zoom=qualifyZoom(zoomReferences[surface],measured,factor);receipt.zoomChecks.push({surface,...zoom});
   assert(zoom.qualified,'Zoom non qualifié : '+JSON.stringify(zoom));
  }
  for(const[surface,url]of surfaces) {
   await firefox.navigate(url);await firefox.click('[data-action=resume-document]');
   const packet=await firefox.evaluate(`JSON.stringify(MailBuilder.Model.create('Parcours sans barres',MailBuilder.catalog.components.map(c=>c.id)))`),file=path.join(out,surface+'-'+factor+'.json');
   await fs.writeFile(file,packet);await firefox.details('Fichiers et récupération');await firefox.files('#project-input',file);await firefox.wait(`document.getElementById('notice').textContent.includes('Import ajouté')`);
   const block=await firefox.evaluate(`MailBuilder.doc().blocks.find(b=>b.component==='mail-19').id`);
   await firefox.click('[data-select="'+block+'"]');
   const long=Array.from({length:35},(_,i)=>'Ligne '+i+' — contenu de recette sans barre interne.').join('\n');
   await firefox.field('#field-f0',long);await firefox.wait(`document.getElementById('save-state').textContent==='Bibliothèque sauvegardée dans ce navigateur.'`);
   await firefox.details('Ajouter un composant');await firefox.details('Importer du JSON');await firefox.field('#json-input',packet);
   for(const width of factor===1?[390,1024,1280]:[null]) {
    if(width)await firefox.call('browsingContext.setViewport',{context:firefox.context,viewport:{width,height:900}});
    await firefox.evaluate('document.fonts.ready.then(()=>true)');
    await firefox.wait(`(()=>{const e=document.getElementById('field-f0');return e.clientHeight>=e.scrollHeight-1})()`);
    const preview=await child(),data=await dimensions();
    const zoom=factor===2?qualifyZoom(zoomReferences[surface],data.viewport,factor):{requestedFactor:factor,method:'Reference profile, viewport deliberately resized',absoluteZoomVerified:false};
    if(factor===2){receipt.zoomChecks.push({surface,phase:'case',...zoom});assert(zoom.qualified,'Zoom du cas non qualifié : '+JSON.stringify(zoom));}
    assert(data.list.client>=data.list.scroll-1);assert(data.catalogue.client>=data.catalogue.scroll-1);assert.equal(data.catalogue.size,data.viewport.width<=575?1:61);assert.equal(data.catalogue.count,52);assert.equal(data.catalogue.groups,9);
    assert(data.text.client>=data.text.scroll-1&&data.text.height>500);assert(data.json.height<300&&data.json.scroll>data.json.client);
    assert(data.pageWidth<=data.viewport.width+1);
    const name=surface+'-'+factor+'-'+(width||'natif'),artifact=path.join(out,name+'.json');
    await fs.writeFile(artifact,JSON.stringify({surface,factor,requestedFactor:factor,zoom,data,preview},null,2)+'\n');receipt.cases.push({surface,factor,requestedFactor:factor,zoom,width:data.viewport.width,dpr:data.viewport.dpr,file:path.relative(root,artifact),sha256:hash(await fs.readFile(artifact))});
   }
   await firefox.evaluate('document.getElementById("catalogue").focus()');
   for(let i=0;i<52;i++)await key('\uE015');
   const navigation=await dimensions();assert.equal(navigation.catalogue.value,'mail-51');assert(navigation.catalogue.last.top>=0&&navigation.catalogue.last.bottom<=navigation.viewport.height,JSON.stringify(navigation.catalogue));
   const before=await firefox.evaluate('JSON.stringify(MailBuilder.doc())');
   await firefox.field('#catalogue-search','inexistant-recette-zzzz');assert.equal(await firefox.evaluate('document.getElementById("catalogue").size'),2);await firefox.field('#catalogue-search','');
   await firefox.field('#field-f0','Court');await firefox.wait(`document.getElementById('field-f0').getBoundingClientRect().height<200`);
   const large=(await child()).client;
   const smallPacket=await firefox.evaluate(`JSON.stringify(MailBuilder.Model.create('Court',[0]))`),smallFile=path.join(out,surface+'-'+factor+'-court.json');await fs.writeFile(smallFile,smallPacket);await firefox.files('#project-input',smallFile);await firefox.wait(`document.getElementById('notice').textContent.includes('Import ajouté')&&MailBuilder.doc().blocks.length===1`);
   const small=await child();assert(small.client<large/2,JSON.stringify({large,small}));
   receipt.cases.push({surface,factor,requestedFactor:factor,navigation,shrink:{large,small:small.client},preShrinkDocumentSha256:hash(before)});
  }
  assert.deepEqual(firefox.errors,[]);if(!await stopFirefox())throw Error('Nettoyage Firefox incomplet : aucune nouvelle allocation');firefox=null;
 }
 receipt.completed=true;
}catch(error){collectionFailure(receipt,'collection',error);process.exitCode=1}
finally{
 if(firefox)await stopFirefox();
 try{if(host.listening)await new Promise((resolve,reject)=>host.close(error=>error?reject(error):resolve()))}catch(error){collectionFailure(receipt,'cleanup',error,{resource:'owned-server'})}
 await finishCollection({root,output:out,filename:'recu.json',report:receipt,sources:receipt.sourceSha256});
 if(!receipt.completed)process.exitCode=1;
 console.log(JSON.stringify({run_id:receipt.run_id,completed:receipt.completed,cases:receipt.cases,errors:receipt.errors}));
}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await runRecipe();
