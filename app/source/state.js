/* Changements atomiques du modèle en mémoire, sauvegardes séquencées et observables.
   Le texte visible #save-state change à chaque étape ; la région vocale #save-announce n’annonce que les erreurs, tout de suite,
   et un seul succès après 1 000 ms sans modification, une fois l’écriture réellement terminée. La temporisation ne retarde jamais une écriture. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, get = id => document.getElementById(id);
  let queue = Promise.resolve(), revision = 0, pending = 0, token = null, failed = false, restoring = false, running = false, latest, absent = false, lastChange = 0, successTimer = null;
  // Une fenêtre sans la main reste en lecture seule ; base est la bibliothèque relue ou écrite sous son jeton.
  let readOnly = null, base, exportedRevision = -1, leaving = false;
  const channel = window.BroadcastChannel ? new BroadcastChannel("builder-mail-dsfr-library") : null;
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
  // Dernier bloc retiré de chaque composition, en mémoire seulement : perdu à la fermeture de l’atelier.
  A.removed = new Map();
  A.doc = () => A.library.documents.find(d => d.id === A.library.activeId);
  A.error = message => { const e = get("error"); e.textContent = message; e.hidden = !message; if (message) cancelSuccess(); };
  // Les alertes persistantes (échec de sauvegarde, lecture seule) sont stockées : une erreur ponctuelle (A.error(""))
  // efface la vue sans détruire cette mémoire. `restoreErrorFromState` replace la persistante quand elle est pertinente.
  let persistentError = "";
  const setPersistentError = message => { persistentError = message; A.error(message); };
  let noticeTicket = 0;
  // Un écrivain différé passe le jeton relevé au départ : si une autre annonce est passée entre-temps, il se tait.
  A.notice = (message, since) => { if (since !== undefined && since !== noticeTicket) return; get("notice").textContent = message; noticeTicket++; };
  // Tant que le travail n’est pas sauvegardé, l’export de secours suit le message d’échec.
  // L’alerte persistante efface sa mémoire seulement quand plus aucune cause (échec ou lecture seule) ne la soutient (#122).
  function failing(value) { failed = value; get("save-rescue").hidden = !value || !!readOnly; if (!value && !readOnly) persistentError = ""; }
  const readOnlyError = () => new Error(readOnly === "version" ? "Cette fenêtre utilise une autre version de l’atelier : exportez la bibliothèque en mémoire, puis rechargez la page avant de reprendre la main." : readOnly === "stockage" ? "La bibliothèque enregistrée a disparu du stockage : exportez la bibliothèque en mémoire ou reprenez la main pour l’enregistrer de nouveau." : "Une autre fenêtre détient la bibliothèque : cette fenêtre est en lecture seule. Exportez la bibliothèque en mémoire ou reprenez la main.");
  function lock(kind, reason) {
    if (readOnly === "version") return;
    A.notice("");
    const editing = get("editing"), late = kind === "version", focused = editing.contains(document.activeElement) || (late && document.activeElement?.dataset.action === "take-over");
    readOnly = kind; editing.disabled = true; get("read-only").hidden = false;
    show(failed ? "Lecture seule : modifications non sauvegardées. Exportez votre bibliothèque." : "Lecture seule : cette fenêtre n’enregistre plus rien.", true); get("save-rescue").hidden = true;
    get("read-only-message").textContent = `${reason} Cette fenêtre n’enregistre plus rien. ${late ? "Exportez la bibliothèque en mémoire, puis rechargez cette page avant de reprendre la main." : kind === "stockage" ? "Exportez la bibliothèque en mémoire pour la conserver, ou reprenez la main : cette bibliothèque sera enregistrée de nouveau dans ce navigateur." : "Exportez la bibliothèque en mémoire pour la conserver, ou reprenez la main : les compositions modifiées ici seront ajoutées en copies, sans remplacer celles de l’autre fenêtre."}`;
    get("read-only").querySelector("[data-action=take-over]").hidden = late; get("read-only").querySelector("[data-action=reload-page]").hidden = !late;
    if (focused) get("read-only-title").focus();
  }
  function storageLock(cause) {
    if (cause.storage === "conflit") lock("conflit", "Une autre fenêtre a enregistré la bibliothèque après la dernière sauvegarde de celle-ci.");
    else if (cause.storage === "réinitialisé") lock("stockage", "La bibliothèque enregistrée a disparu du stockage de ce navigateur.");
  }
  // Saisies d’URL en cours : conservées hors du modèle tant qu’elles sont invalides, jamais diffusées.
  const draftKey = (doc, block, input) => `${doc}|${block}|${input}`;
  function guardEdit() { if (A.LegacyRecovery?.pending()) throw new Error("Restaurez d’abord la bibliothèque ancienne après correction de ses adresses. Les données enregistrées restent intactes."); if (restoring) throw new Error("Attendez la fin de la récupération avant cette action."); if (A.pendingInputs) throw new Error("Attendez la fin du chargement du fichier avant cette action."); if (A.invalid.size) throw new Error("Corrigez les champs signalés ou annulez leur modification avant cette action."); }
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
      const i = Number(d.input.slice(prefix.length));
      if (i < index) continue;
      A.drafts.delete(key);
      if (i > index) moved.push({...d, input: prefix + (i - 1)});
    }
    for (const d of moved) A.drafts.set(draftKey(d.doc, d.block, d.input), d);
  }
  function pruneDrafts() {
    for (const [key, d] of [...A.drafts]) if (!A.library.documents.find(x => x.id === d.doc)?.blocks.some(b => b.id === d.block)) A.drafts.delete(key);
  }
  function save() {
    if (restoring) throw new Error("Attendez la fin de la récupération avant de sauvegarder.");
    if (readOnly) throw readOnlyError();
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
            const saved = await A.Storage.save(task.library, token); token = saved.token; base = task.library;
            if (task.current === revision && !readOnly) { failing(false); if (!A.invalid.size && !A.drafts.size) A.error(""); const text = A.invalid.size || A.drafts.size ? "Bibliothèque sauvegardée ; les champs invalides restent non enregistrés." : "Bibliothèque sauvegardée dans ce navigateur."; show(text); announceSuccess(text); }
          } catch (cause) {
            failing(true); setPersistentError(`${cause.message} ${cause.storage === "conflit" ? "Exportez la bibliothèque en mémoire pour conserver ce travail, puis rechargez cette page." : "Exportez la bibliothèque en mémoire pour conserver ce travail."}`);
            show("Modifications non sauvegardées. Exportez votre bibliothèque.", true);
            storageLock(cause);
          }
        }
      } finally { pending--; running = false; }
    });
    return queue;
  }
  // L’aperçu relit tout le courriel et ses images. Après une frappe, il suit l’affichage du caractère ; si sa dernière
  // mise à jour complète a dépassé 50 ms, il attend en plus une pause de frappe triple de cette durée.
  // Un rafraîchissement complet remplace l’aperçu encore en attente ; le résumé de la composition suit aussitôt.
  let previewTimer, previewCost = 0;
  function previewAfterInput() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => requestAnimationFrame(() => setTimeout(() => {
      // Preview possède l'élément, qui peut être retiré pendant la confirmation.
      // Son coût exclut le temps passé dans la modale et les navigations remplacées.
      A.UI.preview(cost => { previewCost = cost; });
    })), previewCost > 50 ? 3 * previewCost : 0);
  }
  function change(mutator, redraw = true, input = false) {
    if (readOnly) throw readOnlyError();
    if (input === "edit") guardEdit(); else if (restoring || !input) guard(); const next = M.copy(A.library); mutator(next); M.library(next); A.library = next; revision++; lastChange = Date.now(); pruneDrafts();
    if (!A.doc().blocks.some(b => b.id === A.selected)) A.selected = A.doc().blocks[0]?.id || null;
    if (redraw) { clearTimeout(previewTimer); A.UI.refresh(); } else { A.UI.summary(); previewAfterInput(); }
    return save();
  }
  // Une restauration n’est annoncée qu’après relecture et validation de l’état précédent.
  async function restorable() { try { const previous = await A.Storage.load("previous"); return !!previous && !!M.library(previous.library); } catch { return false; } }
  async function start() {
    let record;
    try {
      record = await A.Storage.load();
      token = record?.token ?? null; opened = true;
      if (record) A.library = M.copy(M.library(record.library));
      A.selected = A.doc().blocks[0]?.id || null;
      show(record ? "Bibliothèque restaurée depuis ce navigateur." : "Aucune sauvegarde : créez ou personnalisez une composition.", true);
    } catch (cause) {
      failing(true); A.recoveryOnly = true; absent = cause.storage === "absent";
      const legacy = record && A.LegacyRecovery?.offer(record);
      const advice = legacy ? "Les données enregistrées sont conservées : utilisez la récupération guidée ci-dessous pour corriger les anciennes adresses." : record ? "Les données enregistrées restent intactes : utilisez « Exporter les données enregistrées brutes », dans « Fichiers et récupération », pour les conserver." : absent ? "Exportez la bibliothèque en mémoire pour conserver votre travail : la fermeture de cette page l’efface." : "Cette page n’écrit rien dans la bibliothèque locale : exportez la bibliothèque en mémoire pour conserver votre travail.";
      const restore = !legacy && !cause.storage && await restorable() ? " Une sauvegarde précédente lisible existe : « Restaurer l’état précédent », dans « Fichiers et récupération », permet de la relire." : "";
      setPersistentError(`${cause.message} ${advice}${restore}`);
      show(absent ? "Stockage indisponible : travail en mémoire seulement." : "Bibliothèque non restaurée.", true);
      if (absent) get("storage-help").textContent = "Aucun stockage n’est disponible dans ce navigateur : exportez une copie pour conserver votre travail.";
    }
    base = A.library; A.ready = true; get("workspace").disabled = !!A.LegacyRecovery?.pending(); A.UI.refresh();
    if (A.LegacyRecovery?.pending()) { get("save-rescue").hidden = true; get("library-count").textContent = A.LegacyRecovery.summary(); }
  }
  async function restoreLegacy(library, expectedToken) {
    if (!A.LegacyRecovery?.pending() || restoring || running || A.pendingInputs) throw new Error("Aucune récupération ancienne disponible ou une opération est déjà en cours.");
    const restored = M.copy(M.library(library));
    const ticket = noticeTicket;
    restoring = true; pending++;
    try {
      if (readOnly) throw readOnlyError();
      const saved = await A.Storage.save(restored, expectedToken);
      token = saved.token; base = A.library = restored; A.recoveryOnly = false; failing(false); revision++;
      A.selected = A.doc().blocks[0]?.id || null; A.LegacyRecovery.close(); A.UI.refresh();
      if (readOnly) show("Bibliothèque corrigée enregistrée ; cette fenêtre reste en lecture seule.", true);
      else { A.error(""); show("Bibliothèque corrigée restaurée et sauvegardée dans ce navigateur.", true); A.notice("Vos compositions sont retrouvées. L’original est conservé comme état précédent.", ticket); get("home-title").focus(); }
    } catch (cause) {
      if (!A.recoveryOnly) throw cause;
      throw new Error(`${cause.message} La récupération n’a rien enregistré ; conservez les données brutes et rechargez l’atelier avant de réessayer.`);
    } finally { restoring = false; pending--; get("workspace").disabled = !!A.LegacyRecovery?.pending(); }
  }
  async function recover() {
    guard(); const ticket = noticeTicket; if (A.recoveryOnly && !opened) { offerReopen(ticket); return; }
    restoring = true; pending++; get("workspace").disabled = true;
    try {
      if (readOnly) throw readOnlyError();
      await queue; const previous = await A.Storage.load("previous");
      if (!previous) throw new Error("Aucun état précédent disponible.");
      const restored = M.copy(M.library(previous.library)), saved = await A.Storage.save(restored, token);
      token = saved.token; base = A.library = restored; A.recoveryOnly = false; failing(false); revision++;
      A.selected = A.doc().blocks[0]?.id || null; A.UI.refresh(); A.error("");
      show("Bibliothèque sauvegardée dans ce navigateur."); announceSuccess("Bibliothèque sauvegardée dans ce navigateur.");
      A.notice("État précédent relu. Contrôlez les compositions avant de poursuivre.", ticket);
    } catch (cause) {
      show("Récupération impossible ; le travail actuel est conservé.", true);
      storageLock(cause);
      throw cause;
    }
    finally { restoring = false; pending--; get("workspace").disabled = false; }
  }
  // Le jeton du stockage n'est connu qu'après une lecture réussie. Après un refus initial, une restauration écrirait avec un jeton nul
  // et signalerait un faux conflit ; relire le jeton pour forcer l'écriture écraserait une autre fenêtre. La page n'écrit donc rien :
  // elle propose d'exporter le travail temporaire, puis de recharger pour relire la bibliothèque enregistrée avec son vrai jeton.
  let opened = false;
  function offerReopen(ticket) {
    let box = document.getElementById("reopen-offer");
    if (!box) {
      box = document.createElement("section"); box.id = "reopen-offer"; box.className = "save-panel"; box.setAttribute("aria-labelledby", "reopen-title");
      box.innerHTML = '<h2 class="fr-h5" id="reopen-title" tabindex="-1">Exporter le travail temporaire, puis recharger</h2><p id="reopen-text"></p><div class="actions"><button class="fr-btn" type="button" id="reopen-export">Exporter le travail temporaire</button><button class="fr-btn fr-btn--secondary" type="button" id="reopen-reload">Recharger l’atelier</button></div>';
      document.getElementById("error").insertAdjacentElement("afterend", box);
      document.getElementById("reopen-export").addEventListener("click", () => { try { A.Actions["export-library"](); } catch (cause) { A.error(cause.message); } });
      document.getElementById("reopen-reload").addEventListener("click", () => location.reload());
    }
    const storage = !!window.indexedDB;
    document.getElementById("reopen-text").textContent = storage
      ? "Le navigateur a refusé l’ouverture de la bibliothèque enregistrée au démarrage. Cette page n’y a rien écrit et ne peut pas la restaurer sans risquer d’écraser une autre fenêtre. Exportez d’abord le travail temporaire affiché ici, puis rechargez l’atelier : il relira la bibliothèque enregistrée. Le navigateur peut demander une confirmation avant de recharger ; confirmez une fois le fichier exporté, puis importez-le pour retrouver ce travail."
      : "Aucun stockage n’est disponible dans ce navigateur : cette page n’a rien à restaurer. Exportez le travail temporaire pour le conserver, la fermeture de cette page l’efface.";
    document.getElementById("reopen-reload").hidden = !storage; box.hidden = false;
    document.getElementById("reopen-title").focus();
    A.notice("Restauration non lancée : aucune écriture n’a été faite dans la bibliothèque enregistrée.", ticket);
  }
  function rebase(stored) {
    const memory = M.copy(A.library), now = new Date(), stamp = ` · copie à ${now.getHours()} h ${String(now.getMinutes()).padStart(2, "0")}`;
    const drafts = new Map(A.drafts);
    let selected = A.selected;
    if (!stored) return {library: M.library(memory), copies: 0, drafts, selected};
    const next = M.copy(stored), same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    let copies = 0, active = next.documents.some(d => d.id === memory.activeId) ? memory.activeId : next.activeId;
    for (const list of ["documents", "templates", "identities"]) {
      const before = new Map((base?.[list] || []).map(item => [item.id, item])), kept = new Map(next[list].map(item => [item.id, item]));
      for (const item of memory[list]) {
        const pendingDrafts = list === "documents" ? [...A.drafts.values()].filter(d => d.doc === item.id) : [];
        if (!pendingDrafts.length && (same(before.get(item.id), item) || same(kept.get(item.id), item))) continue;
        const copy = list === "identities" ? {...item, id: M.id(), name: item.name + stamp, blocks: item.blocks.map(b => ({...b, id: M.id()}))} : M.clone(item, item.name + stamp);
        next[list].push(copy); copies++;
        // Le brouillon reste hors du modèle, rattaché au bloc de la copie récupérable.
        for (const draft of pendingDrafts) {
          const index = item.blocks.findIndex(b => b.id === draft.block);
          if (index < 0) continue;
          drafts.delete(draftKey(draft.doc, draft.block, draft.input));
          const moved = {...draft, doc: copy.id, block: copy.blocks[index].id};
          drafts.set(draftKey(moved.doc, moved.block, moved.input), moved);
        }
        if (list === "documents" && item.id === memory.activeId) {
          active = copy.id;
          const selectedIndex = item.blocks.findIndex(b => b.id === selected);
          selected = copy.blocks[selectedIndex]?.id || null;
        }
      }
    }
    next.activeId = active; return {library: M.library(next), copies, drafts, selected};
  }
  async function takeOver() {
    if (!readOnly) throw new Error("Cette fenêtre détient déjà la bibliothèque.");
    if (readOnly === "version") throw readOnlyError();
    if (restoring) throw new Error("Attendez la fin de l’opération en cours avant de reprendre la main.");
    if (A.pendingInputs) throw new Error("Attendez la fin du chargement du fichier avant de reprendre la main.");
    restoring = true; pending++; get("workspace").disabled = true; A.notice(""); const ticket = noticeTicket; show("Reprise de la main en cours…");
    try {
      await queue; const record = await A.Storage.load();
      if (record?.app && record.app !== A.Storage.version) { lock("version", "La bibliothèque a été enregistrée par une autre version de l’atelier."); throw readOnlyError(); }
      const {library, copies, drafts, selected} = rebase(record ? M.copy(M.library(record.library)) : null);
      if (readOnly === "version") throw readOnlyError();
      const saved = await A.Storage.save(library, record?.token ?? null);
      token = saved.token; base = A.library = library; A.drafts = drafts; A.selected = selected; revision++; failing(false); A.recoveryOnly = false;
      channel?.postMessage({type: "takeover", token: saved.token});
      if (!A.doc().blocks.some(b => b.id === A.selected)) A.selected = A.doc().blocks[0]?.id || null;
      // Un retard signalé pendant l’écriture garde la lecture seule : la bibliothèque écrite est déjà en mémoire.
      if (readOnly === "version") { A.UI.refresh(); show("Bibliothèque sauvegardée ; cette fenêtre reste en lecture seule : exportez puis rechargez-la.", true); return; }
      readOnly = null;
      get("editing").disabled = false; get("read-only").hidden = true; A.invalid.clear(); A.UI.clearFieldErrors();
      A.UI.refresh(); A.error("");
      const savedText = A.drafts.size ? "Bibliothèque sauvegardée ; les champs invalides restent non enregistrés." : "Bibliothèque sauvegardée dans ce navigateur.";
      show(savedText); announceSuccess(savedText); get(get("editor-page").hidden ? "home-title" : "composition-title").focus();
      A.notice(!record ? "Main reprise : la bibliothèque en mémoire est enregistrée de nouveau dans ce navigateur." : copies ? `Main reprise : ${copies > 1 ? `${copies} copies horodatées ajoutées` : "une copie horodatée ajoutée"} à la bibliothèque enregistrée, sans rien remplacer. L’autre fenêtre ne peut plus enregistrer ; elle passe en lecture seule au plus tard à sa prochaine modification.` : "Main reprise : rien n’avait changé dans cette fenêtre, la bibliothèque enregistrée est conservée telle quelle.", ticket);
    } catch (cause) {
      show("Reprise impossible : rien n’a été enregistré.", true);
      if (readOnly === "version") throw cause;
      throw new Error(`${cause.message} Rien n’a été enregistré : exportez la bibliothèque en mémoire pour conserver le travail de cette fenêtre.`);
    } finally { restoring = false; pending--; get("workspace").disabled = false; }
  }
  channel?.addEventListener("message", event => {
    if (!A.ready || event.data?.type !== "takeover" || event.data.token === token) return;
    lock("reprise", "Une autre fenêtre a repris la main sur la bibliothèque."); setPersistentError("Une autre fenêtre a repris la main sur la bibliothèque : cette fenêtre passe en lecture seule.");
  });
  function outdated() { lock("version", "Une nouvelle version de l’atelier est active dans une autre fenêtre."); setPersistentError("Une nouvelle version de l’atelier est active dans une autre fenêtre : cette fenêtre passe en lecture seule."); }
  const exported = () => { exportedRevision = revision; };
  function reload() {
    if ((failed || pending || A.invalid.size || A.pendingInputs) && exportedRevision !== revision) throw new Error("Exportez d’abord la bibliothèque en mémoire : le rechargement efface le travail non enregistré de cette fenêtre.");
    // Un export du modèle ne contient pas les brouillons : laisser beforeunload demander l’abandon.
    leaving = !A.drafts.size; location.reload();
  }
  window.addEventListener("beforeunload", event => { if (leaving) return; if (pending || failed || A.invalid.size || A.drafts.size || A.pendingInputs) { event.preventDefault(); event.returnValue = ""; } });
  // Les vues internes attendent les écritures en cours sans exiger leur succès : le travail reste en mémoire.
  async function settle() { await queue; guard(); }
  // Le rechargement et l’activation d’une mise à jour exigent, eux, une sauvegarde réussie.
  async function flush() { await settle(); if (failed || pending || A.recoveryOnly) throw new Error("La sauvegarde doit réussir avant de recharger l’application."); }
  const saved = () => !failed && !pending && !A.recoveryOnly;
  const restoreErrorFromState = () => { if ((failed || readOnly) && persistentError) A.error(persistentError); };
  A.State = Object.freeze({guard, guardEdit, setDraft, dropDraft, dropFooterDraft, change, save, start, restoreLegacy, recover, settle, flush, saved, takeOver, outdated, reload, exported, noticeTicket: () => noticeTicket, restoreErrorFromState});
})();
