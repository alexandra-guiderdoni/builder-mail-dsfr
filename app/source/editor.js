(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, get = id => document.getElementById(id);
  const attempt = async action => { try { await action(); } catch (cause) { if (cause.linkIssue) A.UI.showLinkIssue(cause.linkIssue); A.error(cause.message); } };
  document.addEventListener("click", event => {
    const action = event.target.closest("[data-action]");
    if (action && !action.disabled) attempt(async () => { await A.Actions[action.dataset.action](); if (["new-document", "use-template"].includes(action.dataset.action)) await A.Library.open(A.library.activeId); });
    if (event.target.closest("[data-return-to-block]")) {
      const target = [...get("block-list").querySelectorAll("[data-select]")].find(button => button.dataset.select === A.selected);
      if (target) { target.closest("details").open = true; target.focus(); }
    }
    const selected = event.target.closest("[data-select]");
    if (selected) attempt(() => { A.State.guardEdit(); A.selected = selected.dataset.select; A.UI.blockList(); A.UI.fields(); get("block-editor").querySelector("textarea,input")?.focus(); });
    const operation = event.target.closest("[data-block-action]");
    if (operation) attempt(async () => {
      const id = A.selected, actionName = operation.dataset.blockAction, removingLink = actionName === "remove-footer-link";
      const saving = A.State.change(lib => {
        const blocks = lib.documents.find(d => d.id === lib.activeId).blocks, index = blocks.findIndex(b => b.id === id);
        if (index < 0) throw new Error("Le bloc sélectionné a changé.");
        const block = blocks[index];
        if (actionName === "remove-image" && block.component === "mail-31") { block.values.f0 = ""; block.values.f1 = ""; }
        if (actionName === "add-footer-link" && block.component === "mail-50") {
          if ((block.additionalLinks?.length || 0) >= 2) throw new Error("Le pied de page accepte deux liens supplémentaires au maximum.");
          (block.additionalLinks ||= []).push({url: "https://exemple.invalid/", label: ""});
        }
        if (actionName === "remove-footer-link" && block.component === "mail-50") {
          block.additionalLinks?.splice(Number(operation.dataset.footerLinkIndex), 1);
          if (!block.additionalLinks?.length) delete block.additionalLinks;
        }
        if (actionName === "duplicate") { const clone = {...M.copy(blocks[index]), id: M.id()}; blocks.splice(index + 1, 0, clone); A.selected = clone.id; }
        if (actionName === "remove") { blocks.splice(index, 1); A.selected = blocks[Math.min(index, blocks.length - 1)]?.id || null; }
        if (["up", "down"].includes(actionName)) { const destination = index + (actionName === "up" ? -1 : 1); if (destination >= 0 && destination < blocks.length) [blocks[index], blocks[destination]] = [blocks[destination], blocks[index]]; }
      }, !removingLink, "edit");
      // Brouillons recalés avant de redessiner les champs : celui du lien retiré disparaît, ceux des liens suivants les suivent.
      if (removingLink) { A.State.dropFooterDraft(A.doc().id, id, Number(operation.dataset.footerLinkIndex)); A.UI.blockList(); A.UI.fields(); }
      await saving;
      const links = A.doc().blocks.find(b => b.id === A.selected)?.additionalLinks;
      const target = (actionName === "add-footer-link" && get(`field-footer-url-${links.length - 1}`)) || get("block-editor").querySelector("textarea,input") || get("catalogue").closest("details").querySelector("summary");
      target.focus();
    });
  });
  function edit(input, mutator) {
    const next = M.copy(A.library);
    try {
      if (input.hasAttribute("data-link-label") && !input.value.trim()) throw new Error("Renseignez l’intitulé du lien.");
      mutator(next); M.library(next); A.invalid.delete(input.id); A.UI.fieldError(input, "");
      A.State.change(mutator, false, true); A.UI.selections(); A.UI.blockList();
    } catch (cause) { A.invalid.add(input.id); A.UI.fieldError(input, cause.message); A.error(`${cause.message} Ce champ n’est pas sauvegardé.`); }
  }
  get("document-name").addEventListener("input", event => edit(event.target, lib => { lib.documents.find(d => d.id === lib.activeId).name = event.target.value; }));
  get("subject").addEventListener("input", event => edit(event.target, lib => { lib.documents.find(d => d.id === lib.activeId).subject = event.target.value; }));
  const isUrlInput = input => input.type === "url" && (input.dataset.field || input.hasAttribute("data-source") || input.dataset.footerLinkField === "url");
  function urlCheck(input, id) {
    const block = A.doc().blocks.find(b => b.id === id), footer = input.dataset.footerLinkField === "url" || (!input.hasAttribute("data-source") && M.component(block.component).family === "Pieds de page");
    return M.checkUrl(input.value, {optional: input.hasAttribute("data-source"), footer});
  }
  get("block-editor").addEventListener("input", event => {
    const input = event.target, key = input.dataset.field, source = input.hasAttribute("data-source"), sourceLabel = input.hasAttribute("data-source-label"), footerField = input.dataset.footerLinkField, id = A.selected;
    if (!key && !source && !sourceLabel && !footerField) return;
    const mutator = lib => { const b = lib.documents.find(d => d.id === lib.activeId).blocks.find(b => b.id === id); if (source) b.source = input.value; else if (sourceLabel) b.sourceLabel = input.value; else if (footerField) b.additionalLinks[Number(input.dataset.footerLinkIndex)][footerField] = input.value; else b.values[key] = input.value; };
    if (isUrlInput(input)) {
      // Saisie d’URL : aucune erreur à la frappe ; la valeur invalide reste un brouillon hors du modèle.
      const doc = A.doc().id, message = urlCheck(input, id);
      if (message) {
        if (A.State.setDraft(doc, id, input.id, input.value, message)) A.notice("Lien en cours de saisie : l’aperçu montre la dernière version valide. La copie et les exports restent bloqués tant que ce lien est invalide.");
        if (A.drafts.get(`${doc}|${id}|${input.id}`).shown) A.UI.fieldError(input, message);
        return;
      }
      A.State.dropDraft(doc, id, input.id);
    }
    edit(input, mutator);
  });
  // Départ du champ : l’erreur d’un brouillon d’URL invalide devient visible, sur ce champ. Vers un bouton d’action,
  // on attend la tentative de diffusion : insérer l’erreur déplacerait le bouton et ferait perdre le clic.
  get("block-editor").addEventListener("focusout", event => {
    const field = event.target, draft = isUrlInput(field) && A.drafts.get(`${A.doc().id}|${A.selected}|${field.id}`);
    if (!draft || event.relatedTarget?.closest?.("[data-action]")) return;
    draft.shown = true; A.UI.fieldError(field, draft.message);
  });
  get("block-editor").addEventListener("change", event => {
    if (!event.target.hasAttribute("data-image-field")) return;
    const file = event.target.files[0], key = event.target.dataset.imageField, docId = A.doc().id, blockId = A.selected;
    attempt(async () => {
      A.State.guard(); A.pendingInputs++; A.notice("Chargement de l’image locale…");
      const value = await A.Files.image(file).finally(() => { A.pendingInputs--; });
      await A.State.change(lib => { const b = lib.documents.find(d => d.id === docId)?.blocks.find(b => b.id === blockId); if (!b) throw new Error("La composition a changé pendant le chargement de l’image."); b.values[key] = value; });
      A.notice("Image locale incorporée à la composition.");
    });
  });
  get("documents").addEventListener("change", async event => {
    const selected = event.target.value;
    // Garde complète : quitter une composition qui porte un brouillon d’URL la rendrait injoignable depuis l’accueil.
    await attempt(() => A.State.change(lib => { lib.activeId = selected; }));
    event.target.value = A.library.activeId;
  });
  let readings = 0; const reading = "Lecture du fichier de travail…";
  get("project-input").addEventListener("change", event => {
    const file = event.target.files[0]; if (!file) return;
    attempt(async () => {
      readings++; A.notice(reading);
      try {
        const incoming = await A.Imports.prepare(file), merged = A.Imports.merge(A.library, incoming);
        await A.State.change(lib => { Object.assign(lib, merged); }); await A.Library.open(A.library.activeId); A.notice("Import ajouté à la bibliothèque, avec ses images. Les compositions existantes sont conservées.");
      } finally { if (!--readings && get("notice").textContent === reading) A.notice(""); }
    });
    event.target.value = "";
  });
  get("catalogue-search").addEventListener("input", A.UI.catalogue);
  A.UI.catalogue(); A.State.start();
})();
