(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, get = id => document.getElementById(id);
  const attempt = async action => { try { await action(); } catch (cause) { if (cause.linkIssue) A.UI.showLinkIssue(cause.linkIssue); A.error(cause.message); } };
  document.addEventListener("click", event => {
    const action = event.target.closest("[data-action]");
    if (action && !action.disabled) attempt(async () => { await A.Actions[action.dataset.action](); if (["new-document", "use-template"].includes(action.dataset.action)) { await A.Library.open(A.library.activeId); get("document-name").focus(); get("document-name").select(); } });
    if (event.target.closest("[data-return-to-block]")) A.UI.focusBlock(A.selected);
    const selected = event.target.closest("[data-select]");
    if (selected) attempt(() => { A.State.guardEdit(); A.selected = selected.dataset.select; A.UI.blockList(); A.UI.fields(); get("block-editor").querySelector("textarea,input")?.focus(); });
    const operation = event.target.closest("[data-block-action]");
    if (operation) attempt(async () => {
      const id = A.selected, actionName = operation.dataset.blockAction, removingLink = actionName === "remove-footer-link";
      // Garde unique (décision du 24 octobre) : Monter, Descendre, Retirer et Dupliquer sont refusés pendant un brouillon d’URL ;
      // les liens de pied et l’image restent des éditions de champ, qui ignorent les brouillons.
      const mode = ["up", "down", "remove", "duplicate"].includes(actionName) ? false : "edit";
      let removed, name;
      const saving = A.State.change(lib => {
        const blocks = lib.documents.find(d => d.id === lib.activeId).blocks, index = blocks.findIndex(b => b.id === id);
        if (index < 0) throw new Error("Le bloc sélectionné a changé.");
        const block = blocks[index]; name = `«\u00a0${A.UI.blockName(block)}\u00a0»`;
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
        if (actionName === "remove") { removed = {block, index}; blocks.splice(index, 1); A.selected = blocks[Math.min(index, blocks.length - 1)]?.id || null; }
        if (["up", "down"].includes(actionName)) { const destination = index + (actionName === "up" ? -1 : 1); if (destination >= 0 && destination < blocks.length) [blocks[index], blocks[destination]] = [blocks[destination], blocks[index]]; }
      }, !removingLink, mode);
      // Brouillons recalés avant de redessiner les champs : celui du lien retiré disparaît, ceux des liens suivants les suivent.
      if (removingLink) { A.State.dropFooterDraft(A.doc().id, id, Number(operation.dataset.footerLinkIndex)); A.UI.blockList(); A.UI.fields(); }
      if (removed) {
        // Chaque retrait remplace le précédent de cette composition seulement.
        A.removed.set(A.library.activeId, removed); A.UI.removal();
      }
      // Le rendu a remplacé le bouton activé : le focus est replacé tout de suite, sans attendre la sauvegarde (#43).
      const editor = get("block-editor"), catalogue = get("catalogue").closest("details").querySelector("summary"), selected = A.doc().blocks.find(b => b.id === A.selected);
      if (["up", "down"].includes(actionName)) {
        const buttons = [actionName, actionName === "up" ? "down" : "up"].map(action => editor.querySelector(`[data-block-action="${action}"]`));
        (buttons.find(button => button && !button.disabled) || editor.querySelector("textarea,input")).focus();
        A.notice(`Bloc ${name} déplacé ${A.UI.blockPlace(id)}.`);
      } else if (actionName === "remove") {
        if (selected) {
          if (!A.UI.focusBlock(selected.id)) editor.querySelector("textarea,input")?.focus();
          A.notice(`Bloc ${name} retiré. « Annuler le retrait » le rétablit à sa place. Bloc «\u00a0${A.UI.blockName(selected)}\u00a0» sélectionné, ${A.UI.blockPlace(selected.id)}.`);
        } else { catalogue.focus(); A.notice(`Bloc ${name} retiré. « Annuler le retrait » le rétablit à sa place. La composition ne contient plus de bloc\u00a0: ajoutez un composant depuis le catalogue.`); }
      } else {
        const links = selected?.additionalLinks;
        const target = (actionName === "add-footer-link" && get(`field-footer-url-${links.length - 1}`)) || editor.querySelector("textarea,input") || catalogue;
        target.focus();
        if (actionName === "duplicate") A.notice(`Bloc ${name} dupliqué\u00a0: la copie est sélectionnée, ${A.UI.blockPlace(A.selected)}.`);
        if (actionName === "remove-image") A.notice(`Image retirée du bloc ${name}.`);
        if (actionName === "add-footer-link") A.notice(`Lien supplémentaire ${links.length} ajouté au bloc ${name}.`);
        if (actionName === "remove-footer-link") A.notice(`Lien supplémentaire ${Number(operation.dataset.footerLinkIndex) + 1} retiré du bloc ${name}.`);
      }
      await saving;
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
    const component = A.doc().blocks.find(b => b.id === blockId)?.component;
    attempt(async () => {
      A.State.guard(); const display = component && A.Images.displayWidth(component, key);
      A.pendingInputs++; A.notice("Chargement de l’image locale…");
      const image = await A.Files.image(file, display).finally(() => { A.pendingInputs--; });
      await A.State.change(lib => { const b = lib.documents.find(d => d.id === docId)?.blocks.find(b => b.id === blockId); if (!b) throw new Error("La composition a changé pendant le chargement de l’image."); b.values[key] = image.value; });
      A.notice(A.Images.describe(image));
    });
  });
  // Depuis #57, la bascule de composition active passe par une action explicite (bouton « Ouvrir cette composition »)
  // et jamais par un `change` du sélecteur, qui serait aussi déclenché par la recherche par frappe sous Firefox et WebKit.

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
  // Accès rapide : le lien passe l’aperçu sans le rendre inaccessible, ses propres liens restent tabulables.
  document.addEventListener("click", event => {
    const link = event.target.closest?.("a[data-skip-to]");
    if (link) { event.preventDefault(); get(link.dataset.skipTo)?.focus(); }
  });
  A.UI.catalogue(); A.State.start();
})();
