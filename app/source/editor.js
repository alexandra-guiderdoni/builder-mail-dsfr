(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, get = id => document.getElementById(id);
  const attempt = async action => { try { await action(); } catch (cause) { A.error(cause.message); } };
  document.addEventListener("click", event => {
    const action = event.target.closest("[data-action]");
    if (action && !action.disabled) attempt(async () => { await A.Actions[action.dataset.action](); if (["new-document", "use-template"].includes(action.dataset.action)) await A.Library.open(A.library.activeId); });
    const selected = event.target.closest("[data-select]");
    if (selected) attempt(() => { A.State.guard(); A.selected = selected.dataset.select; A.UI.blockList(); A.UI.fields(); get("block-editor").querySelector("textarea,input")?.focus(); });
    const operation = event.target.closest("[data-block-action]");
    if (operation) attempt(async () => {
      const id = A.selected, actionName = operation.dataset.blockAction;
      await A.State.change(lib => {
        const blocks = lib.documents.find(d => d.id === lib.activeId).blocks, index = blocks.findIndex(b => b.id === id);
        if (index < 0) throw new Error("Le bloc sélectionné a changé.");
        if (actionName === "duplicate") { const clone = {...M.copy(blocks[index]), id: M.id()}; blocks.splice(index + 1, 0, clone); A.selected = clone.id; }
        if (actionName === "remove") { blocks.splice(index, 1); A.selected = blocks[Math.min(index, blocks.length - 1)]?.id || null; }
        if (["up", "down"].includes(actionName)) { const destination = index + (actionName === "up" ? -1 : 1); if (destination >= 0 && destination < blocks.length) [blocks[index], blocks[destination]] = [blocks[destination], blocks[index]]; }
      });
      get("block-editor").querySelector("textarea,input")?.focus();
    });
  });
  function edit(input, mutator) {
    const next = M.copy(A.library);
    try {
      mutator(next); M.library(next); A.invalid.delete(input.id); input.removeAttribute("aria-invalid");
      A.State.change(mutator, false, true); A.UI.selections(); A.UI.blockList();
    } catch (cause) { A.invalid.add(input.id); input.setAttribute("aria-invalid", "true"); A.error(`${cause.message} Ce champ n’est pas sauvegardé.`); }
  }
  get("document-name").addEventListener("input", event => edit(event.target, lib => { lib.documents.find(d => d.id === lib.activeId).name = event.target.value; }));
  get("subject").addEventListener("input", event => edit(event.target, lib => { lib.documents.find(d => d.id === lib.activeId).subject = event.target.value; }));
  get("block-editor").addEventListener("input", event => {
    const input = event.target, key = input.dataset.field, source = input.hasAttribute("data-source"), id = A.selected;
    if (!key && !source) return;
    edit(input, lib => { const b = lib.documents.find(d => d.id === lib.activeId).blocks.find(b => b.id === id); if (source) b.source = input.value; else b.values[key] = input.value; });
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
    await attempt(() => A.State.change(lib => { lib.activeId = selected; }));
    event.target.value = A.library.activeId;
  });
  get("project-input").addEventListener("change", event => {
    const file = event.target.files[0]; if (!file) return;
    attempt(async () => {
      A.notice("Lecture du fichier de travail…");
      const incoming = await A.Imports.prepare(file), merged = A.Imports.merge(A.library, incoming);
      await A.State.change(lib => { Object.assign(lib, merged); }); await A.Library.open(A.library.activeId); A.notice("Import ajouté à la bibliothèque, avec ses images. Les compositions existantes sont conservées.");
    });
    event.target.value = "";
  });
  get("catalogue-search").addEventListener("input", A.UI.catalogue);
  A.UI.catalogue(); A.State.start();
})();
