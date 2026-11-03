/* Une transaction conserve l’état courant et le dernier état précédent. */
(() => {
  "use strict";
  const A = window.MailBuilder; let opening;
  // Chaque enregistrement nomme la version de l’application qui l’a écrit.
  const version = document.querySelector('meta[name="application-version"]')?.content || "";
  // Chaque refus nomme son cas, dont une disparition distincte d’un jeton concurrent.
  const failure = (storage, message) => Object.assign(new Error(message), {storage});
  function database() {
    if (!opening) {
      const attempt = new Promise((resolve, reject) => {
      let settled = false, request;
      const refused = (kind, message) => { settled = true; reject(failure(kind, message)); };
      if (!window.indexedDB) { refused("absent", "Stockage indisponible dans ce navigateur : rien n’y est enregistré ni relu."); return; }
      try { request = indexedDB.open("builder-mail-dsfr-library", 1); } catch { refused("inaccessible", "Stockage du navigateur inaccessible : le navigateur refuse son ouverture."); return; }
      request.onupgradeneeded = () => request.result.createObjectStore("library");
      request.onerror = () => refused("inaccessible", "Stockage du navigateur inaccessible : le navigateur refuse son ouverture.");
      request.onblocked = () => refused("inaccessible", "Stockage du navigateur inaccessible : fermez les autres fenêtres de l’atelier pour l’ouvrir.");
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
      tx.onerror = tx.onabort = () => reject(failure("inaccessible", "Stockage du navigateur inaccessible : lecture impossible ; les données présentes ne sont pas remplacées."));
    });
  }
  // Motifs d’un remplacement voulu (#208) : une fenêtre concurrente les annonce au lieu d’un conflit ou d’une disparition.
  const REASONS = {remplacement: "Vos newsletters ont été remplacées par une sauvegarde restaurée dans une autre fenêtre : vos dernières modifications ne sont pas enregistrées ici.",
    effacement: "Vos newsletters ont été effacées dans une autre fenêtre : vos dernières modifications ne sont pas enregistrées ici."};
  // Une seule transaction contrôle le jeton puis écrit. Une sauvegarde ordinaire garde l’état courant comme état précédent ;
  // un remplacement le garde ou l’efface selon l’appelant, et marque l’enregistrement de son motif.
  async function write(value, expectedToken, {reason, keepPrevious = true} = {}) {
    const snapshot = A.Model.copy(A.Model.library(value)), db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("library", "readwrite"), store = tx.objectStore("library"), previous = store.get("current");
      const record = {token: crypto.randomUUID(), library: snapshot, app: version, ...(reason ? {reason} : {})}; let conflict, refusal;
      previous.onsuccess = () => {
        const found = previous.result;
        if ((found?.token ?? null) !== expectedToken) { conflict = !found ? "réinitialisé" : REASONS[found.reason] ? found.reason : "conflit"; tx.abort(); return; }
        try { if (keepPrevious && found) store.put(found, "previous"); else if (!keepPrevious) store.delete("previous"); if (reason === "effacement") store.delete("meta"); store.put(record, "current"); }
        catch (cause) { refusal = cause; tx.abort(); }
      };
      tx.oncomplete = () => resolve(record);
      // Le quota peut être refusé par l’écriture, par la requête ou à la validation de la transaction.
      tx.onerror = tx.onabort = event => {
        const name = (refusal || tx.error || event?.target?.error)?.name;
        reject(conflict ? failure(conflict, conflict === "conflit" ? "Une autre fenêtre a modifié vos newsletters : vos dernières modifications ne sont pas enregistrées ici." : conflict === "réinitialisé" ? "Les newsletters enregistrées ont disparu du stockage : vos dernières modifications restent en mémoire seulement." : REASONS[conflict])
          : name === "QuotaExceededError" ? failure("saturé", "Espace de stockage saturé : vos dernières modifications ne sont pas enregistrées.")
          : failure("inaccessible", "Stockage du navigateur inaccessible : vos dernières modifications ne sont pas enregistrées."));
      };
    });
  }
  const save = (value, expectedToken) => write(value, expectedToken);
  // Métadonnées de sauvegarde (#199), hors du modèle : dernier export complet proposé et première modification depuis.
  // Indicatives : leur échec n’empêche aucune sauvegarde ; « Tout effacer » les supprime avec la bibliothèque.
  async function loadMeta() { return (await load("meta")) || {}; }
  async function saveMeta(meta) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("library", "readwrite"); tx.objectStore("library").put(meta, "meta");
      tx.oncomplete = () => resolve(meta);
      tx.onerror = tx.onabort = () => reject(failure("inaccessible", "Stockage du navigateur inaccessible : la date du dernier export n’est pas enregistrée."));
    });
  }
  const replace = (value, expectedToken, {reason, keepPrevious}) => write(value, expectedToken, {reason, keepPrevious});
  A.Storage = Object.freeze({load, save, replace, loadMeta, saveMeta, reasons: Object.keys(REASONS), version});
})();
