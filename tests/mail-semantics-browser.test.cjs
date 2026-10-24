const test=require('node:test');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {root,evidence,open,chromium,fs,assert}=require('./browser-support.cjs');
const output=path.join(evidence,'mail-semantics');
const digest=value=>createHash('sha256').update(value).digest('hex');
const outline=page=>page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(nodes=>nodes.map(e=>({level:Number(e.tagName[1]),text:e.textContent.trim()})));

test('les titres natifs préservent le visuel canonique des 52 composants en clair, sombre et mobile',async()=>{
 const browser=await chromium.launch();
 try {
  const {page,context}=await open(browser),lib=JSON.parse(await fs.readFile(path.join(root,'app/distribution/qualification.courriels.json'),'utf8'));
  const pairs=await page.evaluate(lib=>lib.documents.map(doc=>{
   if(doc.blocks.some(b=>b.source))throw Error('La référence visuelle doit utiliser les sources canoniques sans ajout');
   const current=MailBuilder.Render.html(doc),canonical=doc.blocks.map(b=>{
    if(b.component==='mail-00')return '';// #41 : le pré-en-tête masqué n'a aucune emprise visuelle
    const c=MailBuilder.Model.component(b.component),types=new Map(c.fields.map(f=>[f.key,f.type]));
    return c.template.replace(/\{\{(f\d+)\}\}/g,(_,key)=>{const text=MailBuilder.Render.escape(b.values[key]);return types.get(key)==='text'?text.replace(/\n/g,'<br>'):text;});
   }).join('\n');
   return {name:doc.name,blocks:doc.blocks.map(b=>b.component),before:current.replace(/(<body[^>]*>)[\s\S]*(<\/body>)/,(_,start,end)=>start+canonical+end),after:current};
  }),lib);
  const rendered=await context.newPage(),observations=[];
  for(const scheme of ['light','dark'])for(const width of [1024,600,390])for(const [index,pair] of pairs.entries()){
   await rendered.setViewportSize({width,height:900});await rendered.emulateMedia({colorScheme:scheme});
   const images=[];
   for(const version of ['before','after']){
    await rendered.setContent(pair[version]);await rendered.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
    images.push(await rendered.screenshot({fullPage:true}));
   }
   const item={family:pair.name,blocks:pair.blocks,scheme,width,before:digest(images[0]),after:digest(images[1]),pixelEquivalent:images[0].equals(images[1])};observations.push(item);
   if(!item.pixelEquivalent){await fs.mkdir(output,{recursive:true});for(const [i,buffer] of images.entries())await fs.writeFile(path.join(output,`difference-${index}-${scheme}-${width}-${i}.png`),buffer);}
  }
  await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'visuel.json'),JSON.stringify({browser:browser.version(),method:'Comparaison des captures PNG dans le même moteur ; HTML canonique contre rendu adapté',observations},null,2));
  assert(observations.every(x=>x.pixelEquivalent),JSON.stringify(observations.filter(x=>!x.pixelEquivalent)));
 }finally{await browser.close();}
});

test('aperçu, export et presse-papiers conservent les niveaux natifs et le lien du titre',async()=>{
 const browser=await chromium.launch();
 try{
  const {page,context}=await open(browser,{permissions:['clipboard-read','clipboard-write']});
  await page.evaluate(()=>{const A=MailBuilder,doc=A.Model.create('Titres copiés',[5,12,15,25,25,31,46]);doc.blocks[5].values.f3='https://exemple.invalid/dossier';A.library.documents.find(d=>d.id===A.library.activeId).blocks=doc.blocks;A.UI.refresh();});
  const frame=page.frameLocator('#preview');await frame.locator('h1').waitFor();
  const expected=await frame.locator('h1,h2,h3,h4,h5,h6').evaluateAll(nodes=>nodes.map(e=>({level:Number(e.tagName[1]),text:e.textContent.trim()})));
  assert.deepEqual(expected.map(h=>h.level),[1,2,3,4,4,4,2,3,3]);
  const event=page.waitForEvent('download');await page.locator('[data-action=export-mail]').focus();await page.keyboard.press('Enter');
  const downloaded=await event;await fs.mkdir(output,{recursive:true});const destination=path.join(output,'titres-exportes.html');await downloaded.saveAs(destination);
  const html=await fs.readFile(destination,'utf8');
  const exported=await context.newPage();await exported.setContent(html);assert.deepEqual(await outline(exported),expected);
  const cdp=await context.newCDPSession(exported),ax=await cdp.send('Accessibility.getFullAXTree');await cdp.detach();
  const nodes=new Map(ax.nodes.map(n=>[n.nodeId,n])),accessible=[];
  function visit(id){const n=nodes.get(id);if(!n)return;if(!n.ignored&&n.role?.value==='heading')accessible.push({level:n.properties.find(p=>p.name==='level')?.value.value,text:n.name.value.trim()});for(const child of n.childIds||[])visit(child);}
  visit(ax.nodes[0].nodeId);
  assert.deepEqual(accessible,expected);
  await page.locator('[data-action=copy]').focus();await page.keyboard.press('Enter');await page.locator('#notice').filter({hasText:'Courriel copié en HTML et texte.'}).waitFor();
  const copied=await page.evaluate(async()=>{const [item]=await navigator.clipboard.read();return (await item.getType('text/html')).text();});
  const received=await context.newPage();await received.setContent(copied);await received.locator('style,link').evaluateAll(nodes=>nodes.forEach(e=>e.remove()));
  assert.deepEqual(await outline(received),expected);
  assert.equal(await received.locator('h4 a').getAttribute('href'),'https://exemple.invalid/dossier');
  await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'sorties.json'),JSON.stringify({nativeHeadings:true,download:{name:downloaded.suggestedFilename(),sha256:digest(html)},expected,accessibleTree:accessible,copied:await outline(received),screenReaderExecuted:false,mailClientsVerified:false},null,2));
 }finally{await browser.close();}
});
