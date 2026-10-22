/* Changements atomiques du modèle en mémoire, sauvegardes séquencées et observables. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model;
  let queue = Promise.resolve(), revision = 0, pending = 0, token = null, failed = false, restoring = false, running = false, latest;
  A.library = M.initial(); A.selected = A.library.documents[0].blocks[0].id;
  A.invalid = new Set(); A.ready = false; A.recoveryOnly = false; A.pendingInputs = 0;
  A.doc = () => A.library.documents.find(d => d.id === A.library.activeId);
  A.error = message => { const e = document.getElementById("error"); e.textContent = message; e.hidden = !message; };
  A.notice = message => { document.getElementById("notice").textContent = message; };
  function guard() { if (restoring) throw new Error("Attendez la fin de la récupération avant cette action."); if (A.pendingInputs) throw new Error("Attendez la fin du chargement du fichier avant cette action."); if (A.invalid.size) throw new Error("Corrigez les champs signalés ou annulez leur modification avant cette action."); }
  function save() {
    if (restoring) throw new Error("Attendez la fin de la récupération avant de sauvegarder.");
    if (A.recoveryOnly) { failed = true; document.getElementById("save-state").textContent = "Travail en mémoire : exportez-le. Le stockage existant reste intact jusqu’à récupération."; return Promise.resolve(); }
    latest = {current: revision, library: A.library};
    document.getElementById("save-state").textContent = "Sauvegarde en cours…";
    if (running) return queue;
    running = true; pending++;
    queue = Promise.resolve().then(async () => {
      try {
        while (latest) {
          const task = latest; latest = undefined;
          try {
            const saved = await A.Storage.save(task.library, token); token = saved.token;
            if (task.current === revision) { failed = false; if (!A.invalid.size) A.error(""); document.getElementById("save-state").textContent = A.invalid.size ? "Bibliothèque sauvegardée ; les champs invalides restent non enregistrés." : "Bibliothèque sauvegardée dans ce navigateur."; }
          } catch (cause) { failed = true; A.error(cause.message); document.getElementById("save-state").textContent = "Modifications non sauvegardées. Exportez votre bibliothèque."; }
        }
      } finally { pending--; running = false; }
    });
    return queue;
  }
  function change(mutator, redraw = true, input = false) {
    if (restoring || !input) guard(); const next = M.copy(A.library); mutator(next); M.library(next); A.library = next; revision++;
    if (!A.doc().blocks.some(b => b.id === A.selected)) A.selected = A.doc().blocks[0]?.id || null;
    if (redraw) A.UI.refresh(); else A.UI.preview();
    return save();
  }
  async function start() {
    try {
      const record = await A.Storage.load();
      token = record?.token ?? null;
      if (record) A.library = M.copy(M.library(record.library));
      A.selected = A.doc().blocks[0]?.id || null;
      document.getElementById("save-state").textContent = record ? "Bibliothèque restaurée depuis ce navigateur." : "Aucune sauvegarde : créez ou personnalisez une composition.";
    } catch (cause) { failed = true; A.recoveryOnly = true; A.error(`${cause.message} Les données enregistrées restent intactes ; le bouton de récupération permet de relire l’état précédent.`); document.getElementById("save-state").textContent = "Bibliothèque non restaurée."; }
    A.ready = true; document.getElementById("workspace").disabled = false; A.UI.refresh();
  }
  async function recover() {
    guard(); restoring = true; pending++; document.getElementById("workspace").disabled = true;
    try {
      await queue; const previous = await A.Storage.load("previous");
      if (!previous) throw new Error("Aucun état précédent disponible.");
      const restored = M.copy(M.library(previous.library)), saved = await A.Storage.save(restored, token);
      token = saved.token; A.library = restored; A.recoveryOnly = false; failed = false; revision++;
      A.selected = A.doc().blocks[0]?.id || null; A.UI.refresh(); A.error("");
      document.getElementById("save-state").textContent = "Bibliothèque sauvegardée dans ce navigateur.";
      A.notice("État précédent relu. Contrôlez les compositions avant de poursuivre.");
    } catch (cause) { document.getElementById("save-state").textContent = "Récupération impossible ; le travail actuel est conservé."; throw cause; }
    finally { restoring = false; pending--; document.getElementById("workspace").disabled = false; }
  }
  window.addEventListener("beforeunload", event => { if (pending || failed || A.invalid.size || A.pendingInputs) { event.preventDefault(); event.returnValue = ""; } });
  async function flush() { await queue; guard(); if (failed || pending || A.recoveryOnly) throw new Error("La sauvegarde doit réussir avant de recharger l’application."); }
  A.State = Object.freeze({guard, change, save, start, recover, flush});
})();
