/* Deux vues du même état ; la bibliothèque n’ajoute aucun stockage ni contrat. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, get = id => document.getElementById(id), esc = A.Render.escape;
  let currentDialog, busy = false, navigation = Promise.resolve();
  get("library-name").setAttribute("aria-describedby", "library-dialog-error");
  const find = id => { const doc = A.library.documents.find(d => d.id === id); if (!doc) throw new Error("Cette composition n’est plus disponible."); return doc; };
  const attempt = async action => { try { await action(); } catch (cause) { A.error(cause.message); } };
  function show(editor) {
    get("library-home").hidden = editor; get("editor-page").hidden = !editor;
    get("library-back").hidden = !editor; get("resume-document").hidden = editor; A.UI.pageTitle();
    get(editor ? "composition-title" : "home-title").focus();
  }
  function refresh() {
    const labels = new Map(A.UI.documentLabels());
    get("newsletter-list").innerHTML = A.library.documents.map(doc => `<li class="fr-col-12 fr-col-md-6" data-document="${esc(doc.id)}"><div class="app-panel"><h3><button class="fr-btn fr-btn--tertiary-no-outline" data-library-action="open" aria-label="Ouvrir ${esc(labels.get(doc.id))}">${esc(labels.get(doc.id))}</button></h3><p>${esc(doc.subject || "Sans objet")} · ${doc.blocks.length} blocs${doc.id === A.library.activeId ? " · Composition active" : ""}</p><div class="actions">${[["rename", "Renommer"], ["duplicate", "Dupliquer"], ["export", "Exporter"], ["remove", "Supprimer"]].map(([action, label]) => `<button class="fr-btn fr-btn--secondary" data-library-action="${action}" aria-label="${label} la composition ${esc(labels.get(doc.id))}">${label}</button>`).join("")}</div></div></li>`).join("");
    get("resume-document").textContent = `Reprendre « ${labels.get(A.doc().id)} »`;
  }
  function focusRow(id, action = "open") {
    const item = [...get("newsletter-list").children].find(e => e.dataset.document === id);
    if (get("editor-page").hidden) (item?.querySelector(`[data-library-action="${action}"]`) || get("home-title")).focus();
    else get("composition-title").focus();
  }
  // Changer de vue attend les écritures en cours sans exiger leur succès : après un échec, le travail reste en mémoire.
  function navigate(action) {
    const next = navigation.then(action);
    // Un refus reste transmis à l’appelant, sans bloquer les demandes suivantes.
    navigation = next.catch(() => {}); return next;
  }
  async function open(id) {
    A.State.guard(); find(id);
    return navigate(async () => {
      await A.State.settle();
      if (id !== A.library.activeId) { await A.State.change(lib => { lib.activeId = id; }); await A.State.settle(); }
      // Depuis l’accueil, le cadre doit être visible avant de charger son aperçu.
      // Dans l’éditeur, State.change a déjà rendu : une seconde navigation blob peut être perdue sous WebKit.
      const alreadyVisible = !get("editor-page").hidden;
      show(true); if (!alreadyVisible) A.UI.refresh();
    });
  }
  async function home() {
    A.State.guard();
    return navigate(async () => { await A.State.settle(); refresh(); show(false); });
  }
  // Message commun : signale un objet daté qui n'a pas été repris tel quel.
  const subjectNotice = (done, replaced) => replaced === null ? `${done}.` : `${done}. L’objet d’origine contenait une date (« ${replaced} ») : il est remplacé par le nom de la composition. Mettez-le à jour avant l’envoi.`;
  async function duplicate(id) {
    A.State.guard(); const made = M.derive(find(id), M.uniqueName(`${find(id).name} · copie`, A.library.documents)), clone = made.doc;
    A.notice(""); const ticket = A.State.noticeTicket(); await A.State.change(lib => { lib.documents.push(clone); lib.activeId = clone.id; });
    await A.State.settle(); focusRow(clone.id);
    A.notice(subjectNotice(A.State.saved() ? "Copie indépendante ajoutée et sauvegardée dans la bibliothèque" : "Copie indépendante ajoutée en mémoire, non sauvegardée : exportez la bibliothèque pour la conserver", made.replacedSubject), ticket);
  }
  function ask(kind, id) {
    A.State.guard(); const doc = find(id), removing = kind === "remove";
    currentDialog = {kind, id, index: A.library.documents.findIndex(d => d.id === id)};
    get("library-dialog-title").textContent = removing ? `Supprimer « ${new Map(A.UI.documentLabels()).get(doc.id)} » ?` : "Renommer la composition";
    get("library-dialog-description").textContent = removing ? "Cette composition sera retirée de ce navigateur. Les fichiers déjà exportés restent conservés." : "Le nom change dans la bibliothèque ; l’objet du courriel reste conservé.";
    get("library-name-field").hidden = removing; get("library-name").disabled = removing;
    get("library-name").value = doc.name; get("library-name").removeAttribute("aria-invalid"); get("library-dialog-error").textContent = "";
    get("library-confirm").textContent = removing ? "Supprimer cette composition" : "Enregistrer le nom";
    get("library-dialog").showModal(); get(removing ? "library-cancel" : "library-name").focus();
    if (!removing) get("library-name").select();
  }
  // Retrait d’un modèle ou d’une identité : même fenêtre de confirmation, élément désigné par son identifiant.
  const itemKinds = {templates: {noun: "le modèle", the: "Ce modèle", button: "Retirer ce modèle", done: "Modèle", ended: "retiré"}, identities: {noun: "l’identité", the: "Cette identité", button: "Retirer cette identité", done: "Identité", ended: "retirée"}};
  function askRemoval(list, id) {
    A.State.guard(); const item = A.library[list].find(x => x.id === id), kind = itemKinds[list];
    if (!item) throw new Error("Cet élément n’est plus disponible.");
    const same = A.library[list].filter(x => x.name === item.name), rank = same.indexOf(item) + 1;
    currentDialog = {kind: "item", list, id, opener: document.activeElement};
    get("library-dialog-title").textContent = `Retirer ${kind.noun} « ${item.name} » ?${same.length > 1 ? ` (n° ${rank} sur ${same.length} du même nom)` : ""}`;
    get("library-dialog-description").textContent = `${kind.the} sera retiré${list === "identities" ? "e" : ""} de ce navigateur. Les compositions déjà créées et les fichiers exportés ne changent pas.`;
    get("library-name-field").hidden = true; get("library-name").disabled = true; get("library-name").removeAttribute("aria-invalid"); get("library-dialog-error").textContent = "";
    get("library-confirm").textContent = kind.button; get("library-dialog").showModal(); get("library-cancel").focus();
  }
  get("newsletter-list").addEventListener("click", event => {
    const button = event.target.closest("[data-library-action]"); if (!button) return;
    const id = button.closest("[data-document]").dataset.document, action = button.dataset.libraryAction;
    attempt(async () => {
      A.State.guard();
      if (action === "open") return open(id);
      if (action === "duplicate") return duplicate(id);
      if (action === "export") { A.Files.json(M.document(find(id)), A.Files.exportName(find(id).name, "courriel.json")); A.notice("Composition choisie proposée au téléchargement avec ses images."); return; }
      ask(action, id);
    });
  });
  get("library-cancel").addEventListener("click", () => get("library-dialog").close());
  get("library-dialog").addEventListener("cancel", event => { if (busy) event.preventDefault(); });
  get("library-dialog").addEventListener("close", () => {
    if (!currentDialog) return;
    if (currentDialog.kind === "item") { currentDialog.opener?.focus(); return; }
    const exists = A.library.documents.some(d => d.id === currentDialog.id), fallback = A.library.documents[Math.min(currentDialog.index, A.library.documents.length - 1)].id;
    focusRow(exists ? currentDialog.id : fallback, exists ? currentDialog.kind : "open");
  });
  get("library-form").addEventListener("submit", async event => {
    event.preventDefault(); if (busy || !currentDialog) return;
    const target = {...currentDialog}, label = get("library-name").value.trim();
    if (target.kind === "rename" && !label) { get("library-dialog-error").textContent = "Renseignez un nom pour la composition."; get("library-name").setAttribute("aria-invalid", "true"); get("library-name").focus(); return; }
    busy = true; get("library-confirm").disabled = get("library-cancel").disabled = true; A.notice("");
    try {
      A.State.guard();
      if (target.kind === "item") {
        const kind = itemKinds[target.list], item = A.library[target.list].find(x => x.id === target.id);
        if (!item) throw new Error("Cet élément n’est plus disponible.");
        await A.State.change(lib => { lib[target.list] = lib[target.list].filter(x => x.id !== target.id); });
        get("library-dialog").close();
        // Un échec de sauvegarde a déjà affiché son propre message : pas d’annonce de réussite.
        try { await A.State.flush(); } catch (cause) { if (get("error").hidden) throw cause; return; }
        A.notice(`${kind.done} « ${item.name} » ${kind.ended}.`); return;
      }
      find(target.id); let emptied = false;
      await A.State.change(lib => {
        if (target.kind === "rename") lib.documents.find(d => d.id === target.id).name = label;
        else {
          lib.documents = lib.documents.filter(d => d.id !== target.id);
          if (!lib.documents.length) { lib.documents.push(M.create()); emptied = true; }
          if (lib.activeId === target.id) lib.activeId = lib.documents[0].id;
        }
      });
      get("library-dialog").close(); await A.State.settle();
      const fallback = A.library.documents[Math.min(target.index, A.library.documents.length - 1)].id;
      focusRow(target.kind === "rename" ? target.id : fallback, target.kind === "rename" ? "rename" : "open");
      if (A.State.saved()) A.notice(target.kind === "rename" ? "Nom enregistré dans la bibliothèque." : emptied ? "Dernière composition supprimée. Une composition de départ avec six blocs est prête pour la suite." : "Composition supprimée ; les autres éditions sont conservées.");
      else A.notice(`${target.kind === "rename" ? "Nom modifié en mémoire, non sauvegardé" : emptied ? "Dernière composition retirée en mémoire, retrait non sauvegardé ; une composition de départ avec six blocs est prête" : "Composition retirée en mémoire, retrait non sauvegardé"} : exportez la bibliothèque pour conserver cet état.`);
    } catch (cause) { if (get("library-dialog").open) get("library-dialog-error").textContent = cause.message; else A.error(cause.message); }
    finally { busy = false; get("library-confirm").disabled = get("library-cancel").disabled = false; }
  });
  A.Library = Object.freeze({subjectNotice, refresh, open, home, duplicate, ask, askRemoval});
})();
