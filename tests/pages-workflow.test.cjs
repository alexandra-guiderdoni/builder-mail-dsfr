const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const text = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/pages.yml'), 'utf8');
const jobs = Object.fromEntries([...text.matchAll(/^  ([a-z-]+):\n([\s\S]*?)(?=^  [a-z-]+:\n|(?![\s\S]))/gm)].map(match => [match[1], match[2]]));

test('la publication dépend d’un job qui exécute la suite complète', () => {
  assert.ok(jobs.tests, 'un job tests est requis');
  assert.match(jobs.tests, /run: npm test\b/);
  assert.match(jobs.tests, /run: npm run check\b/);
  assert.match(jobs.deploy, /^    needs: tests$/m);
});

test('aucun contournement ne laisse la publication passer malgré un échec', () => {
  assert.doesNotMatch(text, /continue-on-error/);
  assert.doesNotMatch(text, /\|\| true/);
  assert.doesNotMatch(jobs.tests, /^\s+if:/m);
});

test('le job de tests ne reçoit aucun droit de publication', () => {
  assert.doesNotMatch(jobs.tests, /pages: write|id-token: write/);
});

test('les dépendances du job de tests sont installées depuis le verrou et les actions sont épinglées', () => {
  assert.match(jobs.tests, /run: npm ci --ignore-scripts\b/);
  assert.match(jobs.tests, /playwright install --with-deps chromium\b/);
  for (const [, ref] of text.matchAll(/uses: \S+@(\S+)/g)) assert.match(ref, /^[0-9a-f]{40}$/);
  assert.match(jobs.tests, /node-version: '\d+\.\d+\.\d+'/);
});
