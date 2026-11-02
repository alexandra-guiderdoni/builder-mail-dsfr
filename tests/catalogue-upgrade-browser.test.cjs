const test = require('node:test'), path = require('node:path'), os = require('node:os');
const {execFileSync} = require('node:child_process');
const {root, open, enterEditor, saved, chromium, fs, assert} = require('./browser-support.cjs');

// #209 : l’essai du constat, rejoué. Une bibliothèque enregistrée par l’atelier N est rouverte par un atelier N+1 construit
// pour de vrai, dans une copie temporaire, avec une seule règle CSS ajoutée au gabarit du courriel : seul le rendu change.
const RULE = '.variante-209{color:#c00}';
async function variant(transformHistory = history => history) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'catalogue-209-'));
  for (const part of ['scripts', 'reference', 'shared', 'prototype', 'app']) await fs.cp(path.join(root, part), path.join(dir, part), {recursive: true});
  const template = path.join(dir, 'reference/dsfr-mail/template-generique.html');
  await fs.writeFile(template, (await fs.readFile(template, 'utf8')).replace('<style type="text/css">', `<style type="text/css">${RULE}`));
  const historyFile = path.join(dir, 'app/catalogue-history.json');
  await fs.writeFile(historyFile, JSON.stringify(transformHistory(JSON.parse(await fs.readFile(historyFile, 'utf8'))), null, 2) + '\n');
  execFileSync('python3', ['scripts/build_app.py'], {cwd: dir});
  return {dir, url: 'file://' + path.join(dir, 'app/distribution/portable.html')};
}
const catalogueId = page => page.evaluate(() => MailBuilder.catalog.id);
async function seeded(browser) {
  const {page, context} = await open(browser);
  await page.locator('#document-name').fill('Lettre de test #209'); await saved(page);
  const stored = await page.evaluate(async () => (await MailBuilder.Storage.load()).library), meta = await page.evaluate(() => MailBuilder.Storage.loadMeta());
  await page.close(); return {context, stored, meta, before: stored.catalogue};
}
async function reopen(context, url) {
  const page = await context.newPage(); await page.goto(url); await page.waitForFunction(() => window.MailBuilder?.ready); return page;
}

test('#209 N puis N+1 : seul le rendu a changé, la bibliothèque est rouverte, ré-estampillée et annoncée', async () => {
  const browser = await chromium.launch(), built = await variant();
  try {
    const {context, stored, meta, before} = await seeded(browser);
    const page = await reopen(context, built.url);
    const after = await catalogueId(page);
    assert.notEqual(after, before, 'l’atelier N+1 a bien une autre empreinte');
    assert.equal(await page.evaluate(() => MailBuilder.recoveryOnly), false);
    assert.match(await page.locator('#notice').textContent(), /mises à jour vers le modèle courant/);
    await enterEditor(page);
    assert.equal(await page.locator('#document-name').inputValue(), 'Lettre de test #209');
    await page.waitForFunction(id => MailBuilder.Storage.load().then(r => r.library.catalogue === id), after);
    const record = await page.evaluate(() => MailBuilder.Storage.load());
    assert.deepEqual(record.library.documents.map(d => d.catalogue), [after], 'documents ré-estampillés et enregistrés');
    const previous = await page.evaluate(() => MailBuilder.Storage.load('previous'));
    assert.equal(previous.library.catalogue, before, 'l’état précédent garde l’original');
    assert.deepEqual(await page.evaluate(() => MailBuilder.Storage.loadMeta()), meta, 'la mise à jour n’est pas une modification éditoriale');
    assert.equal(stored.documents[0].name, 'Lettre de test #209');
    // Un export de N s’importe dans N+1 ; un catalogue inconnu reste refusé.
    const exported = JSON.stringify({...stored.documents[0], name: 'Export de N'});
    await page.evaluate(text => MailBuilder.Imports.prepare(text).then(r => window.__incoming = r), exported);
    assert.deepEqual(await page.evaluate(() => [window.__incoming.upgraded, window.__incoming.value.catalogue]), [true, after]);
    const unknown = JSON.stringify({...stored.documents[0], catalogue: 'inconnu'});
    assert.match(await page.evaluate(text => MailBuilder.Imports.prepare(text).then(() => 'accepté', e => e.message), unknown), /autre catalogue/);
  } finally { await browser.close(); await fs.rm(built.dir, {recursive: true, force: true}); }
});

test('#209 N puis N+1 : un autre contrat de données garde le refus et l’export brut', async () => {
  // Le registre de N+1 attribue à N un autre contrat de données : N n’est plus compatible.
  const browser = await chromium.launch(), built = await variant(history => history.map(h => ({...h, contract: 'autre-contrat'})));
  try {
    const {context, stored} = await seeded(browser);
    const page = await reopen(context, built.url);
    assert.equal(await page.evaluate(() => MailBuilder.recoveryOnly), true);
    assert.match(await page.locator('#error').textContent(), /autre catalogue/);
    const record = await page.evaluate(() => MailBuilder.Storage.load());
    assert.deepEqual(record.library, stored, 'données enregistrées intactes');
  } finally { await browser.close(); await fs.rm(built.dir, {recursive: true, force: true}); }
});

test('#209 registre : la construction refuse une empreinte absente du registre ; contrat indépendant du rendu', () => {
  const run = code => JSON.parse(execFileSync('python3', ['-c', `import json,sys;sys.path.insert(0,'scripts');from catalogue import *;${code}`], {cwd: root, encoding: 'utf8'}));
  const [current, history] = run('c=compile_catalogue();print(json.dumps([{"id":c["id"],"contract":c["contract"]},json.load(open("app/catalogue-history.json"))]))');
  assert(history.some(h => h.id === current.id && h.contract === current.contract), 'empreinte courante enregistrée');
  const changed = run('c=compile_catalogue();k=[dict(x) for x in c["components"]];k[0]=dict(k[0],template=k[0]["template"]+" ");a=data_contract(k);k[0]=dict(k[0],fields=[dict(f,type="autre") if i==0 else f for i,f in enumerate(k[0]["fields"])]);print(json.dumps([a==c["contract"],data_contract(k)==c["contract"]]))');
  assert.deepEqual(changed, [true, false], 'le gabarit ne change pas le contrat ; un type de champ le change');
  assert.throws(() => execFileSync('python3', ['-c', 'import sys;sys.path.insert(0,"scripts");from catalogue import *;check_history(dict(compile_catalogue(),id="absente"))'], {cwd: root, stdio: 'pipe'}), /absente du registre/);
});
