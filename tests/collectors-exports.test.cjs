const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('les callbacks de collecte builder et SNUM sélectionnent exportHtml, pas le rendu intermédiaire', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../scripts/audit_browser.cjs'), 'utf8');
  const builder = source.match(/const exports = await page\.evaluate\((lib => .*), qualification\);/)[1];
  const snum = source.match(/const rendered = await snum\.evaluate\((\(\) => .*?)\); await fs\.writeFile/)[1];
  const context = {MailBuilder: {Render: {html: () => '<p>INTERMEDIATE</p>', exportHtml: () => '<p>DOWNLOAD</p>'}, doc: () => ({})}};
  const rows = vm.runInNewContext('(' + builder + ')', context)({documents: [{name: 'fixture', blocks: []}]});
  assert.equal(rows[0].html, '<p>DOWNLOAD</p>');
  assert.equal(vm.runInNewContext('(' + snum + ')', context)(), '<p>DOWNLOAD</p>');
  // Cette preuve porte sur la sélection du renderer : aucune sortie native ni DOMParser simulé en vrai téléchargement.
});
