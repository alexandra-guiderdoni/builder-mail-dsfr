'use strict';
const assert = require('node:assert/strict');

// Vérification avant copie ou téléchargement HTML (#36) : le moteur natif donne les avertissements attendus,
// le dialogue doit les afficher tous, puis la confirmation est explicite. Sans avertissement, aucun dialogue.
async function throughChecks(page, action, trigger) {
  const expected = await page.evaluate(action => {
    const A = MailBuilder, doc = A.doc(), html = action === 'copy' ? A.Render.clipboardHtml(doc) : A.Render.exportHtml(doc);
    return A.Checks.warnings(doc, {...A.Render.weightDetails(html, doc), ...(action === 'export' ? {action} : {})}).length;
  }, action);
  await trigger();
  if (!expected) return 0;
  await page.locator('#check-dialog').waitFor({state: 'visible'});
  assert.equal(await page.locator('#check-list li').count(), expected);
  await page.locator('#check-confirm').focus(); await page.locator('#check-confirm').press('Enter');
  await page.locator('#check-dialog').waitFor({state: 'hidden'});
  return expected;
}
module.exports = {throughChecks};
