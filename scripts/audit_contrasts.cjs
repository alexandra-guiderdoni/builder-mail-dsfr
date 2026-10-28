/* Mesures ciblées des indéterminés axe ; aucun verdict global de conformité. */
const {chromium} = require('playwright');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {newCollection, beginCollection, finishCollection, collectionFailure} = require('./collector_receipt.cjs');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, process.env.BUILDER_CONTRAST_OUTPUT || 'evidence/contrastes-20261022/mesures');
const baseline = path.resolve(root, process.env.BUILDER_CONTRAST_BASELINE || 'evidence/contrastes-20261022/baseline');
const hash = value => createHash('sha256').update(value).digest('hex');
const report = newCollection(root, {completed: false, bypassCSP: false, humanQualification: false, screenReaderExecuted: false, observations: [], negativeControls: [], errors: []});
const click = async (page, selector) => {const e = page.locator(selector); await e.waitFor({state:'visible'}); await e.focus(); await e.press('Enter');};

function rgba(value) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return [...value.slice(1).match(/../g).map(v => parseInt(v, 16)), 1];
  const values = value.match(/^rgba?\(([^)]+)\)$/)?.[1].split(/[, /]+/).map(Number);
  assert(values && [3, 4].includes(values.length), 'Couleur non prise en charge : ' + value);
  return values.length === 3 ? [...values, 1] : values;
}
function contrast(a, b) {
  const luminance = values => values.slice(0,3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126,.7152,.0722][i], 0);
  const [x, y] = [luminance(a), luminance(b)].sort((a,b) => b-a);
  return (x + .05) / (y + .05);
}
async function pixels(page, png, colors, box, glyphs) {
  return page.evaluate(async ({encoded, colors, box, glyphs}) => {
    const image = new Image(); image.src = 'data:image/png;base64,' + encoded; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0); const data = context.getImageData(0,0,image.width,image.height).data;
    const counts = Object.fromEntries(Object.keys(colors).map(k => [k, 0])); let imageInk = 0, imagePaintPixels = 0;
    for (let y=0;y<image.height;y++) for (let x=0;x<image.width;x++) {
      const i=(y*image.width+x)*4;
      for (const [name, color] of Object.entries(colors)) if (color.every((v,j) => j===3 || Math.abs(data[i+j]-v)<=1)) {
        counts[name]++; if (name==='image' && box && x>=box.x && x<box.x+box.width && y>=box.y && y<box.y+box.height) imageInk++;
      }
      if (colors.image && box && x>=box.x && x<box.x+box.width && y>=box.y && y<box.y+box.height) {
        const between = colors.image.slice(0,3).every((v,j) => data[i+j]>=Math.min(v,colors.background[j]) && data[i+j]<=Math.max(v,colors.background[j]));
        if (between && colors.background.slice(0,3).some((v,j) => data[i+j]!==v)) imagePaintPixels++;
      }
    }
    const glyphPaintPixels=glyphs.map(g=>{
      let found=0;
      for (let y=Math.max(0,Math.floor(g.y));y<Math.min(image.height,Math.ceil(g.y+g.height));y++) for (let x=Math.max(0,Math.floor(g.x));x<Math.min(image.width,Math.ceil(g.x+g.width));x++) {
        const i=(y*image.width+x)*4;
        const between=colors.text.slice(0,3).every((v,j)=>data[i+j]>=Math.min(v,colors.background[j])&&data[i+j]<=Math.max(v,colors.background[j]));
        if (between&&colors.background.slice(0,3).some((v,j)=>data[i+j]!==v)) found++;
      }
      return found;
    });
    return {width:image.width,height:image.height,counts,imageInk,imagePaintPixels,glyphPaintPixels};
  }, {encoded:png.toString('base64'),colors,box,glyphs});
}
async function inspect(page, selector) {
  return page.locator(selector).evaluate((e, selector) => {
    const s=getComputedStyle(e), r=e.getBoundingClientRect(), rect={x:r.x,y:r.y,width:r.width,height:r.height};
    const ancestors=[];
    for (let n=e;n;n=n.parentElement) {const a=getComputedStyle(n); ancestors.push({tag:n.tagName,id:n.id,background:a.backgroundColor,image:a.backgroundImage,opacity:a.opacity,filter:a.filter,blend:a.mixBlendMode});}
    const glyphs=[];
    if (e.tagName!=='SELECT') {
      const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) for (let i=0;i<walker.currentNode.length;i++) if (walker.currentNode.data[i].trim()) {
        const range=document.createRange(); range.setStart(walker.currentNode,i); range.setEnd(walker.currentNode,i+1);
        for (const b of range.getClientRects()) {const x=b.x+b.width/2,y=b.y+b.height/2,hit=document.elementFromPoint(x,y);
          glyphs.push({x:b.x-r.x,y:b.y-r.y,width:b.width,height:b.height,visible:b.width>0&&b.height>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight,covered:!hit||!(hit===e||e.contains(hit)),hit:hit?.id||hit?.tagName});}
      }
    }
    return {selector,rect,tag:e.tagName,text:e.tagName==='SELECT'?e.selectedOptions[0]?.textContent:e.textContent,
      color:s.color,fontSize:s.fontSize,fontWeight:s.fontWeight,background:s.backgroundColor,backgroundImage:s.backgroundImage,
      backgroundPosition:s.backgroundPosition,backgroundSize:s.backgroundSize,backgroundOrigin:s.backgroundOrigin,
      paddingRight:s.paddingRight,borderWidths:[s.borderLeftWidth,s.borderRightWidth,s.borderTopWidth,s.borderBottomWidth],boxShadow:s.boxShadow,
      outline:{color:s.outlineColor,width:s.outlineWidth,style:s.outlineStyle,offset:s.outlineOffset},focused:e===document.activeElement,focusVisible:e.matches(':focus-visible'),
      dialog:e.closest('dialog:modal')?.id,childElementCount:e.childElementCount,pseudoContent:[getComputedStyle(e,'::before').content,getComputedStyle(e,'::after').content],ancestors,glyphs};
  }, selector);
}
async function ax(page, selector) {
  const cdp=await page.context().newCDPSession(page);
  try {
    const {result}=await cdp.send('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)})`});
    const {node}=await cdp.send('DOM.describeNode',{objectId:result.objectId});
    const {nodes}=await cdp.send('Accessibility.getPartialAXTree',{backendNodeId:node.backendNodeId});
    return nodes.find(n=>n.backendDOMNodeId===node.backendNodeId);
  } finally {await cdp.detach();}
}
async function measure(page, selector, key) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState==='finished'));
  const m=await inspect(page,selector), foreground=rgba(m.color);
  assert.equal(foreground[3],1,'Texte translucide : composition à qualifier');
  assert(m.ancestors.every(a=>Number(a.opacity)===1&&a.filter==='none'&&a.blend==='normal'),'Effet de composition non pris en charge');
  const backing=m.ancestors.find(a=>rgba(a.background)[3]===1); assert(backing,'Fond opaque requis');
  const layers=m.ancestors.slice(0,m.ancestors.indexOf(backing)+1);
  assert(layers.every((a,i)=>[0,1].includes(rgba(a.background)[3])&&(a.image==='none'||(m.tag==='SELECT'&&i===0))),'Fond intermédiaire translucide ou image non pris en charge');
  const background=rgba(backing.background), large=Number.parseFloat(m.fontSize)>=(Number(m.fontWeight)>=700?18.5:24);
  const result={...m,backgroundOwner:backing.id||backing.tag,nominalBackground:background,textRatio:contrast(foreground,background),textThreshold:large?3:4.5,large,
    coveredGlyphs:m.glyphs.filter(g=>g.covered||!g.visible).length};
  const colors={text:foreground,background}; let box;
  if (m.tag==='SELECT') {
    assert.equal(m.backgroundOrigin,'padding-box'); assert(m.borderWidths.every(v=>parseFloat(v)===0));
    assert.equal(m.backgroundPosition,'calc(100% - 16px) 50%'); assert.equal(m.backgroundSize,'16px 16px');
    const data=m.backgroundImage.match(/^url\("(data:image\/svg\+xml;[^\"]+)"\)$/)?.[1]; assert(data,'Image de fond inattendue');
    const svg=decodeURIComponent(data.slice(data.indexOf(',')+1));
    assert(!/\b(?:opacity|filter|mask|stroke|style)\s*=/.test(svg),'SVG complexe : qualification séparée');
    const fills=[...svg.matchAll(/\bfill=['"]([^'"]+)/g)].map(m=>m[1]); assert.equal(fills.length,1);
    colors.image=rgba(fills[0]); result.imageRatio=contrast(colors.image,background); result.imageThreshold=3;
    box={x:m.rect.width-32,y:(m.rect.height-16)/2,width:16,height:16}; result.imageBox=box;
    result.imageOutsideText=box.x>=m.rect.width-parseFloat(m.paddingRight);
  } else {
    assert.equal(m.dialog,'library-dialog','Le fond du dialogue doit être identifié');
    assert.equal(m.childElementCount,0,'Texte simple requis, sans descendant susceptible de le recouvrir');
    assert(m.pseudoContent.every(v=>['none','normal','""'].includes(v))&&m.borderWidths.every(v=>parseFloat(v)===0)&&m.boxShadow==='none','Décoration du texte à qualifier séparément');
  }
  const png=await page.locator(selector).screenshot({animations:'disabled'});
  if (key) await fs.writeFile(path.join(output,key+'.png'),png);
  result.pixels=await pixels(page,png,colors,box,m.glyphs); result.pngSha256=hash(png);
  result.backgroundPaintObserved=result.pixels.counts.background>0;
  result.meetsMeasuredThresholds=result.textRatio>=result.textThreshold&&(!box||result.imageRatio>=3);
  result.textPaintObserved=box?result.pixels.counts.text>0:result.pixels.glyphPaintPixels.length>0&&result.pixels.glyphPaintPixels.every(n=>n>0);
  result.renderResolved=result.backgroundPaintObserved&&result.textPaintObserved&&(!box||(result.pixels.imagePaintPixels>0&&result.imageOutsideText))&&result.coveredGlyphs===0;
  return result;
}
async function collect(page, scene, selectors, width) {
  for (const selector of selectors) {
    const modal=await page.locator('dialog:modal').count();
    if (selector==='#starter'&&modal) {
      const tree=await ax(page,selector), activeBefore=await page.evaluate(()=>document.activeElement.id);
      await page.locator(selector).evaluate(e=>e.focus());
      const activeAfter=await page.evaluate(()=>document.activeElement.id);
      assert(tree.ignored&&activeAfter===activeBefore,'Le contrôle sous le dialogue doit rester inactif');
      report.observations.push({scene,selector,width,state:'modal-background',ax:tree,activeBefore,activeAfter,qualification:'Inactif dans cet état ; contrôle évalué séparément sur l’accueil'});
      await page.screenshot({path:path.join(output,`${width}-${scene}-modal.png`)}); continue;
    }
    const states=selector.startsWith('#library-dialog-')?['default']:['default','hover','keyboard-focus'];
    for (const state of states) {
      await page.mouse.move(0,0);
      if (state==='hover') await page.locator(selector).hover();
      if (state==='keyboard-focus') {await page.locator(selector).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');}
      const key=`${width}-${scene}-${selector.slice(1)}-${state}`, value=await measure(page,selector,key);
      if (state==='keyboard-focus') assert(value.focused&&value.focusVisible,'Focus clavier réellement revenu sur le select');
      report.observations.push({scene,width,state,...value});
      assert(value.renderResolved&&value.meetsMeasuredThresholds,key+' : mesure à examiner');
    }
  }
}
(async()=>{
  await beginCollection(output, 'receipt.json', report);
  const source=JSON.parse(await fs.readFile(path.join(baseline,'browser.json'),'utf8'));
  const files=[...Object.keys(source.measuredFilesSha256),'reference/dsfr-web/dist/component/select/select.min.css','scripts/audit_contrasts.cjs','scripts/collector_receipt.cjs'];
  report.sourceSha256=Object.fromEntries(await Promise.all(files.map(async file=>[file,hash(await fs.readFile(path.join(root,file)))])));
  for (const [file,digest] of Object.entries(source.measuredFilesSha256)) assert.equal(report.sourceSha256[file],digest,'Source différente de la capture de référence');
  assert.equal(contrast([0,0,0],[255,255,255]),21); assert.equal(contrast([238,238,238],[238,238,238]),1);
  const browser=await chromium.launch(); report.browser=browser.version();
  try {
    for (const width of [1280,320]) {
      const context=await browser.newContext({viewport:{width,height:1000},colorScheme:'light',deviceScaleFactor:1});
      const page=await context.newPage(); page.on('pageerror',e=>report.errors.push(e.message));
      await page.goto('file://'+path.join(root,'app/distribution/portable.html')); await page.waitForFunction(()=>window.MailBuilder?.ready); await page.evaluate(()=>document.fonts.ready);
      await collect(page,'home',['#starter'],width); await click(page,'[data-action=resume-document]'); await collect(page,'editor',['#documents'],width);
      for (const title of ['Mes modèles','Identités de service','Ajouter un composant','Fichiers et récupération','Importer du JSON']) await click(page,'summary:has-text("'+title+'")');
      await collect(page,'editor-expanded',['#documents','#saved-templates','#identities'],width);
      await page.locator('#article-source').fill('http://exemple.invalid/'); await collect(page,'editor-invalid',['#documents','#saved-templates','#identities'],width);
      await click(page,'[data-action=cancel-fields]'); await click(page,'[data-action=library-home]'); await click(page,'[data-library-action=rename]');
      await collect(page,'rename-dialog',['#starter','#library-dialog-description'],width);
      await page.locator('#library-name').fill(''); await click(page,'#library-confirm'); await collect(page,'rename-invalid',['#starter','#library-dialog-description'],width);
      await click(page,'#library-cancel'); await click(page,'[data-library-action=remove]'); await collect(page,'delete-dialog',['#starter','#library-dialog-title','#library-dialog-description'],width);
      await click(page,'#library-cancel'); await click(page,'[data-action=resume-document]');
      const block=await page.evaluate(()=>MailBuilder.doc().blocks.find(b=>b.component==='mail-19').id); await click(page,`[data-select="${block}"]`);
      await page.locator('#article-source').fill('https://exemple.invalid/source'); await page.locator('#article-source-label').fill('Lire le dossier');
      await collect(page,'source-label',['#documents','#saved-templates','#identities'],width);
      if (width===1280) {
        await page.locator('#documents').evaluate(e=>e.style.color=getComputedStyle(e).backgroundColor);
        const low=await measure(page,'#documents','negative-low-contrast'); assert(!low.meetsMeasuredThresholds&&low.textRatio===1);
        report.negativeControls.push({kind:'same-text-and-background',detected:true,measurement:low});
        await page.locator('#documents').evaluate(e=>{e.style.removeProperty('color');e.style.paddingRight='8px';});
        const overlap=await measure(page,'#documents','negative-reserved-space'); assert(!overlap.renderResolved&&!overlap.imageOutsideText);
        report.negativeControls.push({kind:'insufficient-image-reservation',detected:true,measurement:overlap});
        await page.locator('#documents').evaluate(e=>e.style.removeProperty('padding-right'));
        await page.locator('#documents').evaluate(e=>e.style.backgroundImage=getComputedStyle(e).backgroundImage.replace('%23161616','%23eeeeee'));
        const faint=await measure(page,'#documents','negative-invisible-image'); assert(!faint.meetsMeasuredThresholds&&faint.imageRatio===1);
        report.negativeControls.push({kind:'same-image-and-background',detected:true,measurement:faint});
        await page.locator('#documents').evaluate(e=>e.style.removeProperty('background-image'));
        await click(page,'[data-action=library-home]'); await click(page,'[data-library-action=rename]');
        await page.locator('#library-dialog-description').evaluate(e=>{const r=e.getBoundingClientRect(),cover=document.createElement('div');cover.id='negative-cover';cover.style.cssText=`position:fixed;z-index:999999;background:white;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px`;e.closest('dialog').append(cover);});
        const covered=await measure(page,'#library-dialog-description','negative-obscured-text'); assert(!covered.renderResolved&&covered.coveredGlyphs>0);
        report.negativeControls.push({kind:'covered-dialog-text',detected:true,measurement:covered});
        await page.locator('#negative-cover').evaluate(e=>e.style.pointerEvents='none');
        const transparentHit=await measure(page,'#library-dialog-description','negative-pointer-transparent-cover');
        report.negativeControls.push({kind:'pointer-transparent-cover',detected:!transparentHit.renderResolved,measurement:transparentHit});
        assert(!transparentHit.renderResolved,'Un masque sans interception du pointeur doit aussi être détecté');
      }
      await context.close();
    }
    assert.equal(report.observations.length,80); assert.equal(report.negativeControls.length,5); assert.deepEqual(report.errors,[]); report.completed=true;
  } finally {try {await browser.close();} catch (error) {collectionFailure(report, 'cleanup', error);}}
})().catch(error=>{collectionFailure(report, 'collection', error);process.exitCode=1;}).finally(async()=>{
  await finishCollection({root, output, filename: 'receipt.json', report, sources: report.sourceSha256});
  if (!report.completed) process.exitCode=1;
  console.log(JSON.stringify({run_id:report.run_id,completed:report.completed,observations:report.observations.length,negativeControls:report.negativeControls.length,errors:report.errors}));
});
