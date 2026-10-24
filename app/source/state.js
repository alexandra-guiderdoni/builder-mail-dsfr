/* Changements atomiques du modèle en mémoire, sauvegardes séquencées et observables.
   Le texte visible #save-state change à chaque étape ; la région vocale #save-announce n’annonce que les erreurs, tout de suite,
   et un seul succès après 1 000 ms sans modification, une fois l’écriture réellement terminée. La temporisation ne retarde jamais une écriture. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, get = id => document.getElementById(id);
  let queue = Promise.resolve(), revision = 0, pending = 0, token = null, failed = false, restoring = false, running = false, latest, absent = false, lastChange = 0, successTimer = null;
  const QUIET_MS = 1000;
  const cancelSuccess = () => { clearTimeout(successTimer); successTimer = null; };
  const say = text => { cancelSuccess(); get("save-announce").textContent = text; };
  const show = (text, now = false) => { get("save-state").textContent = text; if (now) say(text); };
  function announceSuccess(text) {
    cancelSuccess(); const expected = revision;
    successTimer = setTimeout(() => { successTimer = null; if (expected === revision && !pending && !failed) get("save-announce").textContent = text; }, Math.max(0, QUIET_MS - (Date.now() - lastChange)));
  }
  A.library = M.initial(); A.selected = A.library.documents[0].blocks[0].id;
  A.invalid = new Set(); A.drafts = new Map(); A.ready = false; A.recoveryOnly = false; A.pendingInputs = 0;
  A.doc = () => A.library.documents.find(d => d.id === A.library.activeId);
  A.error = message => { const e = get("error"); e.textContent = message; e.hidden = !message; if (message) cancelSuccess(); };
  A.notice = message => { get("notice").textContent = message; };
  // Tant que le travail n’est pas sauvegardé, l’export de secours suit le message d’échec.
  function failing(value) { failed = value; get("save-rescue").hidden = !value; }
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
    if (A.recoveryOnly) { failing(true); show(absent ? "Modifications non sauvegardées : aucun stockage n’est disponible. Exportez votre bibliothèque." : "Modifications non sauvegardées : la bibliothèque enregistrée reste inchangée. Exportez votre bibliothèque.", true); return Promise.resolve(); }
    latest = {current: revision, library: A.library};
    cancelSuccess(); show("Sauvegarde en cours…");
    if (running) return queue;
    running = true; pending++;
    queue = Promise.resolve().then(async () => {
      try {
        while (latest) {
          const task = latest; latest = undefined;
          try {
            const saved = await A.Storage.save(task.library, token); token = saved.token;
            if (task.current === revision) { failing(false); if (!A.invalid.size && !A.drafts.size) A.error(""); const text = A.invalid.size || A.drafts.size ? "Bibliothèque sauvegardée ; les champs invalides restent non enregistrés." : "Bibliothèque sauvegardée dans ce navigateur."; show(text); announceSuccess(text); }
          } catch (cause) {
            failing(true); A.error(`${cause.message} ${cause.storage === "conflit" ? "Exportez la bibliothèque en mémoire pour conserver ce travail, puis rechargez cette page." : "Exportez la bibliothèque en mémoire pour conserver ce travail."}`);
            show("Modifications non sauvegardées. Exportez votre bibliothèque.", true);
          }
        }
      } finally { pending--; running = false; }
    });
    return queue;
  }
  function change(mutator, redraw = true, input = false) {
    if (input === "edit") guardEdit(); else if (restoring || !input) guard(); const next = M.copy(A.library); mutator(next); M.library(next); A.library = next; revision++; lastChange = Date.now(); pruneDrafts();
    if (!A.doc().blocks.some(b => b.id === A.selected)) A.selected = A.doc().blocks[0]?.id || null;
    if (redraw) A.UI.refresh(); else A.UI.preview();
    return save();
  }
  // Une restauration n’est annoncée qu’après relecture et validation de l’état précédent.
  async function restorable() { try { const previous = await A.Storage.load("previous"); return !!previous && !!M.library(previous.library); } catch { return false; } }
  async function start() {
    try {
      const record = await A.Storage.load();
      token = record?.token ?? null;
      if (record) A.library = M.copy(M.library(record.library));
      A.selected = A.doc().blocks[0]?.id || null;
      show(record ? "Bibliothèque restaurée depuis ce navigateur." : "Aucune sauvegarde : créez ou personnalisez une composition.", true);
    } catch (cause) {
      failing(true); A.recoveryOnly = true; absent = cause.storage === "absent";
      const advice = absent ? "Exportez la bibliothèque en mémoire pour conserver votre travail : la fermeture de cette page l’efface." : "Cette page n’écrit rien dans la bibliothèque locale : exportez la bibliothèque en mémoire pour conserver votre travail.";
      const restore = !cause.storage && await restorable() ? " Une sauvegarde précédente lisible existe : « Restaurer l’état précédent », dans « Fichiers et récupération », permet de la relire." : "";
      A.error(`${cause.message} ${advice}${restore}`);
      show(absent ? "Stockage indisponible : travail en mémoire seulement." : "Bibliothèque non restaurée.", true);
      if (absent) get("storage-help").textContent = "Aucun stockage n’est disponible dans ce navigateur : exportez une copie pour conserver votre travail.";
    }
    A.ready = true; get("workspace").disabled = false; A.UI.refresh();
  }
  async function recover() {
    guard(); restoring = true; pending++; get("workspace").disabled = true;
    try {
      await queue; const previous = await A.Storage.load("previous");
      if (!previous) throw new Error("Aucun état précédent disponible.");
      const restored = M.copy(M.library(previous.library)), saved = await A.Storage.save(restored, token);
      token = saved.token; A.library = restored; A.recoveryOnly = false; failing(false); revision++;
      A.selected = A.doc().blocks[0]?.id || null; A.UI.refresh(); A.error("");
      show("Bibliothèque sauvegardée dans ce navigateur."); announceSuccess("Bibliothèque sauvegardée dans ce navigateur.");
      A.notice("État précédent relu. Contrôlez les compositions avant de poursuivre.");
    } catch (cause) { show("Récupération impossible ; le travail actuel est conservé.", true); throw cause; }
    finally { restoring = false; pending--; get("workspace").disabled = false; }
  }
  window.addEventListener("beforeunload", event => { if (pending || failed || A.invalid.size || A.drafts.size || A.pendingInputs) { event.preventDefault(); event.returnValue = ""; } });
  // Les vues internes attendent les écritures en cours sans exiger leur succès : le travail reste en mémoire.
  async function settle() { await queue; guard(); }
  // Le rechargement et l’activation d’une mise à jour exigent, eux, une sauvegarde réussie.
  async function flush() { await settle(); if (failed || pending || A.recoveryOnly) throw new Error("La sauvegarde doit réussir avant de recharger l’application."); }
  const saved = () => !failed && !pending && !A.recoveryOnly;
  A.State = Object.freeze({guard, guardEdit, setDraft, dropDraft, dropFooterDraft, change, save, start, recover, settle, flush, saved});
})();
