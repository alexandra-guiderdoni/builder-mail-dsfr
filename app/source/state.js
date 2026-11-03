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
  // Encart de sauvegarde (#199) : dernier export complet proposé, modifications depuis, conservation durable du stockage.
  let meta = {}, persistence = "inconnue", persistRequested = false, editorial = false;
  // Première visite (#205) : rien d’enregistré dans ce navigateur, ou retour après « Tout effacer ». La newsletter de départ
  // reste en mémoire sans être proposée ; elle est écartée à la première création et l’état cesse à la première modification.
  // La newsletter de départ est désignée par son identifiant, relevé à l’entrée en première visite (revue #205) : jamais par sa position.
  let fresh = false, starterId = null;
  const begin = value => { fresh = value; starterId = value ? A.library.documents[0]?.id ?? null : null; };
  const DAY = 864e5, REMINDER_DAYS = 7;
  const PERSISTENCE = {accordée: "Le navigateur s’engage à les conserver.", "non accordée": "Le navigateur peut les effacer s’il manque d’espace : exportez-les régulièrement.",
    indisponible: "Ce navigateur ne permet pas de demander leur conservation durable : exportez-les régulièrement.", erreur: "La demande de conservation durable a échoué : exportez-les régulièrement."};
  function storageInfo() {
    const help = get("storage-help"); if (!help || absent || A.recoveryOnly) return;
    const date = meta.exportedAt ? new Date(meta.exportedAt).toLocaleDateString("fr-FR", {day: "numeric", month: "long", year: "numeric"}) : "";
    help.textContent = [`Vos newsletters sont enregistrées dans ce navigateur, sur ce poste.`, date ? `Dernier export proposé le ${date}.` : "Aucun export proposé depuis ce navigateur.", PERSISTENCE[persistence] || ""].filter(Boolean).join(" ");
    const reference = meta.exportedAt || meta.dirtySince;
    get("save-reminder").hidden = !(meta.dirtySince && Date.now() - reference >= REMINDER_DAYS * DAY);
  }
  async function readPersistence() {
    const storage = globalThis.navigator?.storage;
    if (!storage?.persisted || !storage?.persist) { persistence = "indisponible"; return; }
    try { persistence = await storage.persisted() ? "accordée" : "non accordée"; } catch { persistence = "erreur"; }
  }
  // La conservation durable est demandée une fois, à la première modification enregistrée : jamais à l’ouverture.
  async function requestPersistence() {
    if (persistRequested || persistence !== "non accordée") return;
    persistRequested = true;
    try { persistence = await globalThis.navigator.storage.persist() ? "accordée" : "non accordée"; } catch { persistence = "erreur"; }
    storageInfo();
  }
  async function modified() {
    if (!meta.dirtySince) { meta = {...meta, dirtySince: Date.now()}; try { await A.Storage.saveMeta(meta); } catch {} }
    storageInfo(); requestPersistence();
  }
  // Seul l’export complet de la bibliothèque date la sauvegarde ; une composition seule ou un export de secours ne la date pas.
  async function libraryExported() { if (A.recoveryOnly) return; meta ={exportedAt: Date.now(), dirtySince: null}; storageInfo(); try { await A.Storage.saveMeta(meta); } catch {} }
  const QUIET_MS = 1000, FRESH = "Rien n’est encore enregistré dans ce navigateur.";
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
  // Dernier déplacement de bloc de chaque composition (#204), avec l’ordre obtenu : annulable tant que cet ordre est inchangé.
  A.moved = new Map();
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
  // Remplacement ou effacement voulus dans une autre fenêtre (#208) : jamais présentés comme une disparition.
  const WANTED = {remplacement: "Vos newsletters ont été remplacées par une sauvegarde restaurée dans une autre fenêtre.", effacement: "Vos newsletters ont été effacées dans une autre fenêtre."};
  const readOnlyError = () => new Error(readOnly === "version" ? "Cette fenêtre utilise une autre version de l’atelier : exportez les newsletters de cette fenêtre, puis rechargez la page avant de reprendre la main." : readOnly === "stockage" ? "Les newsletters enregistrées ont disparu du stockage : exportez les newsletters de cette fenêtre ou reprenez la main pour les enregistrer de nouveau." : WANTED[readOnly] ? `${WANTED[readOnly]} Cette fenêtre est en lecture seule : exportez les newsletters de cette fenêtre ou reprenez la main.` : "Une autre fenêtre a la main sur vos newsletters : cette fenêtre est en lecture seule. Exportez les newsletters de cette fenêtre ou reprenez la main.");
  function lock(kind, reason) {
    if (readOnly === "version") return;
    A.notice("");
    const editing = get("editing"), late = kind === "version", focused = editing.contains(document.activeElement) || (late && document.activeElement?.dataset.action === "take-over");
    readOnly = kind; editing.disabled = true; get("read-only").hidden = false;
    show(failed ? "Lecture seule : modifications non enregistrées. Exportez vos newsletters." : "Lecture seule : cette fenêtre n’enregistre plus rien.", true); get("save-rescue").hidden = true;
    get("read-only-message").textContent = `${reason} Cette fenêtre n’enregistre plus rien. ${late ? "Exportez les newsletters de cette fenêtre, puis rechargez cette page avant de reprendre la main." : kind === "stockage" ? "Exportez les newsletters de cette fenêtre pour les conserver, ou reprenez la main : ces newsletters seront enregistrées de nouveau dans ce navigateur." : WANTED[kind] ? `Exportez les newsletters de cette fenêtre pour les conserver, ou reprenez la main : les newsletters modifiées ici seront ajoutées en copies ${kind === "effacement" ? "après l’effacement" : "à la sauvegarde restaurée"}.` : "Exportez les newsletters de cette fenêtre pour les conserver, ou reprenez la main : les newsletters modifiées ici seront ajoutées en copies, sans remplacer celles de l’autre fenêtre."}`;
    get("read-only").querySelector("[data-action=take-over]").hidden = late; get("read-only").querySelector("[data-action=reload-page]").hidden = !late;
    if (focused) get("read-only-title").focus();
  }
  function storageLock(cause) {
    if (cause.storage === "conflit") lock("conflit", "Une autre fenêtre a enregistré vos newsletters après le dernier enregistrement de celle-ci.");
    else if (cause.storage === "réinitialisé") lock("stockage", "Les newsletters enregistrées ont disparu du stockage de ce navigateur.");
    else if (WANTED[cause.storage]) lock(cause.storage, WANTED[cause.storage]);
  }
  // Saisies d’URL en cours : conservées hors du modèle tant qu’elles sont invalides, jamais diffusées.
  const draftKey = (doc, block, input) => `${doc}|${block}|${input}`;
  function guardEdit() { if (A.LegacyRecovery?.pending()) throw new Error("Restaurez d’abord vos anciennes newsletters après correction de leurs adresses. Les données enregistrées restent intactes."); if (restoring) throw new Error("Attendez la fin de la récupération avant cette action."); if (A.pendingInputs) throw new Error("Attendez la fin du chargement du fichier avant cette action."); if (A.invalid.size) throw new Error("Corrigez les champs signalés ou annulez leur modification avant cette action."); }
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
    // Première visite : la newsletter de départ n’est pas un travail à enregistrer.
    if (fresh) { show(FRESH, true); return queue; }
    if (A.recoveryOnly) { failing(true); show(absent ? "Modifications non enregistrées : aucun stockage n’est disponible. Exportez vos newsletters." : "Modifications non enregistrées : les newsletters enregistrées restent inchangées. Exportez vos newsletters.", true); return Promise.resolve(); }
    latest = {current: revision, library: A.library, editorial: editorial || latest?.editorial}; editorial = false;
    cancelSuccess(); show("Sauvegarde en cours…");
    if (running) return queue;
    running = true; pending++;
    queue = Promise.resolve().then(async () => {
      try {
        while (latest) {
          const task = latest; latest = undefined;
          try {
            const saved = await A.Storage.save(task.library, token); token = saved.token; base = task.library;
            if (task.editorial) modified();
            if (task.current === revision && !readOnly) { failing(false); if (!A.invalid.size && !A.drafts.size) A.error(""); const text = A.invalid.size || A.drafts.size ? "Newsletters enregistrées dans ce navigateur, sauf les champs invalides." : "Newsletters enregistrées dans ce navigateur."; show(text); announceSuccess(text); }
          } catch (cause) {
            failing(true); setPersistentError(`${cause.message} ${cause.storage === "conflit" ? "Exportez les newsletters de cette fenêtre pour conserver ce travail, puis rechargez cette page." : "Exportez les newsletters de cette fenêtre pour conserver ce travail."}`);
            show("Modifications non enregistrées. Exportez vos newsletters.", true);
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
  // navigation : seule la newsletter ouverte change, ce n’est pas une modification éditoriale (#199).
  function change(mutator, redraw = true, input = false, navigation = false) {
    if (readOnly) throw readOnlyError();
    if (input === "edit") guardEdit(); else if (restoring || !input) guard(); const next = M.copy(A.library); mutator(next); M.versions(next); M.library(next); A.library = next; revision++; lastChange = Date.now(); pruneDrafts(); if (!navigation) { editorial = true; begin(false); }
    if (!A.doc().blocks.some(b => b.id === A.selected)) A.selected = A.doc().blocks[0]?.id || null;
    if (redraw) { clearTimeout(previewTimer); A.UI.refresh(); } else { A.UI.summary(); previewAfterInput(); }
    return save();
  }
  // Une restauration n’est annoncée qu’après relecture et validation de l’état précédent.
  async function restorable() { try { const previous = await A.Storage.load("previous"); return !!previous && !!M.library(previous.library); } catch { return false; } }
  async function start() {
    let record, upgraded = false;
    try {
      record = await A.Storage.load();
      token = record?.token ?? null; opened = true;
      if (record) A.library = M.copy(M.library(record.library));
      upgraded = !!record && record.library.catalogue !== A.catalog.id;
      A.selected = A.doc().blocks[0]?.id || null;
      // Après « Tout effacer » (#201), l’état visible est celui d’un navigateur neuf.
      begin(!record || record.reason === "effacement");
      show(fresh ? FRESH : "Newsletters retrouvées dans ce navigateur.", true);
      try { meta = await A.Storage.loadMeta(); } catch { meta = {}; }
    } catch (cause) {
      failing(true); A.recoveryOnly = true; absent = cause.storage === "absent"; begin(false);
      const legacy = record && A.LegacyRecovery?.offer(record);
      const advice = legacy ? "Les données enregistrées sont conservées : utilisez la récupération guidée ci-dessous pour corriger les anciennes adresses." : absent ? "Exportez les newsletters de cette fenêtre pour conserver votre travail : la fermeture de cette page l’efface." : "Cette page n’écrit rien dans ce navigateur : exportez les newsletters de cette fenêtre pour conserver votre travail.";
      const restore = !legacy && !cause.storage && await restorable() ? " Une sauvegarde précédente lisible existe : « Restaurer l’état précédent », dans « Sauvegarde et import », permet de la relire." : "";
      setPersistentError(`${cause.message} ${advice}${restore}`);
      show(absent ? "Stockage indisponible : travail en mémoire seulement." : "Newsletters non restaurées.", true);
      if (absent) get("storage-help").textContent = "Aucun stockage n’est disponible dans ce navigateur : exportez une copie pour conserver votre travail.";
    }
    base = A.library; A.ready = true; get("workspace").disabled = !!A.LegacyRecovery?.pending(); A.UI.refresh();
    // L’encart ne promet rien quand le stockage a échoué ; l’état de conservation durable est lu sans retarder l’ouverture.
    if (A.recoveryOnly) { if (!absent) get("storage-help").textContent = "Les newsletters enregistrées n’ont pas pu être relues : exportez une copie de votre travail."; }
    else { storageInfo(); readPersistence().then(storageInfo); }
    if (A.LegacyRecovery?.pending()) { get("save-rescue").hidden = true; get("library-count").textContent = A.LegacyRecovery.summary(); }
    // #209 : relue sous une empreinte antérieure de même contrat de données, la bibliothèque est enregistrée ré-estampillée
    // par le chemin d’écriture ordinaire ; l’état précédent garde l’original. Ce n’est pas une modification éditoriale.
    if (upgraded) { A.notice("Vos newsletters venaient d’une version antérieure de l’atelier : elles ont été mises à jour vers le modèle courant."); change(() => {}, false, undefined, true); }
  }
  async function restoreLegacy(library, expectedToken) {
    if (!A.LegacyRecovery?.pending() || restoring || running || A.pendingInputs) throw new Error("Aucune récupération ancienne disponible ou une opération est déjà en cours.");
    const restored = M.copy(M.library(library));
    const ticket = noticeTicket;
    restoring = true; pending++;
    try {
      if (readOnly) throw readOnlyError();
      const saved = await A.Storage.save(restored, expectedToken);
      token = saved.token; base = A.library = restored; A.recoveryOnly = false; failing(false); revision++; begin(false);
      A.selected = A.doc().blocks[0]?.id || null; A.LegacyRecovery.close(); A.UI.refresh();
      if (readOnly) show("Newsletters corrigées enregistrées ; cette fenêtre reste en lecture seule.", true);
      else { A.error(""); show("Newsletters corrigées restaurées et enregistrées dans ce navigateur.", true); A.notice("Vos newsletters sont retrouvées. L’original est conservé comme état précédent.", ticket); get("home-title").focus(); }
    } catch (cause) {
      if (!A.recoveryOnly) throw cause;
      throw new Error(`${cause.message} La récupération n’a rien enregistré ; conservez les données enregistrées telles quelles et rechargez l’atelier avant de réessayer.`);
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
      token = saved.token; base = A.library = restored; A.recoveryOnly = false; failing(false); revision++; begin(false);
      A.selected = A.doc().blocks[0]?.id || null; A.UI.refresh(); A.error("");
      show("Newsletters enregistrées dans ce navigateur."); announceSuccess("Newsletters enregistrées dans ce navigateur.");
      A.notice("État précédent relu. Contrôlez les newsletters avant de poursuivre.", ticket);
    } catch (cause) {
      show("Récupération impossible ; le travail actuel est conservé.", true);
      storageLock(cause);
      throw cause;
    }
    finally { restoring = false; pending--; get("workspace").disabled = false; }
  }
  // Remplacement ou effacement de toute la bibliothèque (#208), seul chemin pour la restauration (#200) et l’effacement (#201).
  // Rien ne change en mémoire tant que l’écriture n’est pas validée ; les annulations, brouillons et champs invalides de
  // l’ancien état sont ensuite vidés, et les autres fenêtres reçoivent le motif. Une bibliothèque enregistrée illisible n’est
  // jamais écrasée : ses données brutes doivent d’abord être exportées.
  async function replaceLibrary(library, {reason, keepPrevious = false}) {
    if (!WANTED[reason]) throw new Error("Motif de remplacement inconnu.");
    if (readOnly) throw readOnlyError();
    guardEdit();
    if (A.recoveryOnly) throw new Error(absent ? "Aucun stockage n’est disponible dans ce navigateur : rien ne peut être remplacé ni effacé." : "Les newsletters enregistrées ne peuvent pas être relues : exportez d’abord une copie de diagnostic, dans « Sauvegarde et import », avant de les remplacer ou de les effacer.");
    const next = M.copy(M.library(library));
    restoring = true; pending++; get("workspace").disabled = true;
    try {
      await queue;
      const saved = await A.Storage.replace(next, token, {reason, keepPrevious});
      token = saved.token; base = A.library = next; revision++; failing(false); begin(reason === "effacement");
      A.removed.clear(); A.moved?.clear(); A.drafts.clear(); A.invalid.clear(); A.UI.clearFieldErrors(); editorial = false;
      // Effacement : métadonnées supprimées avec la bibliothèque. Restauration : date d’export gardée, compteur remis à zéro.
      meta = reason === "effacement" ? {} : {...meta, dirtySince: null};
      if (reason !== "effacement") try { await A.Storage.saveMeta(meta); } catch {}
      storageInfo();
      A.selected = A.doc().blocks[0]?.id || null;
      channel?.postMessage({type: reason, token: saved.token});
      A.UI.refresh(); A.error("");
      show(reason === "effacement" ? FRESH : "Newsletters enregistrées dans ce navigateur.", true);
      return saved;
    } catch (cause) { storageLock(cause); throw cause; }
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
      ? "Le navigateur a refusé l’ouverture du stockage au démarrage. Cette page n’y a rien écrit et ne peut pas le restaurer sans risquer d’écraser une autre fenêtre. Exportez d’abord le travail temporaire affiché ici, puis rechargez l’atelier : il relira les newsletters enregistrées. Le navigateur peut demander une confirmation avant de recharger ; confirmez une fois le fichier exporté, puis importez-le pour retrouver ce travail."
      : "Aucun stockage n’est disponible dans ce navigateur : cette page n’a rien à restaurer. Exportez le travail temporaire pour le conserver, la fermeture de cette page l’efface.";
    document.getElementById("reopen-reload").hidden = !storage; box.hidden = false;
    document.getElementById("reopen-title").focus();
    A.notice("Restauration non lancée : rien n’a été écrit dans ce navigateur.", ticket);
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
    next.activeId = active; return {library: M.library(M.versions(next)), copies, drafts, selected};
  }
  async function takeOver() {
    if (!readOnly) throw new Error("Cette fenêtre a déjà la main.");
    if (readOnly === "version") throw readOnlyError();
    if (restoring) throw new Error("Attendez la fin de l’opération en cours avant de reprendre la main.");
    if (A.pendingInputs) throw new Error("Attendez la fin du chargement du fichier avant de reprendre la main.");
    restoring = true; pending++; get("workspace").disabled = true; A.notice(""); const ticket = noticeTicket; show("Reprise de la main en cours…");
    try {
      await queue; const record = await A.Storage.load();
      if (record?.app && record.app !== A.Storage.version) { lock("version", "Vos newsletters ont été enregistrées par une autre version de l’atelier."); throw readOnlyError(); }
      const {library, copies, drafts, selected} = rebase(record ? M.copy(M.library(record.library)) : null);
      if (readOnly === "version") throw readOnlyError();
      const saved = await A.Storage.save(library, record?.token ?? null);
      token = saved.token; base = A.library = library; A.drafts = drafts; A.selected = selected; revision++; failing(false); A.recoveryOnly = false; begin(false);
      channel?.postMessage({type: "takeover", token: saved.token});
      if (!A.doc().blocks.some(b => b.id === A.selected)) A.selected = A.doc().blocks[0]?.id || null;
      // Un retard signalé pendant l’écriture garde la lecture seule : la bibliothèque écrite est déjà en mémoire.
      if (readOnly === "version") { A.UI.refresh(); show("Newsletters enregistrées ; cette fenêtre reste en lecture seule : exportez puis rechargez-la.", true); return; }
      readOnly = null;
      get("editing").disabled = false; get("read-only").hidden = true; A.invalid.clear(); A.UI.clearFieldErrors();
      A.UI.refresh(); A.error("");
      const savedText = A.drafts.size ? "Newsletters enregistrées dans ce navigateur, sauf les champs invalides." : "Newsletters enregistrées dans ce navigateur.";
      show(savedText); announceSuccess(savedText); get(get("editor-page").hidden ? "home-title" : "composition-title").focus();
      A.notice(!record ? "Main reprise : les newsletters de cette fenêtre sont enregistrées de nouveau dans ce navigateur." : copies ? `Main reprise : ${copies > 1 ? `${copies} copies horodatées ajoutées` : "une copie horodatée ajoutée"} aux newsletters enregistrées, sans rien remplacer. L’autre fenêtre ne peut plus enregistrer ; elle passe en lecture seule au plus tard à sa prochaine modification.` : "Main reprise : rien n’avait changé dans cette fenêtre, les newsletters enregistrées sont conservées telles quelles.", ticket);
    } catch (cause) {
      show("Reprise impossible : rien n’a été enregistré.", true);
      if (readOnly === "version") throw cause;
      throw new Error(`${cause.message} Rien n’a été enregistré : exportez les newsletters de cette fenêtre pour conserver le travail de cette fenêtre.`);
    } finally { restoring = false; pending--; get("workspace").disabled = false; }
  }
  channel?.addEventListener("message", event => {
    if (!A.ready || event.data?.token === token) return;
    if (WANTED[event.data?.type]) { lock(event.data.type, WANTED[event.data.type]); setPersistentError(`${WANTED[event.data.type]} Cette fenêtre passe en lecture seule.`); return; }
    if (event.data?.type !== "takeover") return;
    lock("reprise", "Une autre fenêtre a repris la main sur vos newsletters."); setPersistentError("Une autre fenêtre a repris la main sur vos newsletters : cette fenêtre passe en lecture seule.");
  });
  function outdated() { lock("version", "Une nouvelle version de l’atelier est active dans une autre fenêtre."); setPersistentError("Une nouvelle version de l’atelier est active dans une autre fenêtre : cette fenêtre passe en lecture seule."); }
  const exported = () => { exportedRevision = revision; };
  function reload() {
    if ((failed || pending || A.invalid.size || A.pendingInputs) && exportedRevision !== revision) throw new Error("Exportez d’abord les newsletters de cette fenêtre : le rechargement efface le travail non enregistré de cette fenêtre.");
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
  // Appelée dans le mutateur d’une création : sans effet hors première visite, elle retire la newsletter de départ jamais proposée.
  const withoutStarter = lib => { if (fresh && starterId) lib.documents = lib.documents.filter(d => d.id !== starterId); };
  A.State = Object.freeze({fresh: () => fresh, withoutStarter, libraryExported, guard, guardEdit, setDraft, dropDraft, dropFooterDraft, change, save, start, restoreLegacy, recover, replaceLibrary, settle, flush, saved, takeOver, outdated, reload, exported, noticeTicket: () => noticeTicket, restoreErrorFromState});
})();
