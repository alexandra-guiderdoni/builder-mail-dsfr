const {note} = require('./browser-support.cjs');

// Panne à la frontière IndexedDB, jamais une mesure du quota physique du moteur.
// Les petites écritures restent natives afin d’exercer la sortie de l’état d’échec.
async function rejectLargeWrites(page) {
  note({kind: 'storage-failure-injected', boundary: 'IDBObjectStore.put', error: 'QuotaExceededError', physicalQuota: false});
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, ...args) {
      if (new Blob([JSON.stringify(value)]).size > 400000) throw new DOMException('Quota synthétique à la frontière IndexedDB', 'QuotaExceededError');
      return put.call(this, value, ...args);
    };
  });
}

async function limitNativeQuota(page) {
  const cdp = await page.context().newCDPSession(page);
  // L’override appartient à la session : la fermer ici rétablirait le quota avant l’écriture.
  // Le navigateur jetable ferme cette session dans le finally du scénario.
  await cdp.send('Storage.overrideQuotaForOrigin', {origin: 'file://', quotaSize: 400000});
}
module.exports = {rejectLargeWrites, limitNativeQuota};
