/* Changements atomiques du modèle en mémoire, sauvegardes séquencées et observables. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, get = id => document.getElementById(id);
  let queue = Promise.resolve(), revision = 0, pending = 0, token = null, failed = false, restoring = false, running = false, latest;
  // Une fenêtre sans la main reste en lecture seule ; base est la bibliothèque relue ou écrite sous son jeton.
  let readOnly = null, base, exportedRevision = -1, leaving = false;
  const channel = window.BroadcastChannel ? new BroadcastChannel("builder-mail-dsfr-library") : null;
  A.library = M.initial(); A.selected = A.library.documents[0].blocks[0].id;
  A.invalid = new Set(); A.ready = false; A.recoveryOnly = false; A.pendingInputs = 0;
  A.doc = () => A.library.documents.find(d => d.id === A.library.activeId);
  A.error = message => { const e = document.getElementById("error"); e.textContent = message; e.hidden = !message; };
  A.notice = message => { document.getElementById("notice").textContent = message; };
  const readOnlyError = () => new Error(readOnly === "version" ? "Cette fenêtre utilise une autre version de l’atelier : exportez la bibliothèque en mémoire, puis rechargez la page avant de reprendre la main." : "Une autre fenêtre détient la bibliothèque : cette fenêtre est en lecture seule. Exportez la bibliothèque en mémoire ou reprenez la main.");
  function lock(kind, reason) {
    if (readOnly === "version") return;
    const editing = get("editing"), late = kind === "version", focused = editing.contains(document.activeElement) || (late && document.activeElement?.dataset.action === "take-over");
    readOnly = kind; editing.disabled = true; get("read-only").hidden = false;
    get("save-state").textContent = failed ? "Lecture seule : modifications non sauvegardées. Exportez votre bibliothèque." : "Lecture seule : cette fenêtre n’enregistre plus rien.";
    get("read-only-message").textContent = `${reason} Cette fenêtre n’enregistre plus rien. ${late ? "Exportez la bibliothèque en mémoire, puis rechargez cette page avant de reprendre la main." : "Exportez la bibliothèque en mémoire pour la conserver, ou reprenez la main : les compositions modifiées ici seront ajoutées en copies, sans remplacer celles de l’autre fenêtre."}`;
    get("read-only").querySelector("[data-action=take-over]").hidden = late; get("read-only").querySelector("[data-action=reload-page]").hidden = !late;
    if (focused) get("read-only-title").focus();
  }
  function guard() { if (restoring) throw new Error("Attendez la fin de la récupération avant cette action."); if (A.pendingInputs) throw new Error("Attendez la fin du chargement du fichier avant cette action."); if (A.invalid.size) throw new Error("Corrigez les champs signalés ou annulez leur modification avant cette action."); }
  function save() {
    if (restoring) throw new Error("Attendez la fin de la récupération avant de sauvegarder.");
    if (readOnly) throw readOnlyError();
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
            const saved = await A.Storage.save(task.library, token); token = saved.token; base = task.library;
            if (task.current === revision) { failed = false; if (!A.invalid.size) A.error(""); document.getElementById("save-state").textContent = A.invalid.size ? "Bibliothèque sauvegardée ; les champs invalides restent non enregistrés." : "Bibliothèque sauvegardée dans ce navigateur."; }
          } catch (cause) {
            failed = true; A.error(cause.message); document.getElementById("save-state").textContent = "Modifications non sauvegardées. Exportez votre bibliothèque.";
            if (cause.storage === "conflit") lock("conflit", "Une autre fenêtre a enregistré la bibliothèque après la dernière sauvegarde de celle-ci.");
          }
        }
      } finally { pending--; running = false; }
    });
    return queue;
  }
  function change(mutator, redraw = true, input = false) {
    if (readOnly) throw readOnlyError();
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
    base = A.library; A.ready = true; document.getElementById("workspace").disabled = false; A.UI.refresh();
  }
  async function recover() {
    guard(); restoring = true; pending++; document.getElementById("workspace").disabled = true;
    try {
      if (readOnly) throw readOnlyError();
      await queue; const previous = await A.Storage.load("previous");
      if (!previous) throw new Error("Aucun état précédent disponible.");
      const restored = M.copy(M.library(previous.library)), saved = await A.Storage.save(restored, token);
      token = saved.token; base = A.library = restored; A.recoveryOnly = false; failed = false; revision++;
      A.selected = A.doc().blocks[0]?.id || null; A.UI.refresh(); A.error("");
      document.getElementById("save-state").textContent = "Bibliothèque sauvegardée dans ce navigateur.";
      A.notice("État précédent relu. Contrôlez les compositions avant de poursuivre.");
    } catch (cause) { document.getElementById("save-state").textContent = "Récupération impossible ; le travail actuel est conservé."; throw cause; }
    finally { restoring = false; pending--; document.getElementById("workspace").disabled = false; }
  }
  // Ajoute en copies horodatées ce que cette fenêtre a modifié depuis sa base, sans rien remplacer du stockage relu.
  function rebase(stored) {
    const memory = M.copy(A.library), now = new Date(), stamp = ` · copie à ${now.getHours()} h ${String(now.getMinutes()).padStart(2, "0")}`;
    if (!stored) return {library: M.library(memory), copies: 0};
    const next = M.copy(stored), same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    let copies = 0, active = next.documents.some(d => d.id === memory.activeId) ? memory.activeId : next.activeId;
    for (const list of ["documents", "templates", "identities"]) {
      const before = new Map((base?.[list] || []).map(item => [item.id, item])), kept = new Map(next[list].map(item => [item.id, item]));
      for (const item of memory[list]) {
        if (same(before.get(item.id), item) || same(kept.get(item.id), item)) continue;
        const copy = list === "identities" ? {...item, id: M.id(), name: item.name + stamp, blocks: item.blocks.map(b => ({...b, id: M.id()}))} : M.clone(item, item.name + stamp);
        next[list].push(copy); copies++;
        if (list === "documents" && item.id === memory.activeId) active = copy.id;
      }
    }
    next.activeId = active; return {library: M.library(next), copies};
  }
  async function takeOver() {
    if (!readOnly) throw new Error("Cette fenêtre détient déjà la bibliothèque.");
    if (readOnly === "version") throw readOnlyError();
    if (restoring) throw new Error("Attendez la fin de l’opération en cours avant de reprendre la main.");
    restoring = true; pending++; get("workspace").disabled = true; A.notice(""); get("save-state").textContent = "Reprise de la main en cours…";
    try {
      await queue; const record = await A.Storage.load();
      if (record?.app && record.app !== A.Storage.version) { lock("version", "La bibliothèque a été enregistrée par une autre version de l’atelier."); throw readOnlyError(); }
      const {library, copies} = rebase(record ? M.copy(M.library(record.library)) : null), saved = await A.Storage.save(library, record?.token ?? null);
      token = saved.token; base = A.library = library; revision++; failed = false; readOnly = null; A.recoveryOnly = false;
      get("editing").disabled = false; get("read-only").hidden = true; A.invalid.clear(); A.UI.clearFieldErrors();
      if (!A.doc().blocks.some(b => b.id === A.selected)) A.selected = A.doc().blocks[0]?.id || null;
      A.UI.refresh(); A.error(""); get("save-state").textContent = "Bibliothèque sauvegardée dans ce navigateur."; get(get("editor-page").hidden ? "home-title" : "composition-title").focus();
      A.notice(copies ? `Main reprise : ${copies > 1 ? `${copies} copies horodatées ajoutées` : "une copie horodatée ajoutée"} à la bibliothèque enregistrée, sans rien remplacer. L’autre fenêtre n’enregistre plus rien et passe en lecture seule.` : "Main reprise : rien n’avait changé dans cette fenêtre, la bibliothèque enregistrée est conservée telle quelle.");
      channel?.postMessage({type: "takeover", token: saved.token});
    } catch (cause) {
      get("save-state").textContent = "Reprise impossible : rien n’a été enregistré.";
      if (readOnly === "version") throw cause;
      throw new Error(`${cause.message} Rien n’a été enregistré : exportez la bibliothèque en mémoire pour conserver le travail de cette fenêtre.`);
    } finally { restoring = false; pending--; get("workspace").disabled = false; }
  }
  channel?.addEventListener("message", event => {
    if (!A.ready || event.data?.type !== "takeover" || event.data.token === token) return;
    lock("reprise", "Une autre fenêtre a repris la main sur la bibliothèque."); A.error("Une autre fenêtre a repris la main sur la bibliothèque : cette fenêtre passe en lecture seule.");
  });
  function outdated() { lock("version", "Une nouvelle version de l’atelier est active dans une autre fenêtre."); A.error("Une nouvelle version de l’atelier est active dans une autre fenêtre : cette fenêtre passe en lecture seule."); }
  const exported = () => { exportedRevision = revision; };
  function reload() {
    if ((failed || pending || A.invalid.size || A.pendingInputs) && exportedRevision !== revision) throw new Error("Exportez d’abord la bibliothèque en mémoire : le rechargement efface le travail non enregistré de cette fenêtre.");
    leaving = true; location.reload();
  }
  window.addEventListener("beforeunload", event => { if (leaving) return; if (pending || failed || A.invalid.size || A.pendingInputs) { event.preventDefault(); event.returnValue = ""; } });
  async function flush() { await queue; guard(); if (failed || pending || A.recoveryOnly) throw new Error("La sauvegarde doit réussir avant de recharger l’application."); }
  A.State = Object.freeze({guard, change, save, start, recover, flush, takeOver, outdated, reload, exported});
})();
