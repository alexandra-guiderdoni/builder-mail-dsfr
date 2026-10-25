// Diagnostic #145 : collecte bornée, sans retarder ni confirmer une action.
async function traceExport(page) {
  const outside = [];
  page.on('download', () => outside.push({event: 'download', time: Date.now()}));
  page.on('pageerror', error => outside.push({event: 'pageerror', time: Date.now(), message: error.message}));
  await page.addInitScript(() => {
    const rows = [];
    const targetName = element => element?.id || element?.getAttribute?.('data-action') || element?.tagName || null;
    const record = (event, target) => {
      rows.push({event, time: performance.now(), target: targetName(target), active: targetName(document.activeElement),
        dialog: document.getElementById('check-dialog')?.open === true, focused: document.hasFocus()});
      if (rows.length > 100) rows.shift();
    };
    for (const type of ['click', 'submit', 'close', 'cancel', 'toggle']) {
      document.addEventListener(type, event => {
        const element = event.target;
        if (element?.closest?.('#check-dialog') || element?.matches?.('[data-action="export-mail"],[data-action="export-document"],[data-action="export-library"]')) {
          record(type, element);
        }
      }, true);
    }
    window.__exportForensic145 = rows;
  });
  return async () => ({
    browser: await page.evaluate(() => ({events: window.__exportForensic145 || [], active: document.activeElement?.id || document.activeElement?.tagName,
      dialog: document.getElementById('check-dialog')?.open === true, focused: document.hasFocus()})).catch(error => ({unreadable: error.message})),
    outside
  });
}
module.exports = {traceExport};
