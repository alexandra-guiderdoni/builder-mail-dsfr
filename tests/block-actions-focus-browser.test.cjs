const test = require('node:test');
const {open, click, expand, saved, selectBlock, chromium, assert} = require('./browser-support.cjs');

// Contrat de l’issue #43 : chaque action sur un bloc laisse le focus à un endroit prévisible et annonce son résultat
// dans la région de statut #notice. Les données sont la composition de départ de l’atelier, sans contenu réel.
const g = name => `«\u00a0${name}\u00a0»`;
const blocks = page => page.evaluate(() => MailBuilder.doc().blocks.map(b => {
  const definition = MailBuilder.Model.component(b.component);
  return {id: b.id, label: definition.label, first: definition.fields.length ? `field-${definition.fields[0].key}` : 'article-source'};
}));
const active = page => page.evaluate(() => {
  const e = document.activeElement;
  return {tag: e.tagName, id: e.id, blockAction: e.dataset.blockAction || null, action: e.dataset.action || null, select: e.dataset.select || null, pressed: e.getAttribute('aria-pressed'), text: e.textContent.trim()};
});
const notice = page => page.locator('#notice').textContent();
async function status(page) { assert.equal(await page.locator('#notice').getAttribute('role'), 'status'); }

test('Monter et Descendre gardent le focus sur le bouton activé, ou passent sur l’autre bouton en butée, et annoncent la position', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    const start = await blocks(page), moving = start[3], total = start.length;
    await selectBlock(page, moving.id);

    await click(page, '[data-block-action=down]'); await saved(page);
    assert.equal((await active(page)).blockAction, 'down', 'Descendre doit garder le focus sur Descendre.');
    await status(page);
    assert.equal(await notice(page), `Bloc ${g(moving.label)} déplacé en position 5 sur ${total}.`);

    // La touche Entrée répétée enchaîne le déplacement sans revenir chercher le bouton.
    await page.keyboard.press('Enter'); await saved(page);
    assert.equal((await blocks(page)).at(-1).id, moving.id);
    assert.equal((await active(page)).blockAction, 'up', 'En butée basse, le focus doit passer sur Monter.');
    assert.equal(await notice(page), `Bloc ${g(moving.label)} déplacé en position ${total} sur ${total}.`);

    await page.keyboard.press('Enter'); await saved(page);
    assert.equal((await active(page)).blockAction, 'up', 'Monter doit garder le focus sur Monter.');
    assert.equal(await notice(page), `Bloc ${g(moving.label)} déplacé en position ${total - 1} sur ${total}.`);

    const second = (await blocks(page))[1];
    await selectBlock(page, second.id);
    await click(page, '[data-block-action=up]'); await saved(page);
    assert.equal((await blocks(page))[0].id, second.id);
    assert.equal((await active(page)).blockAction, 'down', 'En butée haute, le focus doit passer sur Descendre.');
    assert.equal(await notice(page), `Bloc ${g(second.label)} déplacé en position 1 sur ${total}.`);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});

test('Dupliquer et Ajouter mettent le focus sur le premier champ du nouveau bloc, y compris après le dernier bloc, et l’annoncent', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    const start = await blocks(page), source = start[1];
    await selectBlock(page, source.id);
    await click(page, '[data-block-action=duplicate]'); await saved(page);
    let current = await blocks(page);
    const copy = current[2];
    assert.notEqual(copy.id, source.id);
    assert.equal(await page.evaluate(() => MailBuilder.selected), copy.id);
    assert.equal((await active(page)).id, copy.first, 'Dupliquer doit cibler le premier champ de la copie.');
    await status(page);
    assert.equal(await notice(page), `Bloc ${g(source.label)} dupliqué : la copie est sélectionnée, en position 3 sur ${current.length}.`);

    const last = current.at(-1);
    await selectBlock(page, last.id);
    await click(page, '[data-block-action=duplicate]'); await saved(page);
    current = await blocks(page);
    assert.equal(await page.evaluate(() => MailBuilder.selected), current.at(-1).id);
    assert.equal((await active(page)).id, current.at(-1).first, 'La copie du dernier bloc doit recevoir le focus.');
    assert.equal(await notice(page), `Bloc ${g(last.label)} dupliqué : la copie est sélectionnée, en position ${current.length} sur ${current.length}.`);

    await selectBlock(page, current[0].id);
    await expand(page, 'Ajouter un composant');
    await page.locator('#catalogue').selectOption('mail-29');
    const added = await page.evaluate(() => MailBuilder.Model.component('mail-29').label);
    await click(page, '[data-action=add-block]'); await saved(page);
    current = await blocks(page);
    assert.equal(current[1].label, added);
    assert.equal(await page.evaluate(() => MailBuilder.selected), current[1].id);
    assert.equal((await active(page)).id, current[1].first, 'Ajouter doit cibler le premier champ du nouveau bloc.');
    assert.equal(await notice(page), `Bloc ${g(added)} ajouté en position 2 sur ${current.length}.`);

    await selectBlock(page, current.at(-1).id);
    await page.locator('#catalogue').selectOption('mail-29');
    await click(page, '[data-action=add-block]'); await saved(page);
    current = await blocks(page);
    assert.equal(await page.evaluate(() => MailBuilder.selected), current.at(-1).id);
    assert.equal((await active(page)).id, current.at(-1).first, 'Un bloc ajouté après le dernier doit recevoir le focus.');
    assert.equal(await notice(page), `Bloc ${g(added)} ajouté en position ${current.length} sur ${current.length}.`);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});

test('Retirer met le focus sur le bloc voisin, ou sur le catalogue quand il n’en reste plus, et l’annonce', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    let current = await blocks(page);
    const middle = current[2], following = current[3];
    await selectBlock(page, middle.id);
    await click(page, '[data-block-action=remove]'); await saved(page);
    let focus = await active(page);
    assert.equal(focus.select, following.id, 'Retirer doit cibler le bloc suivant dans la liste.');
    assert.equal(focus.pressed, 'true');
    await status(page);
    assert.equal(await notice(page), `Bloc ${g(middle.label)} retiré. Bloc ${g(following.label)} sélectionné, en position 3 sur ${current.length - 1}.`);

    // Le dernier bloc retiré, la liste fermée : le bloc précédent reçoit le focus et la liste se rouvre.
    current = await blocks(page);
    const last = current.at(-1), previous = current.at(-2);
    await selectBlock(page, last.id);
    await page.locator('#block-list').evaluate(e => { e.closest('details').open = false; });
    await click(page, '[data-block-action=remove]'); await saved(page);
    focus = await active(page);
    assert.equal(focus.select, previous.id, 'Retirer le dernier bloc doit cibler le bloc précédent.');
    assert.equal(await page.locator('#block-list').evaluate(e => e.closest('details').open), true);
    assert.equal(await notice(page), `Bloc ${g(last.label)} retiré. Bloc ${g(previous.label)} sélectionné, en position ${current.length - 1} sur ${current.length - 1}.`);

    current = await blocks(page);
    while (current.length > 1) {
      await selectBlock(page, current[0].id);
      await click(page, '[data-block-action=remove]'); await saved(page);
      current = await blocks(page);
    }
    const only = current[0];
    await selectBlock(page, only.id);
    await click(page, '[data-block-action=remove]'); await saved(page);
    focus = await active(page);
    assert.equal(focus.tag, 'SUMMARY'); assert.equal(focus.text, 'Ajouter un composant');
    assert.equal(await notice(page), `Bloc ${g(only.label)} retiré. La composition ne contient plus de bloc : ajoutez un composant depuis le catalogue.`);
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});

test('Annuler les champs invalides met le focus sur le premier champ restauré et l’annonce', async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const {page, observations} = await open(browser);
    const [first] = await blocks(page);
    await selectBlock(page, first.id);
    await page.locator('#article-source').fill('http://exemple.invalid/');
    await click(page, '[data-action=cancel-fields]');
    assert.equal((await active(page)).id, 'article-source', 'Le champ restauré doit recevoir le focus.');
    assert.equal(await page.locator('#article-source').inputValue(), '');
    await status(page);
    assert.equal(await notice(page), 'Champs invalides annulés ; les dernières valeurs valides sont affichées.');

    // Deux champs restaurés : le premier dans l’ordre du document reçoit le focus, quel que soit l’ordre de saisie.
    const name = await page.locator('#document-name').inputValue();
    await page.locator('#article-source').fill('http://exemple.invalid/');
    await page.locator('#document-name').fill('');
    await click(page, '[data-action=cancel-fields]');
    assert.equal((await active(page)).id, 'document-name');
    assert.equal(await page.locator('#document-name').inputValue(), name);
    assert.equal(await page.locator('#article-source').inputValue(), '');

    // Sans champ invalide, rien n’est restauré : le focus reste sur le bouton activé et le statut le dit.
    await click(page, '[data-action=cancel-fields]');
    const focus = await active(page);
    assert.equal(focus.action, 'cancel-fields');
    assert.equal(await notice(page), 'Aucun champ invalide à annuler.');
    assert.deepEqual(observations.errors, []);
  } finally { await browser.close(); }
});
