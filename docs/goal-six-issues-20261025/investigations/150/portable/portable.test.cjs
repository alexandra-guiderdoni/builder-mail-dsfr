'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,n),'utf8');
const source=read('run.cjs');
const resolution="  const MODULE=path.dirname(require.resolve('playwright/package.json'));\n";
const metadata="  result.environment={platform:process.platform,arch:process.arch,osRelease:require('node:os').release(),node:process.version,playwright:require(MODULE+'/package.json').version};\n";
test('inverse exactly reconstructs R3 outside resolution and metadata',()=>{
 assert.equal(source.split(resolution).length,2);assert.equal(source.split(metadata).length,2);
 let inverse=source.replace(resolution,'').replace(metadata,'');
 const original=read('provenance/run-r3.cjs.txt');
 const oldLine=original.split('\n').find(x=>x.startsWith('const MODULE='))+'\n';
 inverse=inverse.replace('async function positiveControl(page) {',oldLine+'async function positiveControl(page) {');
 assert.equal(inverse,original);
});
test('HTML, contract and original pure tests remain pinned',()=>{
 const records=JSON.parse(read('provenance/inputs.json')).files;
 for(const r of records.filter(x=>x.name!=='run.cjs'))assert.equal(crypto.createHash('sha256').update(read(r.name)).digest('hex'),r.sha256,r.name);
});
test('lock entries are exact and dependency closure is complete',()=>{
 const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
 assert.equal(pkg.devDependencies.playwright,'1.64.1');assert.equal(lock.lockfileVersion,3);
 assert.deepEqual(lock.packages[''].devDependencies,pkg.devDependencies);
 const entries=JSON.parse(read('provenance/upstream-lock-entries.json'));
 assert.deepEqual(Object.fromEntries(Object.entries(lock.packages).filter(([key])=>key)),entries);
 for(const value of Object.values(entries))for(const [name,version] of Object.entries(value.dependencies||{}))assert.equal(entries['node_modules/'+name].version,version);
 assert.equal(Object.keys(entries).length,2);
});
test('import neither resolves Playwright nor runs environment or filesystem probes',()=>{
 const calls=[],module={exports:{}};
 function fakeRequire(id){calls.push(id);return require(id==='./contract.cjs'?path.join(__dirname,id):id)}
 fakeRequire.resolve=()=>{throw Error('resolution at import forbidden')};fakeRequire.main={};
 vm.runInNewContext(source,{require:fakeRequire,module,console});
 assert.deepEqual(calls,['node:fs','node:path','node:url','node:assert/strict','./contract.cjs']);
 assert.equal(typeof module.exports.main,'function');
});
test('missing explicit run-once argument rejects before filesystem and resolution',async()=>{
 const module={exports:{}};
 function fakeRequire(id){if(id==='node:fs')return new Proxy({},{get(){throw Error('unexpected filesystem')}});return require(id==='./contract.cjs'?path.join(__dirname,id):id)}
 fakeRequire.resolve=()=>{throw Error('unexpected resolution')};fakeRequire.main={};
 vm.runInNewContext(source,{require:fakeRequire,module,process:{argv:['node','run.cjs']},console});
 await assert.rejects(module.exports.main(),/Future explicit execution only/);
});
test('metadata allowlist is limited and contains no hostname, username, env or paths',()=>{
 const result={},process={platform:'test-platform',arch:'test-arch',version:'vTEST'};
 const require=id=>id==='node:os'?{release:()=> 'test-release'}:{version:'1.64.1'};
 vm.runInNewContext(metadata,{result,process,require,MODULE:'unused-package'});
 assert.deepEqual(JSON.parse(JSON.stringify(result.environment)),{platform:'test-platform',arch:'test-arch',osRelease:'test-release',node:'vTEST',playwright:'1.64.1'});
});
