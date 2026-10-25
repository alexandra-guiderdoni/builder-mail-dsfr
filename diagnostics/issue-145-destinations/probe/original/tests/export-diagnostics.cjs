// Observations bornées du test d’export ; aucune action ni modification des délais fonctionnels.
const observations = new WeakMap();
const append = (rows, entry) => { rows.push(entry); if (rows.length > 100) rows.shift(); };

async function attachExportDiagnostics(page) {
  const seen = {phases: [], outside: []}; observations.set(page, seen);
  page.on('download', () => append(seen.outside, {event: 'download', time: Date.now()}));
  page.on('pageerror', error => append(seen.outside, {event: 'pageerror', time: Date.now(), message: error.message}));
  await page.addInitScript(() => {
    if (window !== window.top) return;
    const rows = [];
    const targetName = element => element?.id || element?.getAttribute?.('data-action') || element?.getAttribute?.('data-library-action') || element?.tagName || null;
    for (const type of ['click', 'submit', 'close', 'cancel', 'toggle']) {
      document.addEventListener(type, event => {
        const element = event.target;
        if (!element?.closest?.('#check-dialog') && !element?.matches?.('[data-action="export-mail"],[data-action="export-document"],[data-action="export-library"],[data-library-action="export"]')) return;
        rows.push({event: type, time: performance.now(), target: targetName(element), active: targetName(document.activeElement),
          dialog: document.getElementById('check-dialog')?.open === true, focused: document.hasFocus()});
        if (rows.length > 100) rows.shift();
      }, true);
    }
    window.__exportDiagnostics = rows;
  });
}

function recordExportPhase(page, phase, selector) {
  const seen = observations.get(page);
  if (seen) append(seen.phases, {phase, selector, time: Date.now()});
}

async function exportDiagnosticError(page, error, details) {
  const seen = observations.get(page) || {phases: [], outside: []};
  const original = {name: error?.name || 'Error', message: error?.message ?? String(error), stack: error?.stack ?? null};
  const unreadable = message => ({browser: {unreadable: message}, state: {unreadable: message}});
  let timer;
  // Délai réservé au diagnostic d’échec : aucune attente fonctionnelle du test n’est modifiée.
  const snapshot = await Promise.race([
    Promise.resolve().then(() => page.evaluate(() => {
      const error = document.getElementById('error'), dialog = document.getElementById('check-dialog')?.open === true, focused = document.hasFocus();
      return {browser: {events: window.__exportDiagnostics || [], active: document.activeElement?.id || document.activeElement?.tagName, dialog, focused},
        state: {notice: document.getElementById('notice')?.textContent.trim(), error: error?.hidden === false ? error.textContent.trim() : '', checkDialog: dialog, focused}};
    })).catch(cause => unreadable(cause?.message ?? String(cause))),
    new Promise(resolve => { timer = setTimeout(() => resolve(unreadable('Snapshot diagnostique indisponible après 1000 ms.')), 1000); })
  ]).finally(() => clearTimeout(timer));
  const diagnostic = {...details, original, phases: seen.phases, ...snapshot, outside: seen.outside};
  return new Error(`${details.label} : échec de l’export pour ${details.selector} ; diagnostic ${JSON.stringify(diagnostic)}`, {cause: error});
}

module.exports = {attachExportDiagnostics, recordExportPhase, exportDiagnosticError};
