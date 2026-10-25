// Génération locale native ; aucune connexion à une messagerie ni copie presse-papiers.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {chromium}=require(path.resolve('node_modules/playwright'));
const root=process.cwd(), out=__dirname, hash=data=>crypto.createHash('sha256').update(data).digest('hex');
(async()=>{
 const scope=['app/source','scripts','shared','package.json','package-lock.json'];
 const diff=()=>execFileSync('git',['diff','--binary','HEAD','--',...scope],{cwd:root});
 const before=diff();const check=execFileSync('python3',['scripts/build_app.py','--check'],{cwd:root,encoding:'utf8'}).trim();
 const portable=await fs.readFile(path.join(root,'app/distribution/portable.html'));
 await fs.writeFile(path.join(out,'builder-candidat.html'),portable,{flag:'wx'});await fs.writeFile(path.join(out,'candidate-sources.patch'),before,{flag:'wx'});
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext({offline:true,acceptDownloads:true});const page=await context.newPage();await page.goto('file://'+path.join(out,'builder-candidat.html'));await page.waitForFunction(()=>window.MailBuilder?.ready);
  const data=await page.evaluate(()=>{
   const A=MailBuilder,M=A.Model,R=A.Render,documents=[];
   for(const format of ['png','jpeg']){
    const label=format.toUpperCase(),canvas=document.createElement('canvas');canvas.width=480;canvas.height=240;const c=canvas.getContext('2d');
    if(format==='jpeg'){c.fillStyle='#ffffff';c.fillRect(0,0,480,240);}c.fillStyle='#000091';c.fillRect(16,16,448,208);c.fillStyle='#ffffff';c.font='bold 30px sans-serif';c.fillText('RECETTE '+label,40,72);c.fillStyle='#f6c43c';c.fillRect(40,100,88,88);c.fillStyle='#ffffff';c.beginPath();c.arc(205,144,44,0,Math.PI*2);c.fill();c.fillStyle='#ff8d7e';c.fillRect(288,100,136,88);
    const image=canvas.toDataURL('image/'+format,0.9),doc=M.create('RECETTE MESSAGERIE '+label,[0,2,5,19,27,19,40,49]);
    doc.subject='RECETTE AUTORISÉE — '+label+' — repères 01 à 05';
    doc.blocks[0].values.f0='Pré-en-tête de recette '+label+' ; ce texte ne doit pas apparaître dans le corps.';
    doc.blocks[1].values.f4='Service fictif de recette';doc.blocks[2].values.f0='01 — Début de la recette '+label;
    doc.blocks[3].values.f0='02 — Texte avant illustration. Caractères à préserver : é è à ç œ € —. Cette composition synthétique ne contient aucune donnée personnelle.';
    Object.assign(doc.blocks[4].values,{f0:image,f1:'Illustration de recette '+label+' : carré jaune, disque blanc et rectangle corail sur fond bleu.',f2:'03 — Illustration '+label+' de 480 × 240 pixels ; proportions attendues 2:1.'});
    doc.blocks[5].values.f0='04 — Texte après illustration. Remplacer uniquement RECETTE_AVANT par RECETTE_APRÈS dans le brouillon du client pour vérifier la retouche.';
    Object.assign(doc.blocks[6].values,{f0:'https://example.org/recette?format='+format,f1:'05 — Ouvrir le lien de recette '+label});
    Object.assign(doc.blocks[7].values,{f0:'Fin de la composition synthétique.',f1:'https://example.org/fin-recette',f2:'Lien de fin de recette'});
    M.document(doc);const parsed=A.Imports.parse(JSON.stringify(doc));if(parsed.type!=='document')throw new Error('Document non reconnu');
    documents.push({format,image,document:doc,html:R.exportHtml(doc),plain:R.plain(doc),clipboardReference:R.clipboardHtml(doc)});
   }
   return {applicationVersion:document.querySelector('meta[name="application-version"]').content,catalogue:A.catalog.id,documents};
  });
  const imports=[];
  for(const item of data.documents){
   const name='recette-'+item.format;
   for(const [suffix,content] of [['.json',JSON.stringify(item.document,null,2)+'\n'],['.reference-export.html',item.html],['.reference-copie.html',item.clipboardReference],['.txt',item.plain+'\n']])await fs.writeFile(path.join(out,name+suffix),content,{flag:'wx'});
   await fs.writeFile(path.join(out,'illustration-originale.'+(item.format==='jpeg'?'jpg':'png')),Buffer.from(item.image.split(',')[1],'base64'),{flag:'wx'});
   const checkContext=await browser.newContext({offline:true}),p=await checkContext.newPage();await p.goto('file://'+path.join(out,'builder-candidat.html'));await p.waitForFunction(()=>window.MailBuilder?.ready);
   await p.locator('[data-action=resume-document]').click();await p.locator('#files-summary').click();await p.locator('#project-input').setInputFiles(path.join(out,name+'.json'));
   await p.waitForFunction(name=>MailBuilder.doc().name===name&&MailBuilder.pendingInputs===0,item.document.name);
   await p.waitForFunction(()=>document.querySelector('#save-state').textContent==='Bibliothèque sauvegardée dans ce navigateur.');
   const actual=await p.evaluate(()=>MailBuilder.doc());
   const normalize=d=>({schema:d.schema,version:d.version,catalogue:d.catalogue,name:d.name,subject:d.subject,blocks:d.blocks.map(({id,...rest})=>rest)});
   if(JSON.stringify(normalize(actual))!==JSON.stringify(normalize(item.document)))throw new Error('Contenu importé différent : '+item.format);
   imports.push({format:item.format,status:'PASS',method:'Import réel du fichier JSON par #project-input dans Chromium Playwright hors ligne, profil jetable ; contenu complet comparé hors identifiants régénérés.',clipboardExecuted:false,mailClientExecuted:false});await checkContext.close();
  }
  const after=diff();if(!before.equals(after))throw new Error('Sources modifiées pendant la capture ; kit à régénérer séparément.');
  const manifest={createdAt:new Date().toISOString(),baseCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),branch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),dirtyCandidate:true,diffFile:'candidate-sources.patch',diffScope:scope,diffSha256:hash(before),distributionBuildCheck:check,applicationVersion:data.applicationVersion,catalogue:data.catalogue,portableSha256:hash(portable),generator:'generer-kit.cjs',runtime:{node:process.version,playwright:require(path.resolve('node_modules/playwright/package.json')).version,browser:browser.version(),platform:process.platform,arch:process.arch},validation:imports,limitations:['Les références sont produites par Model/Render natifs ; elles ne prouvent ni copie UI ni presse-papiers ni collage/client/réception.','Le diff couvre les entrées de génération modifiées ; les tests et les documents du chantier ne font pas partie de ce diff de candidat.','Le portable copié est figé par son SHA256 ; les reconstructions ultérieures du chantier ne mettent pas ce kit à jour.'],files:[]};
  for(const name of (await fs.readdir(out)).sort()){if(name==='manifest.json')continue;const bytes=await fs.readFile(path.join(out,name));manifest.files.push({path:name,bytes:bytes.length,sha256:hash(bytes)});}
  await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({base:manifest.baseCommit,applicationVersion:manifest.applicationVersion,portableSha256:manifest.portableSha256,validation:imports},null,2));
 }finally{await browser.close()}
})();
