const fs = require('node:fs');
const emit = entry => fs.appendFileSync(process.env.TRACE130, JSON.stringify({at: Date.now(), ...entry}) + '\n');
async function attach(page) {
  const cdp = await page.context().newCDPSession(page);
  emit({kind: 'attached', target: await cdp.send('Target.getTargetInfo'), pages: page.context().pages().length});
  for (const event of ['Page.frameNavigated', 'Page.frameStartedLoading', 'Page.frameStoppedLoading', 'Page.loadEventFired', 'Runtime.executionContextCreated', 'Runtime.executionContextDestroyed', 'Runtime.executionContextsCleared', 'DOMStorage.domStorageItemRemoved', 'DOMStorage.domStorageItemsCleared', 'DOMStorage.domStorageItemAdded', 'DOMStorage.domStorageItemUpdated']) {
    cdp.on(event, data => emit({kind: event, data}));
  }
  for (const domain of ['Page', 'Runtime', 'DOMStorage']) await cdp.send(domain + '.enable');
  page.on('console', msg => { if(msg.text().startsWith('[130]')) emit({kind: 'fixture', data: JSON.parse(msg.text().slice(5))}); });
  page.on('framenavigated', frame => emit({kind:'pw-navigation', main: frame === page.mainFrame(), url: frame.url()}));
  page.on('pageerror', error => emit({kind:'pageerror', error: error.message}));
  page.__cdp130 = cdp;
}
async function sample(page, phase) {
  emit({kind:'sample', phase, data:await page.evaluate(() => ({url:location.href, origin:location.origin, documentId:performance.timeOrigin, marker:sessionStorage.getItem('refus-initial'), refusedAtStart:window.refusedAtStart, recoveryOnly:window.MailBuilder?.recoveryOnly, documents:window.MailBuilder?.library.documents.map(d=>d.name)}))});
  const {frameTree} = await page.__cdp130.send('Page.getFrameTree');
  emit({kind:'frame-tree',phase,frame:frameTree.frame,storageKey:await page.__cdp130.send('Storage.getStorageKeyForFrame',{frameId:frameTree.frame.id})});
}
module.exports = {attach, sample};
