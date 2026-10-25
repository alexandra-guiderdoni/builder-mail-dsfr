// Diagnostic jetable : observations seules, aucune interception ni action injectée.
async function attach(page, outside, contextIndex) {
  const push = entry => { outside.push({contextIndex, wall: Date.now(), ...entry}); if (outside.length > 2000) outside.shift(); };
  for (const kind of ['frameattached', 'framedetached', 'framenavigated']) page.on(kind, frame => push({kind, main: frame === page.mainFrame(), scheme: frame.url().split(':')[0]}));
  page.on('console', message => { const text=message.text(); if(text.startsWith('TRACE145-FRAME ')) { try { push({kind:'frame-input',...JSON.parse(text.slice(15))}); } catch {} } });
  page.on('console', message => { const text=message.text(); if(text.startsWith('TRACE145-CONFIRM ')) { try { push({kind:'confirmation-dom',...JSON.parse(text.slice(17))}); } catch {} } });
  page.on('download', () => push({kind: 'download'}));
  page.on('pageerror', error => push({kind: 'pageerror', message: error.message}));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.enable');
  cdp.on('Page.frameNavigated', ({frame}) => push({kind:'cdp-frame-navigated',frameId:frame.id,parentId:frame.parentId,url:frame.url.startsWith('blob:')?frame.url:frame.url.split(':')[0]}));
  for (const kind of ['frameStartedLoading', 'frameStoppedLoading']) cdp.on('Page.' + kind, data => push({kind, frameId: data.frameId}));
  await page.addInitScript(() => {
    if (window !== window.top) {
      for(const type of ['pointerdown','pointerup','mousedown','mouseup','click','focusin']) document.addEventListener(type,event=>console.debug('TRACE145-FRAME '+JSON.stringify({event:type,time:performance.now(),timeOrigin:performance.timeOrigin,url:location.href.startsWith('blob:')?location.href:location.protocol,target:event.target?.id||event.target?.tagName,trusted:event.isTrusted,clientX:event.clientX,clientY:event.clientY,screenX:event.screenX,screenY:event.screenY})),true);
      for(const type of ['focus','blur']) window.addEventListener(type,event=>{if(event.target===window)console.debug('TRACE145-FRAME '+JSON.stringify({event:'window-'+type,time:performance.now(),timeOrigin:performance.timeOrigin,url:location.href.startsWith('blob:')?location.href:location.protocol}));},true);
      return;
    }
    const rows = [], ids = new WeakMap(); let id = 0, sequence = 0;
    const uid = e => { if (!e) return null; if (!ids.has(e)) ids.set(e, ++id); return ids.get(e); };
    const name = e => e?.id || e?.getAttribute?.('data-action') || e?.tagName || null;
    const rect = e => { if (!e) return null; const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; };
    // getBoundingClientRect/getComputedStyle may force layout in BOTH arms.
    // elementFromPoint is restricted to the already-existing post-input snapshot.
    const state = (snapshot = false) => {
      const button=document.getElementById('check-confirm'), dialog=document.getElementById('check-dialog'), preview=document.getElementById('preview');
      const buttonRect=rect(button), center=buttonRect?{x:buttonRect.x+buttonRect.width/2,y:buttonRect.y+buttonRect.height/2}:null;
      return {active:name(document.activeElement),focused:document.hasFocus(),dialog:dialog?.open===true,modal:dialog?.matches(':modal')===true,dialogScrollTop:dialog?.scrollTop,
        buttonUid:uid(button),buttonConnected:button?.isConnected,buttonRect,previewRect:rect(preview),previewSrc:preview?.src,previewPointerEvents:preview?getComputedStyle(preview).pointerEvents:null,
        ...(snapshot?{confirmCenter:center,elementAtConfirmCenter:center?name(document.elementFromPoint(center.x,center.y)):null}: {})};
    };
    const push = row => { rows.push({seq:++sequence,time:performance.now(),wall:Date.now(),...row}); if(rows.length>500)rows.shift(); };
    const relevant = e => e?.closest?.('#check-dialog') || e?.matches?.('#preview,[data-action="export-mail"],[data-action="export-document"],[data-action="export-library"]');
    for (const type of ['pointerdown','pointerup','mousedown','mouseup','click','pointerover','mouseover','keydown','keyup','focusin','submit','close','toggle']) {
      document.addEventListener(type, event => {
        if (!relevant(event.target) && !document.getElementById('check-dialog')?.open) return;
        push({kind:type,target:name(event.target),targetUid:uid(event.target),trusted:event.isTrusted,key:event.key,button:event.button,x:event.clientX,y:event.clientY,...state()});
        // Same CDP observation in both arms: receipt order versus the download event.
        if((type==='click'&&event.target?.id==='check-confirm')||(type==='submit'&&event.target?.id==='check-form')) console.debug('TRACE145-CONFIRM '+JSON.stringify({event:type,time:performance.now(),timeOrigin:performance.timeOrigin,trusted:event.isTrusted}));
      },true);
    }
    for(const type of ['focus','blur']) window.addEventListener(type,event=>{if(event.target===window)push({kind:'window-'+type,...state()});},true);
    document.addEventListener('securitypolicyviolation',event=>push({kind:'csp-violation',directive:event.effectiveDirective,blockedURI:event.blockedURI}),true);
    let priorButton = null;
    const resized = new WeakSet();
    const resize = new ResizeObserver(entries => { for(const entry of entries) push({kind:'resize',target:name(entry.target),targetUid:uid(entry.target),rect:rect(entry.target),...state()}); });
    const mutation = new MutationObserver(() => {
      const button = document.getElementById('check-confirm');
      if(button!==priorButton){push({kind:'button-identity',before:uid(priorButton),after:uid(button),...state()});priorButton=button;}
      for(const selector of ['#preview','#check-dialog','#check-confirm']) {const e=document.querySelector(selector);if(e&&!resized.has(e)){resized.add(e);resize.observe(e);}}
    });
    mutation.observe(document,{childList:true,subtree:true});
    window.__confirmationTrace = {rows, state, get sequence(){return sequence;}};
  });
}
module.exports = {attach};
