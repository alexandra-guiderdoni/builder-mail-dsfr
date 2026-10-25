'use strict';
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');const {POINT,assertGeometry,verdict}=require('./contract.cjs');
const MODULE='/Users/alex/Claude/git-hors-workflow/builder-mail-dsfr/node_modules/playwright';
async function positiveControl(page) {
 await page.frameLocator('#preview').locator('#control').click();
}
async function main() {
 if(process.argv.length!==4||process.argv[2]!=='--run-once')throw Error('Future explicit execution only: --run-once NEW_OUTPUT_DIRECTORY');
 const out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:false,mode:0o700});
 const result={synthetic:true,cycles:[],errors:[],cleanupError:null,executed:false};let browser,page;
 try {
  assert.equal(require(MODULE+'/package.json').version,'1.64.1');
  browser=await require(MODULE).chromium.launch();result.executed=true;result.browserVersion=browser.version();
  const context=await browser.newContext({viewport:{width:1600,height:1000},colorScheme:'light',offline:true});
  page=await context.newPage();page.setDefaultTimeout(5000);
  page.on('pageerror',e=>result.errors.push({name:e.name,message:e.message}));
  await page.goto(pathToFileURL(path.join(__dirname,'parent.html')).href);
  await page.evaluate(html=>window.fixture.mount(html),fs.readFileSync(path.join(__dirname,'child.html'),'utf8'));
  await page.waitForFunction(()=>window.childReady===true);
  await page.evaluate(()=>scrollTo(0,577));
  const probe=()=>page.evaluate(()=>window.fixture.probeChild()); // explicit postMessage barrier, not sleep/retry
  let prior=(await probe()).clicks;
  for(const action of ['cancel','confirm']) {
   await positiveControl(page);const before=(await probe()).clicks;
   assert.equal(before,prior+1,'positive child control before modal');
   await page.locator('#open').focus();await page.keyboard.press('Enter');
   await page.locator('#dialog').waitFor({state:'visible'});
   const state=await page.evaluate(point=>window.fixture.snapshot(point),POINT);assertGeometry(state);
   await page.mouse.click(POINT.x,POINT.y);
   const immediate=await page.evaluate(()=>window.fixture.trace().childClicks);
   const modalCount=(await probe()).clicks; // child reports its own counter; modal stays open
   assert(await page.locator('#dialog').evaluate(e=>e.open));
   await page.keyboard.press('Tab');
   assert(await page.evaluate(()=>document.querySelector('#dialog').contains(document.activeElement)));
   if(action==='cancel')await page.keyboard.press('Escape');
   else {await page.locator('#confirm').focus();await page.keyboard.press('Enter')}
   await page.waitForFunction(()=>!document.querySelector('#dialog').open);
   await positiveControl(page);const after=(await probe()).clicks;
   result.cycles.push({action,prior,before,state,immediate,modalCount,after});prior=after;
  }
  result.trace=await page.evaluate(()=>window.fixture.trace());
  result.finding=verdict(result.cycles,result.trace);assert.equal(result.trace.confirms,1);assert.deepEqual(result.errors,[]);
 } catch(e) {result.primaryError={name:e.name,message:e.message};process.exitCode=1}
 finally {
  if(page&&!result.trace)try{result.trace=await page.evaluate(()=>window.fixture.trace())}catch(e){result.traceError=e.message}
  if(browser)try{await browser.close()}catch(e){result.cleanupError=e.message;process.exitCode=1}
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 }
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={main,positiveControl};
