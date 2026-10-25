// Vrai portable + helpers intacts. Un ACK sans événement est suspect, jamais rouge avant le timeout download original.
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const root = process.env.MAIL_BUILDER_ROOT ? path.resolve(process.env.MAIL_BUILDER_ROOT) : path.resolve(__dirname, '../../../..');
const {open, expand, saved, click, confirmChecks, chromium} = require(path.join(root,'tests/browser-support.cjs'));
const {attach} = require('./trace-confirmation.cjs');
const passes = Number(process.env.PASSES || 3), scenario = process.env.SCENARIO || 'full';
assert(Number.isInteger(passes) && passes > 0 && passes <= 30);
assert(['full','emoji','ascii'].includes(scenario));
const names = ['Édition & <dossier> "suivi"','Bulletin n°3 : été / automne ?','a\\b*c|d','  ..Rentrée--','***','Eté','a'.repeat(300),'é'.repeat(300),'😀'.repeat(300)];
const selectors = ['[data-action=export-mail]','[data-action=export-document]','[data-action=export-library]'];
const arm = process.env.ARM || 'baseline';
assert(['baseline','comparator'].includes(arm));
const output = path.join(__dirname, process.env.RESULT || 'loop-full.json');
const activated = trace => trace?.rows?.some(x=>(x.kind==='click'&&x.target==='check-confirm')||x.kind==='submit');
async function snapshot(page, start) {
  const nodeBefore=Date.now(); let timer;
  // Borne du diagnostic seul ; aucune attente fonctionnelle ni délai d’input modifiés.
  const trace=await Promise.race([
    page.evaluate(start=>({rows:window.__confirmationTrace.rows.filter(x=>x.seq>start),state:window.__confirmationTrace.state(true),performanceNow:performance.now(),timeOrigin:performance.timeOrigin}),start),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Diagnostic snapshot unavailable after 1000ms')),1000);})
  ]).finally(()=>clearTimeout(timer));
  trace.clockAlignment={nodeBefore,nodeAfter:Date.now(),browserPerformanceNow:trace.performanceNow};
  return trace;
}

const results = {node:process.version,playwright:require(path.join(process.env.PLAYWRIGHT_MODULE || 'playwright','package.json')).version,source:'f3aa8324dbcd255bddafeeb2eec559e698f6065c',platform:process.platform,scenario,passes,arm,observerOnly:true,cssComparator:arm==='comparator',timeoutChanged:false,runs:[]};
(async()=>{
  for(let pass=0;pass<passes;pass++){
    const browser = await chromium.launch();
    const run = {pass,browserVersion:browser.version(),contexts:[],outside:[],phases:[]}; results.runs.push(run);
    let contextIndex=0;
    try {
      for(const name of scenario==='full'?names:[scenario==='emoji'?'😀'.repeat(300):'short']){
        const index=++contextIndex;
        const {page,context} = await open(browser,{timezoneId:'Europe/Paris'},async p=>{await attach(p,run.outside,index);await p.clock.setFixedTime(new Date('2026-10-24T22:30:00Z'));});
        // Preserve original successful-context lifetime: all nine stay open until browser.close.
        const sample={index,nameKind:name==='😀'.repeat(300)?'emoji300':name[0],nameLength:name.length,exports:[]};run.contexts.push(sample);
        await expand(page,'Fichiers et récupération');await page.locator('#document-name').fill(name);await saved(page);
        let start=0;
        for(const selector of selectors){
          const activationStart=start;
          const phase = value=>run.phases.push({contextIndex:index,selector,phase:value,wall:Date.now()});
          const event=page.waitForEvent('download');event.catch(()=>{});
          phase('before-click');await click(page,selector);phase('after-click');
          phase('before-confirm');await confirmChecks(page,event);phase('after-confirm');
          const trace=await snapshot(page,activationStart);
          start=trace.rows.at(-1)?.seq ?? start;
          const record={selector,activated:!!activated(trace),...trace};sample.exports.push(record);
          record.initialCandidate=trace.state.dialog&&!record.activated;
          // Réutiliser la promesse déjà créée, et son timeout original de 30 s.
          // Un retour d’input peut précéder la livraison DOM : aucun retry ni verdict immédiat.
          phase('await-download');let download;
          try { download=await event; phase('download-received'); }
          catch(error){
            record.downloadError={name:error.name,message:error.message,stack:error.stack};
            if(record.initialCandidate){
              try { record.finalTrace=await snapshot(page,activationStart); }
              catch(snapshotError){record.finalSnapshotError=snapshotError.message;}
              const persistent=record.finalTrace ? record.finalTrace.state.dialog&&!activated(record.finalTrace) : null;
              run.red={kind:persistent===true?'persistent-confirmation-without-DOM-activation':'download-failed-without-confirmed-persistent-signal',contextIndex:index,selector,persistent};
              if(persistent===true)await page.screenshot({path:path.join(__dirname,`red-${arm}-${scenario}-${pass}.png`),timeout:1000}).catch(cause=>{record.screenshotError=cause.message;});
            }
            throw error; // préserver le TimeoutError primaire, pas un message de snapshot
          }
          if(record.initialCandidate){
            record.transientAck=true;
            try { record.afterDownloadTrace=await snapshot(page,activationStart); start=record.afterDownloadTrace.rows.at(-1)?.seq ?? start; }
            catch(snapshotError){record.afterDownloadSnapshotError=snapshotError.message;}
          }
          // A received download cannot stand in for the mail confirmation's DOM activation.
          if(selector==='[data-action=export-mail]'){
            record.confirmationDOMObserved=!!activated(record.afterDownloadTrace||record);
            assert(record.confirmationDOMObserved, 'Mail download without observed confirmation activation');
            const inputs=run.outside.filter(row=>row.contextIndex===index);
            const confirmation=inputs.findIndex(row=>row.kind==='confirmation-dom'&&row.event==='submit');
            const delivered=inputs.findIndex(row=>row.kind==='download');
            record.confirmationReceivedBeforeDownload=confirmation>=0&&delivered>confirmation;
            // Receipt order is observational only: separate CDP sessions may reorder delivery.
          }
          const allRows=[...record.rows,...(record.afterDownloadTrace?.rows||[])];
          assert(!allRows.some(row=>row.kind==='csp-violation'), 'Unexpected CSP violation');
          for(const row of allRows)if(row.previewPointerEvents)assert.equal(row.previewPointerEvents,arm==='comparator'&&row.dialog?'none':'auto','Preview pointer CSS does not match arm/modal state');
          record.filename=download.suggestedFilename();
          assert(record.filename && !record.filename.includes('�'));
        }
      }
      run.status='green';console.log(JSON.stringify({pass,status:'green',contexts:run.contexts.length}));
    } catch(error){run.status='red';run.error={name:error.name,message:error.message,stack:error.stack};console.log(JSON.stringify({pass,status:'red',red:run.red,error:error.message}));throw error;}
    finally{await browser.close();fs.writeFileSync(output,JSON.stringify(results,null,2)+'\n');}
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
