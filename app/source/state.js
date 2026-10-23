/* Changements atomiques du modèle en mémoire, sauvegardes séquencées et observables. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model;
  let queue = Promise.resolve(), revision = 0, pending = 0, token = null, failed = false, restoring = false, running = false, latest;
  A.library = M.initial(); A.selected = A.library.documents[0].blocks[0].id;
  A.invalid = new Set(); A.drafts = new Map(); A.ready = false; A.recoveryOnly = false; A.pendingInputs = 0;
  A.doc = () => A.library.documents.find(d => d.id === A.library.activeId);
  A.error = message => { const e = document.getElementById("error"); e.textContent = message; e.hidden = !message; };
  A.notice = message => { document.getElementById("notice").textContent = message; };
  // Saisies d’URL en cours : conservées hors du modèle tant qu’elles sont invalides, jamais diffusées.
  const draftKey = (doc, block, input) => `${doc}|${block}|${input}`;
  function guardEdit() { if (restoring) throw new Error("Attendez la fin de la récupération avant cette action."); if (A.pendingInputs) throw new Error("Attendez la fin du chargement du fichier avant cette action."); if (A.invalid.size) throw new Error("Corrigez les champs signalés ou annulez leur modification avant cette action."); }
  function guard() {
    guardEdit();
    const draft = [...A.drafts.values()].find(d => d.doc === A.library.activeId);
    if (draft) {
      draft.shown = true;
      const error = new Error(`${draft.message} Corrigez ce lien ou annulez sa modification avant cette action.`);
      error.linkIssue = {block: draft.block, inputId: draft.input, message: draft.message}; throw error;
    }
  }
  function setDraft(doc, block, input, value, message) {
    const key = draftKey(doc, block, input), before = A.drafts.get(key);
    A.drafts.set(key, {doc, block, input, value, message, shown: before ? before.shown : false});
    return !before;
  }
  function dropDraft(doc, block, input) { A.drafts.delete(draftKey(doc, block, input)); }
  function dropFooterDraft(doc, block, index) {
    const prefix = "field-footer-url-", moved = [];
    for (const [key, d] of [...A.drafts]) {
      if (d.doc !== doc || d.block !== block || !d.input.startsWith(prefix)) continue;
      A.drafts.delete(key); const i = Number(d.input.slice(prefix.length));
      if (i > index) moved.push({...d, input: prefix + (i - 1)});
    }
    for (const d of moved) A.drafts.set(draftKey(d.doc, d.block, d.input), d);
  }
  function pruneDrafts() {
    for (const [key, d] of [...A.drafts]) if (!A.library.documents.find(x => x.id === d.doc)?.blocks.some(b => b.id === d.block)) A.drafts.delete(key);
  }
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
            if (task.current === revision) { failed = false; if (!A.invalid.size && !A.drafts.size) A.error(""); document.getElementById("save-state").textContent = A.invalid.size || A.drafts.size ? "Bibliothèque sauvegardée ; les champs invalides restent non enregistrés." : "Bibliothèque sauvegardée dans ce navigateur."; }
          } catch (cause) { failed = true; A.error(cause.message); document.getElementById("save-state").textContent = "Modifications non sauvegardées. Exportez votre bibliothèque."; }
        }
      } finally { pending--; running = false; }
    });
    return queue;
  }
  function change(mutator, redraw = true, input = false) {
    if (input === "edit") guardEdit(); else if (restoring || !input) guard(); const next = M.copy(A.library); mutator(next); M.library(next); A.library = next; revision++; pruneDrafts();
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
  window.addEventListener("beforeunload", event => { if (pending || failed || A.invalid.size || A.drafts.size || A.pendingInputs) { event.preventDefault(); event.returnValue = ""; } });
  async function flush() { await queue; guard(); if (failed || pending || A.recoveryOnly) throw new Error("La sauvegarde doit réussir avant de recharger l’application."); }
  A.State = Object.freeze({guard, guardEdit, setDraft, dropDraft, dropFooterDraft, change, save, start, recover, flush});
})();
