/* Tests synthétiques de l'oracle existant. Aucune commande native ni Firefox alloué. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=process.env.BUILDER_QUALIFICATION_ROOT||path.resolve(__dirname,'..');
const api=import(pathToFileURL(path.join(root,'scripts/recipe_page_flow_firefox.mjs')).href);
const reference={width:1440,height:900,outerWidth:1440,outerHeight:1000,dpr:2,screenWidth:1728,screenHeight:1117,visualScale:1};
// Modèle observé nativement (#179) : à 200 %, Firefox exprime aussi fenêtre et écran en pixels CSS zoomés.
const scaled={...reference,width:720,height:450,outerWidth:720,outerHeight:500,dpr:4,screenWidth:864,screenHeight:558.5,visualScale:1};
// Mesures natives du 28 octobre 2026 : zoom 200 % lu dans l'interface Firefox d'une instance possédée.
const native=JSON.parse(fs.readFileSync(path.join(root,'docs/qualification/backlog-cinq-20261028/NATIF.json'),'utf8')).nativeZoom;
test('zoom inchangé refuse le facteur 200 % ; témoin 100 % accepté',async()=>{
 const{qualifyZoom}=await api;
 assert.equal(qualifyZoom(reference,{...reference},2).qualified,false);
 assert.equal(qualifyZoom(reference,{...reference},1).qualified,true);
});
test('signaux synthétiques concordants qualifient seulement le facteur relatif',async()=>{
 const{qualifyZoom}=await api;const result=qualifyZoom(reference,scaled,2);
 assert.equal(result.qualified,true);assert.equal(result.absoluteZoomVerified,false);
 assert.match(result.limits,/not a browser-UI zoom reading/);
});
test('#196 : mesures natives — vrai 200 % accepté, témoin inchangé refusé, retour à 100 % accepté',async()=>{
 const{qualifyZoom}=await api;
 const real=qualifyZoom(native.reference,native.measured200,2);
 assert.equal(real.qualified,true,real.reason);assert.equal(real.absoluteZoomVerified,false);
 const control=qualifyZoom(native.unchangedNegativeControl.reference,native.unchangedNegativeControl.measured,2);
 assert.equal(control.qualified,false);assert.equal(control.reason,'Observed scale does not match requested factor');
 assert.equal(qualifyZoom(native.reference,native.restored100,1).qualified,true);
 assert.equal(qualifyZoom(native.reference,native.restored100,2).qualified,false);
});
test('#196 : zoom intermédiaire et fenêtre redimensionnée sans zoom restent refusés',async()=>{
 const{qualifyZoom}=await api,ref=native.reference,by=(f,keys)=>Object.fromEntries(Object.entries(ref).map(([k,v])=>[k,keys.includes(k)?(k==='dpr'?v*f:Math.round(v/f)):v]));
 const all=['width','height','outerWidth','outerHeight','screenWidth','screenHeight','dpr'];
 assert.equal(qualifyZoom(ref,by(1.7,all),2).qualified,false,'170 %');
 assert.equal(qualifyZoom(ref,by(2.4,all),2).qualified,false,'240 %');
 assert.equal(qualifyZoom(ref,by(2,['width','height']),2).qualified,false,'viewport seul redimensionné');
 assert.equal(qualifyZoom(ref,by(2,['width','height','outerWidth','outerHeight']),2).qualified,false,'fenêtre redimensionnée, DPR et écran inchangés');
 assert.equal(qualifyZoom(ref,by(2,['dpr']),2).qualified,false,'changement d’écran : DPR seul');
});
test('DPR seul, viewport seul et changement de fenêtre ne prouvent pas le zoom',async()=>{
 const{qualifyZoom}=await api;
 assert.equal(qualifyZoom(reference,{...reference,dpr:4},2).qualified,false);
 assert.equal(qualifyZoom(reference,{...scaled,dpr:2},2).qualified,false);
 assert.equal(qualifyZoom(reference,{...scaled,outerWidth:1440},2).qualified,false);
 assert.equal(qualifyZoom(reference,{...scaled,screenWidth:3840},2).qualified,false);
 // Ancien modèle (fenêtre et écran stables en pixels CSS) : jamais observé sous Firefox, désormais refusé.
 assert.equal(qualifyZoom(reference,{...reference,width:720,height:450,dpr:4},2).qualified,false);
});
test('pinch, mesure absente ou facteur non pris en charge restent non qualifiés',async()=>{
 const{qualifyZoom}=await api;
 assert.equal(qualifyZoom(reference,{...scaled,visualScale:2},2).qualified,false);
 assert.equal(qualifyZoom(reference,{...scaled,dpr:null},2).qualified,false);
 assert.equal(qualifyZoom(null,scaled,2).qualified,false);
 assert.equal(qualifyZoom(reference,scaled,3).qualified,false);
});
