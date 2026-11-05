const test = require('node:test');
const {chromium, open, assert, nativeAxNode} = require('./browser-support.cjs');

// #212 : le champ image suit le composant DSFR d'envoi de fichier (fr-upload-group, fr-upload, CSS 1.15.4 embarqué),
// sans JavaScript DSFR. Le bouton natif reste. L'aide courte reste hors du libellé (#158) et l'espacement des groupes
// DSFR de l'atelier est conservé : aide à 0,5 rem, champ 0,5 rem sous l'aide, 1,5 rem sous le groupe.
test('champ image : composant DSFR d’envoi de fichier, aide hors du libellé, espacements des groupes conservés', async () => {
  const browser = await chromium.launch();
  try {
    const {page} = await open(browser);
    const field = await page.evaluate(() => {
      const input = document.getElementById('field-f0'), group = input.parentElement, label = document.getElementById('field-f0-label');
      const help = document.getElementById('image-help-f0'), rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const box = element => element.getBoundingClientRect(), next = group.nextElementSibling;
      return {classes: [...input.classList], group: [...group.classList], labelHasHelp: label.contains(help), helpInGroup: help.parentElement === group,
        labelledby: input.getAttribute('aria-labelledby'), describedby: input.getAttribute('aria-describedby'), dataField: input.dataset.imageField,
        fontSize: parseFloat(getComputedStyle(input).fontSize) / rem, helpGap: (box(help).top - box(label).bottom) / rem,
        inputGap: (box(input).top - box(help).bottom) / rem, belowGroup: (box(next).top - box(group).bottom) / rem,
        imageField: !!input.closest('.image-field'), uploads: document.querySelectorAll('input[type=file][data-image-field]:not(.fr-upload)').length};
    });
    assert.deepEqual(field.classes, ['fr-upload']);
    assert.deepEqual(field.group, ['fr-upload-group']);
    assert.equal(field.fontSize, 0.875, 'la règle .fr-upload du CSS DSFR 1.15.4 doit être embarquée');
    assert.equal(field.labelHasHelp, false); assert.equal(field.helpInGroup, true);
    assert.equal(field.labelledby, null, 'nommé par le seul label for (#218)'); assert.equal(field.describedby, 'image-help-f0');
    assert.equal(field.dataField, 'f0'); assert.equal(field.imageField, true); assert.equal(field.uploads, 0);
    assert.equal(field.helpGap, 0.5); assert.equal(field.inputGap, 0.5);
    assert.ok(field.belowGroup >= 1.5, `${field.belowGroup} rem sous le groupe`);
    const ax = await nativeAxNode(page, '#field-f0');
    if (ax) {
      assert.equal(ax.name.value, await page.locator('#field-f0-label').textContent());
      assert.equal(ax.description?.value, await page.locator('#image-help-f0').textContent());
    }
  } finally { await browser.close(); }
});
