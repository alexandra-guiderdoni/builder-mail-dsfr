const test = require('node:test');
const {open, saved, expand, click, chromium, assert} = require('/Users/alex/Claude-worktrees/builder-ux-159-160-20261027/tests/browser-support.cjs');
const INPUTS = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];

// Observation intrusive de DOM/événements, sans EFP, capture, délai ni acquittement inter-frame.
// Chaque contrôle enfant appartient à un nouveau Frame/document : aucun compteur réinitialisé.
async function documents(page, generation, previous) {
  const frames = {};
  for (const id of ['preview', 'catalogue-preview']) {
    const element = await page.locator('#' + id).elementHandle();
    const frame = await element.contentFrame();
    const url = id === 'preview' ? await element.getAttribute('src') : 'about:srcdoc';
    const title = id === 'preview' ? 'Fond modal' : 'Aperçu du composant';
    await frame.waitForFunction(({url, title}) => location.href === url && document.readyState === 'complete' && document.title === title, {url, title});
    if (previous) { assert.notEqual(frame, previous[id]); assert.equal(previous[id].isDetached(), true); }
    frames[id] = frame;
  }
  await frames.preview.evaluate(generation => {
    if (window.__backgroundControl) throw new Error('document déjà instrumenté');
    window.__backgroundControl = {generation, clicks: []};
    document.addEventListener('click', event => window.__backgroundControl.clicks.push({trusted: event.isTrusted, x: event.clientX, y: event.clientY}));
  }, generation);
  await frames.preview.locator('body').click({position: {x: 20, y: 20}});
  const seen = await frames.preview.evaluate(() => window.__backgroundControl);
  assert.equal(seen.generation, generation);
  if (seen.clicks.length !== 1) {
    console.error('[DEBUG-modal-post-close]', JSON.stringify({generation, seen, parent: await page.evaluate(() => ({active:document.activeElement?.outerHTML.slice(0,300),focus:document.hasFocus(),scroll:scrollY,modal:!!document.querySelector(':modal'),iframe:[...document.querySelectorAll('iframe')].map(e=>({id:e.id,rect:e.getBoundingClientRect().toJSON(),pointer:getComputedStyle(e).pointerEvents}))})), child:await frames.preview.evaluate(()=>({ready:document.readyState,rect:document.body.getBoundingClientRect().toJSON(),focus:document.hasFocus()}))}));
  }
  assert.equal(seen.clicks.length, 1, 'un clic par nouveau document');
  assert.equal(seen.clicks[0].trusted, true);
  return frames;
}

async function focusState(page) {
  return page.evaluate(() => {
    const dialog = document.getElementById('check-dialog'), active = document.activeElement;
    const key = el => el.id || `warning-${el.dataset.checkIndex}`;
    const identities = window.__modalFocusIdentities ||= {nodes: new WeakMap(), serial: 0};
    const node = el => {
      if (!identities.nodes.has(el)) identities.nodes.set(el, ++identities.serial);
      return identities.nodes.get(el);
    };
    return {inside: dialog.contains(active), key: key(active), tag: active.tagName, hasFocus: document.hasFocus(),
      node: node(active), open: dialog.open, modal: dialog.matches(':modal'),
      order: [...dialog.querySelectorAll('button:not([disabled])')].map(key),
      orderNodes: [...dialog.querySelectorAll('button:not([disabled])')].map(node)};
  });
}

async function keyboardCycle(page, t, cycle, noOutput) {
  const initial = await focusState(page);
  t.diagnostic(JSON.stringify({cycle, keyboard: 'initial', state: initial}));
  assert.ok(initial.inside && initial.hasFocus && initial.open && initial.modal);
  assert.ok((initial.key === 'check-dialog' && initial.tag === 'DIALOG') ||
    (initial.key === 'check-dialog-title' && initial.tag === 'H2'), 'ancre initiale exacte');
  assert.deepEqual(initial.order, ['warning-0', 'check-cancel', 'check-confirm'], 'fixture à trois actions exactes');
  let current = initial, step = 0;
  // Contrat de sûreté et d'accès aux actions, indépendant du nombre d'ancres natives.
  // Deux tours d'actions et deux arrêts neutres par tour : budget fixé avant exécution.
  const budget = 2 * (initial.order.length + 2);
  async function advance(direction, stage) {
    await page.keyboard.press(direction);
    current = await focusState(page);
    t.diagnostic(JSON.stringify({cycle, keyboard: direction, step: step++, stage, state: current}));
    assert.ok(current.open && current.modal, 'modalité conservée');
    assert.deepEqual(current.order, initial.order, 'ordre des actions conservé');
    assert.deepEqual(current.orderNodes, initial.orderNodes, 'identités des trois actions conservées');
    assert.ok((current.inside && current.hasFocus) ||
      (!current.inside && !current.hasFocus && ['BODY', 'HTML'].includes(current.tag)), 'aucun focus de fond');
    await noOutput();
  }
  function arrival(previous, reverse) {
    if (current.tag !== 'BUTTON' || !current.inside || !current.hasFocus) return {previous, changed: false};
    assert.ok(initial.order.includes(current.key), 'action connue');
    assert.equal(current.node, initial.orderNodes[initial.order.indexOf(current.key)], 'cible exacte');
    if (previous !== null) {
      // Répéter le même objet ne crée pas une nouvelle transition de focus.
      if (current.key === previous.key && current.node === previous.node) return {previous, changed: false};
      const index = initial.order.indexOf(previous.key);
      const expected = initial.order[(index + (reverse ? -1 : 1) + initial.order.length) % initial.order.length];
      assert.equal(current.key, expected, 'ordre des cibles distinctes dans le sens choisi');
    }
    return {previous: {key: current.key, node: current.node}, changed: true};
  }
  for (const direction of ['Tab', 'Shift+Tab']) {
    const visited = [], reverse = direction === 'Shift+Tab';
    let previous = initial.order.includes(current.key) ? {key: current.key, node: current.node} : null;
    // Le parcours retour part de l'action réellement focalisée à sa frontière.
    // C'est un état observé, pas une transition inventée ni un déplacement forcé.
    if (previous) visited.push(previous.key);
    for (let count = 0; count < budget; count++) {
      await advance(direction, 'fixed-coverage');
      const next = arrival(previous, reverse);
      previous = next.previous;
      if (next.changed) visited.push(previous.key);
    }
    assert.deepEqual([...new Set(visited)].sort(), [...initial.order].sort(), 'toutes les actions atteintes dans chaque sens');
  }
  // Activation suivante au clavier, bornée, sans placement artificiel du focus.
  let finalPrevious = initial.order.includes(current.key) ? {key: current.key, node: current.node} : null;
  for (let count = 0; current.key !== 'check-confirm' && count < initial.order.length + 2; count++) {
    await advance('Tab', 'reach-confirm');
    finalPrevious = arrival(finalPrevious, false).previous;
  }
  assert.equal(current.key, 'check-confirm');
  assert.ok(current.inside && current.hasFocus && current.tag === 'BUTTON');
  assert.equal(current.node, initial.orderNodes[initial.order.indexOf('check-confirm')], 'validation sur le nœud attendu');
}

test('le fond reçoit le geste parent sans sortie, Tab reste modal et chaque fermeture restitue un document utilisable', async t => {
  const browser = await chromium.launch();
  try {
    const {page, observations} = await open(browser);
    let downloads = 0; page.on('download', () => downloads++);
    await page.evaluate(async () => {
      const A = MailBuilder, doc = A.Model.create('Fond modal', [19]);
      await A.State.change(lib => { lib.documents = [doc]; lib.activeId = doc.id; });
    });
    await saved(page); await expand(page, 'Ajouter un composant');
    await page.locator('#catalogue').selectOption('mail-19');
    await page.locator('#catalogue-preview').waitFor({state: 'visible'});
    let frames = await documents(page, 0);
    const expectedHtml = await page.evaluate(() => MailBuilder.Render.exportHtml(MailBuilder.doc()));
    await page.evaluate(types => {
      window.__backgroundTrace = {phase: '', rows: [], dropped: 0, copyCalls: 0};
      const trace = window.__backgroundTrace;
      for (const type of [...types, 'submit', 'close']) document.addEventListener(type, event => {
        if (trace.rows.length >= 100) { trace.dropped++; return; }
        const dialog = document.getElementById('check-dialog');
        trace.rows.push({sequence: trace.rows.length + 1, phase: trace.phase, type, trusted: event.isTrusted,
          target: event.target.id || event.target.tagName, x: event.clientX, y: event.clientY, modal: dialog.matches(':modal'), open: dialog.open});
      }, {capture: true});
      // Compter les appels sans simuler de succès ni modifier leurs arguments/résultats.
      const proto = window.Clipboard?.prototype;
      for (const name of ['write', 'writeText']) if (typeof proto?.[name] === 'function') {
        const original = proto[name];
        proto[name] = function (...args) { trace.copyCalls++; return original.apply(this, args); };
      }
    }, INPUTS);
    for (const [cycle, action] of ['cancel', 'confirm'].entries()) {
      await click(page, '[data-action=export-mail]');
      await page.locator('#check-dialog').waitFor({state: 'visible'});
      assert.equal(await page.locator('iframe').count(), 0, 'CSS/inert seul est insuffisant');
      for (const frame of Object.values(frames)) assert.equal(frame.isDetached(), true);
      assert.equal((await focusState(page)).key, 'check-dialog-title');
      const geometry = await page.evaluate(phase => {
        const box = el => { const r = el.getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top, bottom: r.bottom}; };
        const preview = box(document.querySelector('.preview-panel .preview-placeholder'));
        const dialog = box(document.getElementById('check-dialog'));
        const visible = {left: Math.max(0, preview.left) + 8, right: Math.min(innerWidth, preview.right) - 8,
          top: Math.max(0, preview.top) + 8, bottom: Math.min(innerHeight, preview.bottom) - 8};
        const points = [[visible.left, visible.top], [visible.right, visible.top], [visible.left, visible.bottom], [visible.right, visible.bottom]];
        const point = visible.left < visible.right && visible.top < visible.bottom
          ? points.find(([x, y]) => x < dialog.left - 8 || x > dialog.right + 8 || y < dialog.top - 8 || y > dialog.bottom + 8) : null;
        window.__backgroundTrace.phase = phase;
        return {preview, dialog, viewport: {width: innerWidth, height: innerHeight}, point};
      }, `background-${cycle}`);
      assert.ok(geometry.point, 'précondition : un point visible de l’emplacement aperçu hors dialogue');
      const [x, y] = geometry.point;
      // Geste brut d’origine : aucune substitution clavier ni séquence de synchronisation ajoutée.
      await page.mouse.click(x, y);
      const trace = await page.evaluate(() => window.__backgroundTrace);
      const rows = trace.rows.filter(row => row.phase === `background-${cycle}` && INPUTS.includes(row.type));
      t.diagnostic(JSON.stringify({cycle, generation: cycle, geometry, rows, dropped: trace.dropped}));
      assert.equal(trace.dropped, 0);
      assert.deepEqual(rows.map(row => row.type), INPUTS, 'les cinq événements sont positivement reçus par le parent');
      assert.ok(rows.every(row => row.trusted && row.open && row.modal && Math.abs(row.x - x) <= 1 && Math.abs(row.y - y) <= 1));
      assert.equal(await page.locator('#check-dialog').evaluate(el => el.open && el.matches(':modal')), true);
      assert.equal(downloads, 0); assert.equal(trace.copyCalls, 0);
      await page.evaluate(phase => { window.__backgroundTrace.phase = phase; }, `keyboard-${cycle}`);
      await keyboardCycle(page, t, cycle, async () => {
        assert.equal(downloads, 0, 'aucun téléchargement avant consentement');
        assert.equal(await page.evaluate(() => window.__backgroundTrace.copyCalls), 0, 'aucune copie avant consentement');
        assert.deepEqual(observations.errors, []);
      });
      if (action === 'cancel') await page.keyboard.press('Escape');
      else {
        const event = page.waitForEvent('download');
        await page.keyboard.press('Enter');
        const download = await event, chunks = [];
        for await (const chunk of await download.createReadStream()) chunks.push(chunk);
        assert.equal(Buffer.concat(chunks).toString('utf8'), expectedHtml);
      }
      await page.locator('#check-dialog').waitFor({state: 'hidden'});
      assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'export-mail', 'focus rendu au déclencheur');
      assert.equal(downloads, cycle);
      frames = await documents(page, cycle + 1, frames);
    }
    const trace = await page.evaluate(() => window.__backgroundTrace);
    assert.equal(trace.copyCalls, 0); assert.equal(trace.dropped, 0); assert.equal(downloads, 1);
    assert.equal(trace.rows.filter(row => row.type === 'submit' && row.trusted && row.target === 'check-form').length, 1);
    assert.equal(trace.rows.filter(row => row.type === 'close' && row.trusted && row.target === 'check-dialog').length, 2);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});
