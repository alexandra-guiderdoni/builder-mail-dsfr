const test=require('node:test'),path=require('node:path');
const {open,click,assert,fs,root}=require('./browser-support.cjs');
const pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const ADDRESS='https://images.example/charte.png?version=2&theme=clair';
async function setup(browser){
 const png=await fs.readFile(path.join(root,'app/assets/icon-192.png'));
 return open(browser,{},async page=>{
  await page.route('https://images.example/**',route=>route.fulfill({status:200,contentType:'image/png',body:png,headers:{'Cache-Control':'no-store'}}));
  await page.addInitScript(()=>{window.__copied=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async items=>{window.__copied.push(items);}}});});
 });
}
for(const engine of ['chromium','webkit'])test(`#192 ${engine} : deux sources, URL préservée, stockage versionné et retour local`,async()=>{
 const browser=await pw[engine].launch();try{
  const {page,observations}=await setup(browser);
  const before=await page.evaluate(()=>{const A=MailBuilder,b=A.doc().blocks[0],field=A.Model.component(b.component).fields.find(f=>f.type==='image');return{block:b.id,key:field.key,value:b.values[field.key]};});
  assert.equal(await page.locator('[data-image-source]').count(),2);
  await page.locator(`[data-image-source="${before.key}"]`).selectOption('remote');
  const input=page.locator(`[data-remote-image-url="${before.key}"]`);await input.fill(ADDRESS);await input.press('Enter');
  await page.waitForFunction(({id,key,url})=>MailBuilder.doc().blocks.find(b=>b.id===id)?.remoteImages?.[key]===url,{id:before.block,key:before.key,url:ADDRESS});
  const result=await page.evaluate(({id,key})=>{const A=MailBuilder,b=A.doc().blocks.find(b=>b.id===id),copy=A.Render.clipboardHtml(A.doc()),html=A.Render.exportHtml(A.doc()),parse=s=>[...new DOMParser().parseFromString(s,'text/html').images].map(i=>i.getAttribute('src'));return{version:A.library.version,docVersion:A.doc().version,fallback:b.values[key],copy:parse(copy),export:parse(html),weight:A.Render.weightDetails(copy,A.doc()),hasPending:A.pendingInputs};},{id:before.block,key:before.key});
  assert.equal(result.version,2);assert.equal(result.docVersion,2);assert.equal(result.fallback,before.value);assert.ok(result.copy.includes(ADDRESS));assert.ok(result.export.includes(ADDRESS));assert.equal(result.weight.hosted,1);assert.equal(result.hasPending,0);
  await page.waitForFunction(()=>document.getElementById('mail-weight').textContent.includes('poids distant non mesuré'));
  const stored=await page.evaluate(()=>MailBuilder.Storage.load());assert.equal(stored.library.version,2);
  await page.reload();await page.waitForFunction(()=>MailBuilder.ready);await click(page,'[data-action=resume-document]');
  assert.equal(await page.locator(`[data-image-source="${before.key}"]`).inputValue(),'remote');
  assert.equal(await page.locator(`[data-remote-image-url="${before.key}"]`).inputValue(),ADDRESS);
  await page.locator(`[data-image-source="${before.key}"]`).selectOption('local');
  await page.waitForFunction(()=>MailBuilder.library.version===1);
  assert.equal(await page.evaluate(key=>MailBuilder.doc().blocks[0].values[key],before.key),before.value);
  assert.equal(await page.evaluate(()=>MailBuilder.doc().blocks[0].remoteImages??null),null);
  assert.deepEqual(observations.errors,[]);
 }finally{await browser.close();}
});

test('#192 : les 24 champs offrent des commandes nommées et les deux sources',async()=>{
 const browser=await pw.chromium.launch();try{
  const {page}=await setup(browser);
  const components=await page.evaluate(()=>MailBuilder.catalog.components.map((c,i)=>({index:i,id:c.id,fields:c.fields.filter(f=>f.type==='image').map(f=>({key:f.key,label:f.label}))})).filter(c=>c.fields.length));
  let fields=0;
  for(const component of components){
   await page.evaluate(index=>MailBuilder.State.change(lib=>{lib.documents.find(d=>d.id===lib.activeId).blocks=MailBuilder.Model.create('Sources',[index]).blocks;}),component.index);
   for(const field of component.fields){
    const selector=page.getByRole('combobox',{name:'Source — '+field.label,exact:true});assert.equal(await selector.inputValue(),'local');
    assert.equal(await page.locator(`[data-image-field="${field.key}"]`).isVisible(),true);
    // selectOption exerce change ; le clavier natif nécessite une recette visible séparée.
    await selector.selectOption('remote');
    assert.equal(await selector.inputValue(),'remote');
    const input=page.getByRole('textbox',{name:'Adresse HTTPS directe — '+field.label,exact:true});assert.equal(await input.isVisible(),true);
    assert.equal(await page.getByRole('button',{name:'Appliquer l’adresse — '+field.label,exact:true}).isVisible(),true);
    await selector.selectOption('local');fields++;
   }
  }
  assert.equal(fields,24);assert.equal(components.length,17);
 }finally{await browser.close();}
});

test('#192 : URL interdite et ressource non-image conservent la source, annulation explicite',async()=>{
 const browser=await pw.chromium.launch();try{
  const {page}=await setup(browser);let requested=0;
  await page.route('https://not-image.example/**',route=>{requested++;return route.fulfill({status:200,contentType:'text/html',body:'<p>Not an image</p>'});});
  const original=await page.evaluate(()=>JSON.stringify(MailBuilder.doc()));
  await page.locator('[data-image-source="f0"]').selectOption('remote');const input=page.locator('[data-remote-image-url="f0"]');
  await input.fill('https://person:password@images.example/x.png');await input.press('Enter');
  await page.locator('#error').filter({hasText:'Identifiants interdits'}).waitFor();assert.equal(requested,0);assert.equal(await page.evaluate(()=>JSON.stringify(MailBuilder.doc())),original);
  await input.fill('https://not-image.example/failed.png');await input.press('Enter');
  await page.locator('#error').filter({hasText:'n’a pas pu être chargée'}).waitFor();assert.equal(requested,1);assert.equal(await page.evaluate(()=>JSON.stringify(MailBuilder.doc())),original);
  assert.equal(await page.evaluate(()=>MailBuilder.pendingInputs),0);
  assert.equal(await page.locator('#notice').textContent(),'');
  await page.locator('[data-image-source="f0"]').selectOption('local');assert.equal(await page.evaluate(()=>MailBuilder.drafts.size),0);assert.equal(await page.locator('#error').textContent(),'');
 }finally{await browser.close();}
});

test('#192 : vraie ancienne distribution 09eff89 refuse la version2 sans remplacer les données',async t=>{
 const browser=await pw.chromium.launch();const os=require('node:os'),zlib=require('node:zlib'),crypto=require('node:crypto');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'builder-old-192-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 try{
  const {page}=await setup(browser);const value=await page.evaluate(address=>{const A=MailBuilder,lib=A.Model.initial();lib.documents[0].blocks[0].remoteImages={f0:address};A.Model.versions(lib);return lib;},ADDRESS);
  const fixture=path.join(directory,'remote-v2.json');await fs.writeFile(fixture,JSON.stringify(value));
  const raw=zlib.gunzipSync(await fs.readFile(path.join(root,'tests/fixtures/builder-09eff89.portable.html.gz')));
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),'40435f7b32ef5b4eca5c68ad1551b6a73e65e50006cbb286cc5e2e1ae4ed03a0');
  const oldFile=path.join(directory,'old-portable.html');await fs.writeFile(oldFile,raw);
  const old=await page.context().newPage();await old.goto(require('node:url').pathToFileURL(oldFile).href);await old.waitForFunction(()=>MailBuilder.ready);
  const before=await old.evaluate(()=>JSON.stringify(MailBuilder.library));
  await old.locator('#project-input').setInputFiles(fixture);
  await old.locator('#error').filter({hasText:'Version de bibliothèque non prise en charge'}).waitFor();
  assert.equal(await old.evaluate(()=>JSON.stringify(MailBuilder.library)),before);
 }finally{await browser.close();}
});

test('#192 : aucune requête à la saisie, sans referer à l’application, résultat tardif refusé',async()=>{
 const browser=await pw.chromium.launch();try{
  const {page}=await setup(browser);const png=await fs.readFile(path.join(root,'app/assets/icon-192.png'));
  let release,entered;const arrival=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);let headers;
  await page.route('https://delayed.example/**',async route=>{headers=route.request().headers();entered();await gate;await route.fulfill({status:200,contentType:'image/png',body:png});});
  const original=await page.evaluate(()=>JSON.stringify(MailBuilder.doc()));
  await page.locator('[data-image-source="f0"]').selectOption('remote');const input=page.locator('[data-remote-image-url="f0"]');
  await input.fill('https://delayed.example/image.png');assert.equal(headers,undefined);
  await input.press('Enter');await arrival;assert.equal(headers.referer,undefined);
  await input.fill('https://images.example/another.png');release();
  await page.locator('#error').filter({hasText:'devenue obsolète'}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.stringify(MailBuilder.doc())),original);assert.equal(await input.inputValue(),'https://images.example/another.png');
  assert.equal(await page.evaluate(()=>MailBuilder.pendingInputs),0);
 }finally{await browser.close();}
});

test('#192 : hors connexion et CSP restrictive refusent une image sans modifier la composition',async()=>{
 const browser=await pw.chromium.launch();try{
  const {page,context}=await setup(browser);const original=await page.evaluate(()=>JSON.stringify(MailBuilder.doc()));
  // Hôte différent de la route mock : la coupure réseau est réelle pour cette requête.
  await context.setOffline(true);await page.locator('[data-image-source="f0"]').selectOption('remote');
  const input=page.locator('[data-remote-image-url="f0"]');await input.fill('https://offline.invalid/photo.png');await input.press('Enter');
  await page.locator('#error').filter({hasText:'hors connexion'}).waitFor();assert.equal(await page.evaluate(()=>JSON.stringify(MailBuilder.doc())),original);
  await context.setOffline(false);
  await page.evaluate(()=>{const meta=document.createElement('meta');meta.httpEquiv='Content-Security-Policy';meta.content="img-src data:";document.head.append(meta);});
  await input.fill(ADDRESS);await input.press('Enter');await page.locator('#error').filter({hasText:'politique de sécurité'}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.stringify(MailBuilder.doc())),original);
 }finally{await browser.close();}
});

test('#192 : refus du changement de source garde le sélecteur et le panneau cohérents',async()=>{
 const browser=await pw.chromium.launch();try{const {page}=await setup(browser);
  await page.evaluate(()=>MailBuilder.invalid.add('field-f2'));const selector=page.locator('[data-image-source="f0"]');await selector.selectOption('remote');
  assert.equal(await selector.inputValue(),'local');assert.equal(await page.locator('[data-image-field="f0"]').isVisible(),true);assert.equal(await page.locator('[data-remote-image-url="f0"]').isVisible(),false);
  assert.equal(await page.evaluate(()=>MailBuilder.doc().blocks[0].remoteImages??null),null);
 }finally{await browser.close();}
});

test('#192 : article avec URL et sans repli local porte un nom avec image, retrait complet possible',async()=>{
 const browser=await pw.chromium.launch();try{const {page}=await setup(browser);
  await page.evaluate(address=>MailBuilder.State.change(lib=>{const d=lib.documents.find(d=>d.id===lib.activeId),b=MailBuilder.Model.createBlock('mail-31');b.values.f0='';b.remoteImages={f0:address};d.blocks=[b];MailBuilder.selected=b.id;}),ADDRESS);
  assert.doesNotMatch(await page.locator('#block-list').textContent(),/Article sans image/);assert.match(await page.locator('[data-action=export-document]').first().getAttribute('data-action'),/export-document/);
  const selected=await page.evaluate(()=>{const A=MailBuilder;return{html:A.Render.exportHtml(A.doc()),label:A.UI.blockName(A.doc().blocks[0]),imageContents:A.Files.imageContents(A.doc())};});assert.ok(selected.html.includes('https://images.example/charte.png'));assert.doesNotMatch(selected.label,/sans image/);assert.match(selected.imageContents,/références/);
  await click(page,'[data-block-action=remove-image]');assert.equal(await page.evaluate(()=>MailBuilder.doc().blocks[0].remoteImages??null),null);assert.equal(await page.evaluate(()=>MailBuilder.doc().blocks[0].values.f0),'');assert.match(await page.locator('#block-list').textContent(),/Article sans image/);
 }finally{await browser.close();}
});
