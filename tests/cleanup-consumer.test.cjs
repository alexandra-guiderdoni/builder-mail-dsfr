const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {pathToFileURL} = require('node:url');
const invalid = [undefined, {}, {cleanup_error: undefined}, {cleanup_error: false}, {cleanup_error: ''},
 {cleanup_error: null, status: 'unknown', exit_observed: false},
 {cleanup_error: null, status: 'closed', exit_observed: false},
 {cleanup_error: null, status: 'error', exit_observed: true}];
const valid = [{cleanup_error: null, status: 'closed', exit_observed: true}, {cleanup_error: null, status: 'not-started', exit_observed: true, child_pid: null}];
test('page-flow : seul un reçu explicite de fin observée est accepté', async () => {
 const {consumeCleanupReceipt} = await import(pathToFileURL(path.resolve(__dirname,'../scripts/recipe_page_flow_firefox.mjs')).href);
 for(const value of invalid){const report={errors:[],cleanup_errors:[],collection_errors:[],proof_errors:[]};assert.equal(consumeCleanupReceipt(report,value),false,JSON.stringify(value));assert.equal(report.cleanup_errors.length,1);}
 for(const value of valid){const report={cleanup_errors:[]};assert.equal(consumeCleanupReceipt(report,value,'owned-firefox',{neverAllocated:true}),true);assert.equal(report.cleanup_errors.length,0);}
 const report={errors:[],cleanup_errors:[]};assert.equal(consumeCleanupReceipt(report,valid[1]),false,'not-started seul ne prouve pas absence allocation');
});
test('recipe_firefox : une reprise est refusée sans fin explicitement observée', async () => {
 const source=fs.readFileSync(path.resolve(__dirname,'../scripts/recipe_firefox.mjs'),'utf8');
 const body=source.slice(source.indexOf('const cleanupReceipt = '),source.indexOf('const saved = '));
 for(const value of [...invalid,...valid]){
  const report={},process={}; const context={report,process,firefox:{async stop(){return value}}};
  const action=vm.runInNewContext('(async()=>{'+body+'return stopped();})()',context);
  if(value?.status==='closed'&&valid.includes(value)){await action;assert.equal(report.cleanup_error,undefined);}
  else{await assert.rejects(action,/Fermeture Firefox non prouvée/);assert.equal(process.exitCode,1);assert.ok(report.cleanup_error);}
 }
});
