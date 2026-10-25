const test = require('node:test');
const {open, click, chromium, assert} = require('./browser-support.cjs');

// #145 : contrat utilisateur de la modale ; le rouge natif pointeur est conservé dans les preuves CI.
test('confirmation : aperçu bloqué pendant la modale puis utilisable après annulation et validation clavier', async () => {
  const browser = await chromium.launch();
  try {
    const {page, observations} = await open(browser, {offline: true}, p => p.addInitScript(() => {
      if (window === window.top) {
        // L’aperçu peut naviguer vers un nouveau blob : conserver le compteur dans le parent.
        window.__confirmationPreviewClicks = 0; window.__confirmationPreviewEvents = [];
        window.addEventListener('message', event => {
          if (event.source === document.getElementById('preview')?.contentWindow && event.data?.kind === '__test_confirmation_preview_click') { window.__confirmationPreviewClicks++; window.__confirmationPreviewEvents.push(event.data); }
        });
      } else {
        document.addEventListener('click', event => window.top.postMessage({kind:'__test_confirmation_preview_click',x:event.clientX,y:event.clientY,target:event.target?.tagName,trusted:event.isTrusted,time:performance.now(),timeOrigin:performance.timeOrigin}, '*'), true);
      }
    }));
    const previewText = page.frameLocator('#preview').getByText('Votre service', {exact: true}).first();
    const previewClicks = () => page.evaluate(() => window.__confirmationPreviewClicks);
    const received = count => page.waitForFunction(expected => window.__confirmationPreviewClicks >= expected, count);
    await previewText.click(); await received(1);
    assert.equal(await previewClicks(), 1, 'aperçu initialement interactif');
    let downloads = 0;
    page.on('download', () => downloads++);
    for (const action of ['cancel', 'confirm']) {
      const before = await previewClicks();
      await click(page, '[data-action=export-mail]');
      await page.locator('#check-dialog').waitFor({state: 'visible'});
      assert.equal(await page.evaluate(() => document.activeElement.id), 'check-dialog-title');
      // Un clic utilisateur à droite de la modale, sur le fond recouvrant l’aperçu.
      const point = await page.locator('#preview').evaluate(e => {
        const r = e.getBoundingClientRect();
        return {x: r.right - 10, y: Math.max(r.top + 10, Math.min(r.bottom - 10, innerHeight - 10))};
      });
      const dialog = await page.locator('#check-dialog').boundingBox();
      assert(point.x > dialog.x + dialog.width && point.y >= 0 && point.y < 1000);
      await page.mouse.click(point.x, point.y);
      const observed = await previewClicks();
      const detail = observed === before ? null : await page.evaluate(() => ({events:window.__confirmationPreviewEvents,open:document.getElementById('check-dialog').open,modal:document.getElementById('check-dialog').matches(':modal'),pointerEvents:getComputedStyle(document.getElementById('preview')).pointerEvents,active:document.activeElement.id}));
      assert.equal(observed, before, 'le fond modal ne transmet pas le clic à l’aperçu'+(detail?' '+JSON.stringify({action,point,...detail}):''));
      assert.equal(downloads, 0, 'aucun téléchargement avant confirmation');
      assert(await page.locator('#check-dialog').evaluate(e => e.open));
      await page.keyboard.press('Tab');
      assert(await page.evaluate(() => document.getElementById('check-dialog').contains(document.activeElement)), 'navigation clavier dans la modale');
      if (action === 'cancel') {
        await page.keyboard.press('Escape');
      } else {
        const event = page.waitForEvent('download'); event.catch(() => {});
        await page.locator('#check-confirm').focus();
        await page.keyboard.press('Enter');
        await event;
      }
      await page.waitForFunction(() => !document.getElementById('check-dialog').open);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'export-mail', 'focus rendu au déclencheur');
      await previewText.click(); await received(before + 1);
      assert.equal(await previewClicks(), before + 1, `aperçu interactif après ${action}`);
    }
    assert.equal(downloads, 1);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});
