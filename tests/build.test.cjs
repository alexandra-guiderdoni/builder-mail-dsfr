const test = require('node:test');
const {execFileSync} = require('node:child_process');
test('les distributions sont déterministes, UTF-8/LF et chaque ressource précachée invalide le worker', () => {
  execFileSync('python3', ['tests/build_contract.py'], {stdio: 'pipe'});
});
