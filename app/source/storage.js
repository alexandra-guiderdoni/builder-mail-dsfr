/* Une transaction conserve l’état courant et le dernier état précédent. */
(() => {
  "use strict";
  const A = window.MailBuilder; let opening;
  // Chaque enregistrement nomme la version de l’application qui l’a écrit.
  const version = document.querySelector('meta[name="application-version"]')?.content || "";
  function database() {
    if (!opening) {
      const attempt = new Promise((resolve, reject) => {
      let settled = false;
      const refused = message => { settled = true; reject(new Error(message)); };
      if (!window.indexedDB) { refused("Stockage indisponible. Exportez votre composition avant de fermer."); return; }
      const request = indexedDB.open("builder-mail-dsfr-library", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("library");
      request.onerror = () => refused("Le navigateur refuse l’ouverture de la bibliothèque locale.");
      request.onblocked = () => refused("Fermez les autres fenêtres de l’atelier pour ouvrir la bibliothèque.");
      request.onsuccess = () => {
        const db = request.result;
        if (settled) { db.close(); return; }
        settled = true;
        const forget = () => { if (opening === attempt) opening = undefined; };
        db.onversionchange = () => { db.close(); forget(); }; db.onclose = forget; resolve(db);
      };
      });
      opening = attempt;
      attempt.catch(() => { if (opening === attempt) opening = undefined; });
    }
    return opening;
  }
  async function load(key = "current") {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("library", "readonly"), request = tx.objectStore("library").get(key);
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(new Error("Lecture impossible. Les données présentes ne sont pas remplacées."));
    });
  }
  async function save(value, expectedToken) {
    const snapshot = A.Model.copy(A.Model.library(value)), db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("library", "readwrite"), store = tx.objectStore("library"), previous = store.get("current");
      const record = {token: crypto.randomUUID(), library: snapshot, app: version}; let conflict = false;
      previous.onsuccess = () => {
        if ((previous.result?.token ?? null) !== expectedToken) { conflict = true; tx.abort(); return; }
        try { if (previous.result) store.put(previous.result, "previous"); store.put(record, "current"); }
        catch { tx.abort(); }
      };
      tx.oncomplete = () => resolve(record);
      tx.onerror = tx.onabort = () => reject(conflict ? Object.assign(new Error("Une autre fenêtre a modifié la bibliothèque : vos dernières modifications ne sont pas enregistrées ici."), {storage: "conflit"}) : new Error("Bibliothèque non sauvegardée : stockage refusé ou saturé. Exportez les données avant de fermer."));
    });
  }
  A.Storage = Object.freeze({load, save, version});
})();
