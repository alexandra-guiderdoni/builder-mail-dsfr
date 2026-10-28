const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
for (const optimized of [false, true]) test(`synthetic clipboard ownership contract${optimized ? ' optimized' : ''}`, () => {
  const result = spawnSync('python3', ['-B', ...(optimized ? ['-O'] : []), 'tests/clipboard_owned_payload_contract.py'], {cwd: path.resolve(__dirname, '..'), encoding: 'utf8'});
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /pure checks; no native allocation/);
});

test('owned CSS deletion permits attribution but fails fidelity', async () => {
  const {attributeOwnedCapture, compareProperties, classifyCopy, receiptMatches} = await import('../scripts/recipe_firefox_clipboard.mjs');
  const expected = {markerHTML:true,markerPlain:true,styles:1,styleContentHash:'a'.repeat(64),msoContentHash:'b'.repeat(64),widthContentHash:'c'.repeat(64),images:[{srcHash:'known',alt:'known'}],preheader:true,msoDeclarations:1,msoHide:1,widthBounds:1,plainNormalizedHash:'known'};
  const observed = {...expected,styleContentHash:'d'.repeat(64)};
  const measured = {digest:'e'.repeat(64),change_count:20};
  const capture = {...measured,captured:true};
  const lastOwned = attributeOwnedCapture({qualified:true},capture,measured);
  const fidelity = compareProperties(expected,observed);
  assert.equal(fidelity.matches,false);
  assert.equal(classifyCopy({resolved:true,markerConfirmed:true},{digest:'f'.repeat(64),change_count:19},measured,capture,fidelity).kind,'system_copy_not_qualified');
  assert.equal(receiptMatches(measured,lastOwned),true,'cleanup attribution remains available after fidelity failure');
});

test('ownership refusal or concurrent count cannot become lastOwned', async () => {
  const {attributeOwnedCapture} = await import('../scripts/recipe_firefox_clipboard.mjs');
  const capture = {captured:true,digest:'a'.repeat(64),change_count:20};
  assert.throws(()=>attributeOwnedCapture({qualified:false},capture,capture));
  assert.throws(()=>attributeOwnedCapture({qualified:true},capture,{...capture,change_count:21}));
});
