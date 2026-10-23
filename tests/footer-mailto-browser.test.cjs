const test = require('node:test');
const {chromium,open,click,expand,saved,state,enterEditor,selectBlock,download,fs,assert} = require('./browser-support.cjs');

test('pieds de page mailto : import natif, saisie, refus ciblé, sauvegarde, copie et exports', async () => {
  const browser=await chromium.launch();
  try {
    const {page,observations}=await open(browser,{offline:true,permissions:['clipboard-read','clipboard-write']});
    const incoming=await page.evaluate(()=> {
      const d=MailBuilder.Model.create('Liens de pied de page',[47,48,49,50]);
      d.blocks.forEach((b,i)=>{b.values.f1='mailto:service'+i+'@example.invalid?subject=Bonjour';b.values.f2='Action '+i;});
      return JSON.stringify(d);
    });
    await expand(page,'Importer du JSON');await page.locator('#json-input').fill(incoming);
    await click(page,'[data-action=json-import]');await saved(page);
    const imported=await state(page), doc=imported.documents.find(d=>d.id===imported.activeId);
    assert.equal(imported.documents.length,2);assert.equal(doc.blocks.length,4);
    const expected=[];
    for(const [i,block] of doc.blocks.entries()) {
      await selectBlock(page,block.id);
      assert.equal(await page.locator('#field-f1').getAttribute('type'),'url');
      const label=await page.locator('label[for=field-f1]').textContent();assert.match(label,/HTTPS ou mailto/);
      const value='mailto:service'+i+'@example.invalid?subject='+encodeURIComponent('Édition d’aujourd’hui');
      await page.locator('#field-f1').fill(value);await saved(page);
      assert.equal(await page.locator('#field-f1').evaluate(e=>e.validity.typeMismatch),false);
      assert.equal(await page.locator('#field-f1').getAttribute('aria-invalid'),null);
      await page.locator('#field-f1').fill(value+'&bcc=autre@example.invalid');
      assert.equal(await page.locator('#field-f1').getAttribute('aria-invalid'),'true');
      const current=await state(page);assert.equal(current.documents.find(d=>d.id===current.activeId).blocks[i].values.f1,value);
      await click(page,'[data-action=cancel-fields]');assert.equal(await page.locator('#field-f1').inputValue(),value);
      expected.push(value);
    }
    await page.frameLocator('#preview').locator('a[href^="mailto:"]').first().waitFor();
    assert.deepEqual(await page.frameLocator('#preview').locator('a[href^="mailto:"]').evaluateAll(links=>links.map(a=>a.getAttribute('href'))),expected);
    await page.locator('#article-source').fill(expected[0]);assert.equal(await page.locator('#article-source').getAttribute('aria-invalid'),'true');
    await click(page,'[data-action=cancel-fields]');
    await click(page,'[data-action=copy]');await page.locator('#notice').filter({hasText:'Courriel copié en HTML et texte.'}).waitFor();
    const copied=await page.evaluate(async()=>{const [item]=await navigator.clipboard.read();return (await item.getType('text/html')).text();});
    for(const value of expected) assert.ok(copied.includes(value));
    await expand(page,'Fichiers et récupération');
    const jsonFile=await download(page,'[data-action=export-document]','footer-mailto.json');
    const json=JSON.parse(await fs.readFile(jsonFile,'utf8'));assert.deepEqual(json.blocks.map(b=>b.values.f1),expected);
    const htmlFile=await download(page,'[data-action=export-mail]','footer-mailto.html');
    const html=await fs.readFile(htmlFile,'utf8');for(const value of expected) assert.ok(html.includes(value));
    await page.reload();await page.waitForFunction(()=>MailBuilder.ready);await enterEditor(page);
    const restored=await state(page);assert.deepEqual(restored.documents.find(d=>d.id===restored.activeId).blocks.map(b=>b.values.f1),expected);
    assert.deepEqual(observations.errors,[]);assert.ok(!observations.requests.some(u=>/^https?:/.test(u)));
  } finally {await browser.close();}
});
