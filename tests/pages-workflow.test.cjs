const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const text = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/pages.yml'), 'utf8');
const jobs = Object.fromEntries([...text.matchAll(/^  ([a-z-]+):\n([\s\S]*?)(?=^  [a-z-]+:\n|(?![\s\S]))/gm)].map(match => [match[1], match[2]]));

test('la publication dépend d’un job qui exécute la suite complète', () => {
  assert.ok(jobs.tests, 'un job tests est requis');
  assert.match(jobs.tests, /^\s+NODE_OPTIONS=.* npm test$/m);
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
  const version = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')).devDependencies.playwright;
  const image = /image: (mcr\.microsoft\.com\/playwright:v[^\s]+)/.exec(jobs.tests)?.[1];
  assert.ok(image, 'les navigateurs doivent venir de l’image préinstallée');
  assert.ok(image.startsWith(`mcr.microsoft.com/playwright:v${version}-noble@sha256:`));
  assert.match(image, /@sha256:[0-9a-f]{64}$/);
  assert.doesNotMatch(jobs.tests, /playwright install|apt-get/);
  assert.match(jobs.tests, /python-version: '3\.12\.14'/);
  for (const [, ref] of text.matchAll(/uses: \S+@(\S+)/g)) assert.match(ref, /^[0-9a-f]{40}$/);
  assert.match(jobs.tests, /node-version: '\d+\.\d+\.\d+'/);
});

// Le shell du job doit transmettre les options et le code de sortie réel de npm.
function executeTestStep(previous, status = 0) {
  const os = require('node:os'), {spawnSync} = require('node:child_process');
  const command = /- name: Exécuter la suite de tests\n\s+run: \|\n\s+([^\n]+)/.exec(text)?.[1];
  assert.ok(command, 'la commande doit être autonome, sans sortie d’une étape précédente');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-ci-npm-'));
  try {
    fs.writeFileSync(path.join(directory, 'npm'), "#!/bin/sh\nprintf '%s\\n' \"$NODE_OPTIONS\" \"$*\"\nexit \"${NPM_STATUS:-0}\"\n", {mode: 0o700});
    return spawnSync('sh', ['-e', '-c', command], {encoding: 'utf8', env: {...process.env, PATH: directory + path.delimiter + process.env.PATH, NODE_OPTIONS: previous, NPM_STATUS: String(status)}});
  } finally { fs.rmSync(directory, {recursive: true}); }
}

test('le reporting TAP fonctionne sans options héritées ni sortie JSON intermédiaire', () => {
  const result = executeTestStep('');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), ['--test-reporter=tap', 'test']);
  assert.doesNotMatch(text, /fromJSON\(steps\.reporter\.outputs/);
});

test('le reporting conserve les options Node héritées', () => {
  const result = executeTestStep('--trace-warnings');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), ['--trace-warnings --test-reporter=tap', 'test']);
});

test('un échec npm reste un échec du job avec le reporting TAP', () => {
  const result = executeTestStep('', 17);
  assert.equal(result.status, 17);
});
