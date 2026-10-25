// Test d’intégration local de #149. Chaque ressource est une session créée par cette sonde.
// Aucun appel global/default ni close --all n’est exécuté.
const {spawn, spawnSync} = require('node:child_process');
const {randomUUID} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
function cli(session, ...args) {
  if (!session.startsWith('sg149-')) throw new Error('Session hors de la sonde');
  const r = spawnSync('agent-browser', ['--session', session, ...args], {encoding: 'utf8', timeout: 30000});
  if (r.status !== 0) throw new Error(`${args[0]}: ${r.stderr || r.stdout || r.error}`);
  return r.stdout.trim();
}
const [, , mode, session] = process.argv;
if (mode === 'worker') {
  const exitMode = process.argv[4];
  let allocated = false, closed = false;
  const cleanup = () => {
    if (allocated && !closed) { cli(session, 'close'); closed = true; }
  };
  process.once('SIGINT', () => { try { cleanup(); process.exit(130); } catch (e) { console.error(e); process.exit(2); } });
  (async () => {
    try {
      allocated = true; // Nom unique alloué à ce worker, même si la navigation échoue.
      cli(session, 'open', 'about:blank');
      cli(session, 'snapshot', '-i');
      if (exitMode === 'interrupt') {
        // Un handle actif maintient réellement le worker jusqu’au SIGINT du parent.
        const waiting = setInterval(() => {}, 1000);
        process.once('exit', () => clearInterval(waiting));
        process.send?.({ready: true}); await new Promise(() => {});
      }
      if (exitMode === 'error') throw new Error('Erreur contrôlée de recette');
    } finally { cleanup(); }
  })().catch(e => { console.error(e.message); process.exitCode = 1; });
} else {
  (async () => {
    const nonce = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const witness = `sg149-witness-${nonce}`, title = `Témoin conservé ${nonce}`;
    const results = [], allocated = [];
    fs.writeFileSync(path.join(__dirname, 'owned-sessions-ledger.json'), JSON.stringify({nonce, witness, createdByThisProbe: true, intendedOwned: ['success', 'error', 'interrupt'].map(x => `sg149-${x}-${nonce}`)}, null, 2) + '\n');
    try {
      cli(witness, 'open', `data:text/html;charset=utf-8,<title>${encodeURIComponent(title)}</title><p>temoin</p>`);
      cli(witness, 'snapshot', '-i');
      const before = cli(witness, 'get', 'title');
      if (before !== title) throw new Error(`Titre témoin initial inattendu: ${before}`);
      for (const exitMode of ['success', 'error', 'interrupt']) {
        const owned = `sg149-${exitMode}-${nonce}`;
        allocated.push(owned);
        const childResult = await new Promise((resolve, reject) => {
          const child = spawn(process.execPath, [__filename, 'worker', owned, exitMode], {stdio: ['ignore', 'pipe', 'pipe', 'ipc']});
          let stdout = '', stderr = '';
          child.stdout.on('data', x => { stdout += x; }); child.stderr.on('data', x => { stderr += x; });
          child.once('error', reject);
          child.on('message', m => { if (exitMode === 'interrupt' && m.ready) child.kill('SIGINT'); });
          child.once('exit', (code, signal) => resolve({code, signal, stdout, stderr}));
        });
        const expected = {success: 0, error: 1, interrupt: 130}[exitMode];
        const after = cli(witness, 'get', 'title');
        const row = {exitMode, owned, expectedExit: expected, ...childResult, witnessTitleBefore: before, witnessTitleAfter: after, witnessPreserved: after === before};
        results.push(row);
        if (childResult.code !== expected || !row.witnessPreserved) throw new Error(`Scénario ${exitMode} refusé`);
      }
    } finally {
      // Filet de secours limité aux noms alloués dans le présent processus.
      for (const own of allocated) { try { cli(own, 'close'); } catch {} }
      cli(witness, 'close');
      fs.writeFileSync(path.join(__dirname, 'owned-sessions-partial.json'), JSON.stringify(results, null, 2) + '\n');
    }
    fs.writeFileSync(path.join(__dirname, 'owned-sessions-result.json'), JSON.stringify({layer: 'agent-browser CLI, sessions jetables réelles', cases: results, allWitnessesPreserved: results.every(x => x.witnessPreserved), globalCleanupExecuted: false}, null, 2) + '\n');
    console.log(JSON.stringify({cases: results.length, allWitnessesPreserved: true, globalCleanupExecuted: false}));
  })().catch(e => { console.error(e); process.exitCode = 1; });
}
