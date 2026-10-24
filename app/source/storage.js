/* Une transaction conserve l’état courant et le dernier état précédent. */
(() => {
  "use strict";
  const A = window.MailBuilder; let opening;
  // Chaque enregistrement nomme la version de l’application qui l’a écrit.
  const version = document.querySelector('meta[name="application-version"]')?.content || "";
  // Chaque refus nomme son cas : stockage absent, inaccessible, saturé ou en conflit.
  const failure = (storage, message) => Object.assign(new Error(message), {storage});
  function database() {
    if (!opening) {
      const attempt = new Promise((resolve, reject) => {
      let settled = false, request;
      const refused = (kind, message) => { settled = true; reject(failure(kind, message)); };
      if (!window.indexedDB) { refused("absent", "Stockage indisponible dans ce navigateur : rien n’y est enregistré ni relu."); return; }
      try { request = indexedDB.open("builder-mail-dsfr-library", 1); } catch { refused("inaccessible", "Bibliothèque locale inaccessible : le navigateur refuse son ouverture."); return; }
      request.onupgradeneeded = () => request.result.createObjectStore("library");
      request.onerror = () => refused("inaccessible", "Bibliothèque locale inaccessible : le navigateur refuse son ouverture.");
      request.onblocked = () => refused("inaccessible", "Bibliothèque locale inaccessible : fermez les autres fenêtres de l’atelier pour l’ouvrir.");
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
      tx.onerror = tx.onabort = () => reject(failure("inaccessible", "Bibliothèque locale inaccessible : lecture impossible ; les données présentes ne sont pas remplacées."));
    });
  }
  async function save(value, expectedToken) {
    const snapshot = A.Model.copy(A.Model.library(value)), db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("library", "readwrite"), store = tx.objectStore("library"), previous = store.get("current");
      const record = {token: crypto.randomUUID(), library: snapshot, app: version}; let conflict = false, refusal;
      previous.onsuccess = () => {
        if ((previous.result?.token ?? null) !== expectedToken) { conflict = true; tx.abort(); return; }
        try { if (previous.result) store.put(previous.result, "previous"); store.put(record, "current"); }
        catch (cause) { refusal = cause; tx.abort(); }
      };
      tx.oncomplete = () => resolve(record);
      // Le quota peut être refusé par l’écriture, par la requête ou à la validation de la transaction.
      tx.onerror = tx.onabort = event => {
        const name = (refusal || tx.error || event?.target?.error)?.name;
        reject(conflict ? failure("conflit", "Une autre fenêtre a modifié la bibliothèque : vos dernières modifications ne sont pas enregistrées ici.")
          : name === "QuotaExceededError" ? failure("saturé", "Espace de stockage saturé : vos dernières modifications ne sont pas enregistrées.")
          : failure("inaccessible", "Bibliothèque locale inaccessible : vos dernières modifications ne sont pas enregistrées."));
      };
    });
  }
  A.Storage = Object.freeze({load, save, version});
})();
