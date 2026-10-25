// Sonde jetable : chemin réel de l’export, budget court et retard natif contrôlé.
const path=require('node:path'),fs=require('node:fs/promises'),assert=require('node:assert/strict');
const {open,expand,saved,click,confirmChecks,pageState,chromium}=require('./export-historical/tests/browser-support.cjs');
(async()=>{const browser=await chromium.launch();const results=[];try{
 for(const delay of [0,0,0,120,650,650]){
  const {page,context,observations}=await open(browser,{timezoneId:'Europe/Paris'},p=>p.clock.setFixedTime(new Date('2026-10-24T22:30:00Z')));
  await expand(page,'Fichiers et récupération');await page.locator('#document-name').fill('Édition & <dossier> "suivi"');await saved(page);
  await page.evaluate(delay=>{
   window.probeTrace=[];const form=document.getElementById('check-form'),dialog=document.getElementById('check-dialog');
   for(const type of ['click','submit','close']) document.addEventListener(type,e=>{if(e.target.closest?.('#check-dialog')||e.target.matches?.('[data-action=export-mail]'))window.probeTrace.push({type,target:e.target.id||e.target.dataset.action,at:performance.now(),open:dialog.open,focused:document.activeElement?.id});},true);
   if(delay){let held=false;form.addEventListener('submit',e=>{if(held)return;held=true;e.preventDefault();e.stopImmediatePropagation();window.probeTrace.push({type:'controlled-submit-delay',delay,at:performance.now()});setTimeout(()=>form.requestSubmit(document.getElementById('check-confirm')),delay);},true);}
  },delay);
  let downloads=0;page.on('download',()=>downloads++);const event=page.waitForEvent('download',{timeout:400});event.catch(()=>{});
  await click(page,'[data-action=export-mail]');await confirmChecks(page,event);
  const result=await event.then(x=>({status:'download',name:x.suggestedFilename()}),e=>({status:'timeout',error:e.message.split('\n')[0]}));
  Object.assign(result,{delay,timeout:400,state:await pageState(page),details:await page.evaluate(()=>({active:document.activeElement?.id,trace:probeTrace,dialog:document.getElementById('check-dialog').outerHTML})),errors:observations.errors,downloads});
  if(delay<400){assert.equal(result.status,'download');assert.equal(result.name,'Édition-&-dossier-suivi-2026-10-25.html');assert.equal(result.state.checkDialog,false);}else{assert.equal(result.status,'timeout');assert.equal(result.state.checkDialog,true);assert.equal(result.downloads,0);await page.waitForEvent('download');result.afterRelease={state:await pageState(page),downloads};assert.equal(downloads,1);}
  results.push(result);await context.close();
 }
 await fs.writeFile(path.join(__dirname,'export-loop.json'),JSON.stringify({precondition:'Retard de soumission natif contrôlé ; aucune attribution à la CI historique.',results},null,2));console.log(JSON.stringify(results.map(({delay,status,name,state,downloads,afterRelease})=>({delay,status,name,state,downloads,afterRelease})),null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
