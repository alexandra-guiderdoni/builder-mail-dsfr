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
  async function save(doc, expectedToken = null) {
    const snapshot = MailDocument.copy(doc), db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite"), store = tx.objectStore("drafts"), current = store.get("current");
      const record = {doc: snapshot, savedAt: new Date().toISOString(), token: crypto.randomUUID()}; let conflict = false;
      current.onsuccess = () => {
        if ((current.result?.token ?? null) !== expectedToken) { conflict = true; tx.abort(); return; }
        try { store.put(record, "current"); } catch { tx.abort(); }
      };
      tx.oncomplete = () => resolve(record);
      tx.onerror = tx.onabort = () => reject(new Error(conflict ? "Une autre fenêtre a modifié le brouillon. Exportez votre travail, puis rouvrez le brouillon pour reprendre la version enregistrée." : "Le brouillon n’a pas été sauvegardé. Exportez votre travail avant de fermer."));
    });
  }
  const load = () => run("readonly", store => store.get("current"));
  window.PrototypeDraft = Object.freeze({save, load});
})();
