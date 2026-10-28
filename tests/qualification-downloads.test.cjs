const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {compareDownload, verifyBaseline, userDownload, hash} = require('../scripts/recipe_export_downloads.cjs');

test('comparaison binaire : accents, mêmes octets et rendu intermédiaire distinct', () => {
  const value = Buffer.from('<html>Édition — 200 %</html>');
  const result = compareDownload(value, Buffer.from(value), Buffer.from('<html>Aperçu</html>'));
  assert.equal(result.identical, true); assert.equal(result.transformationWitness, true);
  assert.equal(result.downloaded.bytes, value.length); assert.equal(result.downloaded.sha256, hash(value));
  assert.equal(result.expected.kind, 'collected-export-html'); assert.equal(result.downloaded.kind, 'user-action-download');
});
test('témoin négatif : un octet supplémentaire refuse la correspondance', () => {
  const a = Buffer.from('export'); const result = compareDownload(a, Buffer.from('export\n'), a);
  assert.equal(result.identical, false); assert.equal(result.transformationWitness, false);
});
test('un rendu aperçu ne peut pas être étiqueté export identique', () => {
  assert.equal(compareDownload(Buffer.from('export'), Buffer.from('preview'), Buffer.from('preview')).identical, false);
  assert.throws(() => compareDownload('export', Buffer.from('export'), Buffer.from('preview')), /binaires/);
});
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'builder-qualification-download-'));
  t.after(() => fs.rm(directory, {recursive:true,force:true}));
  const root = path.join(directory, 'candidate'), baseline = path.join(directory, 'baseline');
  await fs.mkdir(root); await fs.mkdir(path.join(baseline,'exports'), {recursive:true});
  await fs.writeFile(path.join(root,'source.js'), 'fixed source');
  const receipt = {completed:true,collection_status:'completed',run_id:'test-baseline',git_parent:'test-git',
    measuredFilesSha256:{'source.js':hash(Buffer.from('fixed source'))},errors:[],collection_errors:[],proof_errors:[],cleanup_errors:[]};
  const items = [{id:'01',name:'Builder',blocks:['mail-02'],artifactKind:'download-html',renderer:'Render.exportHtml',sha256:hash(Buffer.from('builder export'))},
    {id:'10',name:'SNUM',surface:'snum',blocks:['mail-19'],artifactKind:'download-html',renderer:'Render.exportHtml',sha256:hash(Buffer.from('snum export'))}];
  await fs.writeFile(path.join(baseline,'browser.json'), JSON.stringify(receipt));
  await fs.writeFile(path.join(baseline,'exports/index.json'), JSON.stringify(items));
  await fs.writeFile(path.join(baseline,'exports/01.html'), 'builder export'); await fs.writeFile(path.join(baseline,'exports/10.html'), 'snum export');
  return {root,baseline,receipt,items};
}
test('référence complète builder/SNUM et sources exactes acceptées', async t => {
  const f = await fixture(t), result = await verifyBaseline(f.root,f.baseline);
  assert.equal(result.items.length,2); assert.equal(result.receipt.run_id,'test-baseline'); assert.match(result.indexSha256,/^[0-9a-f]{64}$/);
});
test('référence incomplète refusée avant toute allocation', async t => {
  const f = await fixture(t); f.receipt.completed=false;
  await fs.writeFile(path.join(f.baseline,'browser.json'),JSON.stringify(f.receipt));
  await assert.rejects(verifyBaseline(f.root,f.baseline),/incomplète/);
});
test('source modifiée refuse la référence', async t => {
  const f = await fixture(t); await fs.writeFile(path.join(f.root,'source.js'),'changed');
  await assert.rejects(verifyBaseline(f.root,f.baseline),/source différente/);
});
test('fichier export modifié refuse la référence', async t => {
  const f = await fixture(t); await fs.appendFile(path.join(f.baseline,'exports/01.html'),'!');
  await assert.rejects(verifyBaseline(f.root,f.baseline),/Empreinte/);
});
test('rendu intermédiaire mal étiqueté refusé', async t => {
  const f = await fixture(t); f.items[0].renderer='Render.html';
  await fs.writeFile(path.join(f.baseline,'exports/index.json'),JSON.stringify(f.items));
  await assert.rejects(verifyBaseline(f.root,f.baseline),/non qualifié/);
});
test('source hors candidat refusée et inventaire SNUM obligatoire', async t => {
  const f = await fixture(t); f.receipt.measuredFilesSha256={'../outside':hash(Buffer.from('irrelevant'))};
  await fs.writeFile(path.join(f.baseline,'browser.json'),JSON.stringify(f.receipt));
  await assert.rejects(verifyBaseline(f.root,f.baseline),/hors du candidat/);
  f.receipt.measuredFilesSha256={'source.js':hash(Buffer.from('fixed source'))};
  await fs.writeFile(path.join(f.baseline,'browser.json'),JSON.stringify(f.receipt));
  await fs.writeFile(path.join(f.baseline,'exports/index.json'),JSON.stringify(f.items.slice(0,1)));
  await assert.rejects(verifyBaseline(f.root,f.baseline),/Builder et SNUM/);
});
function fakePage({confirmation=false,failure=null}={}) {
  const trace=[]; let resolveDownload;
  const download={saveAs:async name=>trace.push(['saveAs',name]),failure:async()=>failure,suggestedFilename:()=> 'actual.html',url:()=> 'blob:real-action'};
  return {trace,page:{waitForEvent(name){trace.push(['wait',name]);return new Promise(resolve=>{resolveDownload=()=>resolve(download)})},
    locator(selector){return{focus:async()=>trace.push(['focus',selector]),evaluate:async()=>confirmation}},
    keyboard:{press:async key=>{trace.push(['key',key]); if(!confirmation||trace.filter(x=>x[0]==='key').length===2)resolveDownload()}},
    waitForFunction:async()=>trace.push(['wait-dialog-or-notice'])}};
}
test('la collecte attend le download avant le vrai geste clavier, puis sauvegarde', async()=>{
  const {page,trace}=fakePage(); const result=await userDownload(page,'#export-html','owned/10.html');
  assert.deepEqual(trace,[['wait','download'],['focus','#export-html'],['key','Enter'],['saveAs','owned/10.html']]);
  assert.equal(result.suggestedFilename,'actual.html'); assert.equal(result.action,'focus-and-Enter');
});
test('confirmation : deux gestes clavier et téléchargement non remplacé', async()=>{
  const {page,trace}=fakePage({confirmation:true}); await userDownload(page,'[data-action=export-mail]','owned/01.html',true);
  assert.deepEqual(trace,[['wait','download'],['focus','[data-action=export-mail]'],['key','Enter'],['wait-dialog-or-notice'],['focus','#check-confirm'],['key','Enter'],['saveAs','owned/01.html']]);
});
test('échec téléchargement conservé',async()=>{
  const {page}=fakePage({failure:'cancelled'}); await assert.rejects(userDownload(page,'#export-html','owned/10.html'),/cancelled/);
});
test('CLI sans --execute refuse sans dépendance ou allocation navigateur',()=>{
  const child=spawnSync(process.execPath,[path.resolve(__dirname,'../scripts/recipe_export_downloads.cjs')],{encoding:'utf8'});
  assert.equal(child.status,2); assert.match(child.stderr,/Usage explicite/); assert.equal(child.stdout,'');
});
