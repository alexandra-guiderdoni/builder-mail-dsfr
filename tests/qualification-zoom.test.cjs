/* Tests synthétiques de l'oracle existant. Aucune commande native ni Firefox alloué. */
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=process.env.BUILDER_QUALIFICATION_ROOT||path.resolve(__dirname,'..');
const api=import(pathToFileURL(path.join(root,'scripts/recipe_page_flow_firefox.mjs')).href);
const reference={width:1440,height:900,outerWidth:1440,outerHeight:1000,dpr:2,screenWidth:1728,screenHeight:1117,visualScale:1};
const scaled={...reference,width:720,height:450,dpr:4};
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
test('DPR seul, viewport seul et changement de fenêtre ne prouvent pas le zoom',async()=>{
 const{qualifyZoom}=await api;
 assert.equal(qualifyZoom(reference,{...reference,dpr:4},2).qualified,false);
 assert.equal(qualifyZoom(reference,{...scaled,dpr:2},2).qualified,false);
 assert.equal(qualifyZoom(reference,{...scaled,outerWidth:720},2).qualified,false);
 assert.equal(qualifyZoom(reference,{...scaled,screenWidth:3840},2).qualified,false);
});
test('pinch, mesure absente ou facteur non pris en charge restent non qualifiés',async()=>{
 const{qualifyZoom}=await api;
 assert.equal(qualifyZoom(reference,{...scaled,visualScale:2},2).qualified,false);
 assert.equal(qualifyZoom(reference,{...scaled,dpr:null},2).qualified,false);
 assert.equal(qualifyZoom(null,scaled,2).qualified,false);
 assert.equal(qualifyZoom(reference,scaled,3).qualified,false);
});
