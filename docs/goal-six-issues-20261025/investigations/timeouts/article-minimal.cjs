const path=require('node:path'),fs=require('node:fs/promises');
const variant=process.argv[2]||'historical', count=Number(process.argv[3]||20);
const {chromium,open,expand,saved,click,pageState}=require('./'+variant+'/tests/browser-support.cjs');
(async()=>{const browser=await chromium.launch();const results=[];try{
 for(let run=0;run<count;run++){
 const {page,context,observations}=await open(browser,{offline:true});
 const fixture=await page.evaluate(()=>{const doc=MailBuilder.Model.create('Lettre de recette',[31,50]),[article,footer]=doc.blocks;Object.assign(article.values,{f0:'',f1:'',f2:'',f3:'https://example.invalid/article',f4:'Un article sans illustration',f5:'Le détail utile de cet article',f6:''});Object.assign(footer.values,{f0:'Une question sur cette lettre ?',f1:'mailto:abonnement@example.invalid?subject=Inscription',f2:'S’abonner'});footer.additionalLinks=[{url:'https://example.invalid/desabonnement',label:'Se désabonner'},{url:'mailto:contact@example.invalid',label:'Nous contacter'}];return doc;});
 await expand(page,'Fichiers et récupération');await page.locator('#project-input').setInputFiles({name:'lettre-native.courriel.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await saved(page);
 await page.frameLocator('#preview').locator('a').filter({hasText:'Un article sans illustration'}).waitFor();
 const footer=await page.evaluate(()=>MailBuilder.doc().blocks[1].id);await click(page,`[data-select="${footer}"]`);
 const frames=[];page.on('framenavigated',f=>{if(f!==page.mainFrame())frames.push({kind:'navigated',url:f.url(),at:Date.now()});});page.on('framedetached',f=>{if(f!==page.mainFrame())frames.push({kind:'detached',url:f.url(),at:Date.now()});});
 await page.evaluate(()=>{const f=document.getElementById('preview');window.articleProbe=[];new MutationObserver(()=>articleProbe.push({kind:'src',src:f.src,at:performance.now()})).observe(f,{attributes:true,attributeFilter:['src']});f.addEventListener('load',()=>articleProbe.push({kind:'load',src:f.src,at:performance.now()}));});
 await click(page,'[data-block-action=remove-footer-link][data-footer-link-index="1"]');await saved(page);
 await click(page,'[data-block-action=remove-footer-link][data-footer-link-index="0"]');await saved(page);
 await click(page,'[data-block-action=add-footer-link]');await saved(page);
 let error=null;await page.frameLocator('#preview').locator('a:not([href])').filter({hasText:'Intitulé du lien à renseigner'}).waitFor({timeout:1200}).catch(e=>error=e.message);
 const frame=await page.locator('#preview').contentFrame();
 const entry={run,status:error?'timeout':'pass',error,state:await pageState(page),outer:await page.evaluate(()=>({src:document.getElementById('preview').src,selected:MailBuilder.selected,doc:MailBuilder.doc(),events:articleProbe})),inner:await frame.locator('body').evaluate(el=>({url:location.href,ready:document.readyState,links:[...el.querySelectorAll('a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href')}))})),frames,errors:observations.errors};results.push(entry);await context.close();
 }
 await fs.writeFile(path.join(__dirname,`article-minimal-${variant}.json`),JSON.stringify({variant,count,timeout:1200,injection:false,results},null,2));console.log(JSON.stringify({variant,pass:results.filter(x=>x.status==='pass').length,fail:results.filter(x=>x.status==='timeout').length}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
