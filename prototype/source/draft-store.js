/* Stockage de recette uniquement : une base et un brouillon réservés au prototype. */
(() => {
  "use strict";
  let opening;
  function database() {
    if (!opening) opening = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error("Stockage local indisponible : exportez le fichier de travail.")); return; }
      const request = indexedDB.open("prototype-builder-mail-dsfr-v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("drafts");
      request.onerror = () => reject(new Error("Le navigateur refuse le stockage local. Exportez votre composition."));
      request.onblocked = () => reject(new Error("Fermez les autres fenêtres du prototype pour ouvrir le brouillon."));
      request.onsuccess = () => resolve(request.result);
    });
    return opening;
  }
  async function run(mode, action) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("drafts", mode);
      const request = action(tx.objectStore("drafts"));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(new Error("La sauvegarde ou la lecture a échoué. Le fichier de travail reste votre solution de récupération."));
    });
  }
  const save = doc => run("readwrite", store => store.put({doc: MailDocument.copy(doc), savedAt: new Date().toISOString()}, "current"));
  const load = () => run("readonly", store => store.get("current"));
  window.PrototypeDraft = Object.freeze({save, load});
})();
