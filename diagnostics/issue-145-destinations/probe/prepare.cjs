'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=__dirname,hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const testEdits=[
 ["const test = require('node:test');", "const test = require('node:test');\nconst {attachDestinations, markDestination, destinationError, flushDestinations} = require('./destinations-probe.cjs');\ntest.after(() => flushDestinations());"],
 ["recordExportPhase(page, value, selector);", "recordExportPhase(page, value, selector); markDestination(page, value, {selector, label});"],
 ["await attachExportDiagnostics(p); await p.clock.setFixedTime(FIXED);", "await attachExportDiagnostics(p); await attachDestinations(p); await p.clock.setFixedTime(FIXED);"],
 ["throw await exportDiagnosticError(page, error, {label, selector, lastPhase: phase});", "destinationError(page, error, 'suggested');\n    throw await exportDiagnosticError(page, error, {label, selector, lastPhase: phase});"],
 ["} catch (error) { await context.close(); throw error; }", "} catch (error) { destinationError(page, error, 'exportNames'); await context.close(); throw error; }"]
];
const oldLook="const look = () => page.evaluate(() => ({open: document.getElementById('check-dialog')?.open === true, error: document.getElementById('error')?.hidden === false ? document.getElementById('error').textContent.trim() : ''}));";
const newLook="const look = () => page.evaluate(() => { try { window.__dest145?.firstOpen(); } catch {} return {open: document.getElementById('check-dialog')?.open === true, error: document.getElementById('error')?.hidden === false ? document.getElementById('error').textContent.trim() : ''}; });";
const helperEdits=[
 ["const path = require('node:path');", "const path = require('node:path');\nconst {markDestination, destinationError} = require('./destinations-probe.cjs');"],
 [oldLook,newLook],
 ["if (seen.open) { await page.locator('#check-confirm').click(); return; }", "if (seen.open) {\n      markDestination(page, 'confirm-click-before');\n      try { await page.locator('#check-confirm').click(); markDestination(page, 'confirm-click-return'); }\n      catch (error) { destinationError(page, error, 'confirm-click'); throw error; }\n      return;\n    }"]
];
const edits={'tests/export-names-browser.test.cjs':testEdits,'tests/browser-support.cjs':helperEdits};
function transform(source,list,inverse=false){
 for(const [a,b] of (inverse?[...list].reverse():list)){
   const from=inverse?b:a,to=inverse?a:b;assert(source.includes(from),'missing exact seam');source=source.split(from).join(to);
 }return source;
}
function prepare(){
 const records=JSON.parse(fs.readFileSync(path.join(root,'INPUTS.json'))),proof=[];
 for(const record of records){
  const original=fs.readFileSync(path.join(root,'original',record.path));assert.equal(hash(original),record.sha256);
  const list=edits[record.path];const output=list?Buffer.from(transform(original.toString(),list)):original;
  if(list)assert.equal(transform(output.toString(),list,true),original.toString());
  fs.writeFileSync(path.join(root,'runtime',record.path),output);
  proof.push({path:record.path,originalSHA256:record.sha256,generatedSHA256:hash(output),inverseExact:!!list,unchanged:!list});
 }
 fs.writeFileSync(path.join(root,'PRESERVATION.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}
if(require.main===module)prepare();
module.exports={edits,transform};
