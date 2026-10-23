(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, get = id => document.getElementById(id);
  const selected = (list, field) => { const item = list.find(x => x.id === get(field).value); if (!item) throw new Error("Choisissez un élément enregistré."); return item; };
  const name = field => { const result = get(field).value.trim(); if (!result) throw new Error("Renseignez un nom pour cet élément."); return result; };
  const starters = {information: [2, 5, 8, 19, 40, 47, 49], lettre: [2, 5, 10, 31, 35, 46, 47, 49], invitation: [2, 6, 19, 39, 40, 47, 49]};
  A.Actions = {
    "new-document": () => A.State.change(lib => { const doc = M.create("Nouvelle composition", starters[get("starter").value]); lib.documents.push(doc); lib.activeId = doc.id; }),
    "duplicate-document": () => A.Library.duplicate(A.library.activeId),
    "remove-document": () => A.Library.ask("remove", A.library.activeId),
    "library-home": () => A.Library.home(),
    "resume-document": () => A.Library.open(A.library.activeId),
    "save-template": () => { const label = name("template-name"); return A.State.change(lib => { lib.templates.push(M.clone(A.doc(), label)); }); },
    "use-template": () => { const template = selected(A.library.templates, "saved-templates"); return A.State.change(lib => { const doc = M.clone(template, `${template.name} · composition`); lib.documents.push(doc); lib.activeId = doc.id; }); },
    "remove-template": () => { const target = selected(A.library.templates, "saved-templates"); return A.State.change(lib => { lib.templates = lib.templates.filter(t => t.id !== target.id); }); },
    "save-identity": () => {
      const label = name("identity-name"), blocks = A.doc().blocks.filter(b => ["En-têtes", "Pieds de page"].includes(M.component(b.component).family));
      if (!blocks.length) throw new Error("Ajoutez un en-tête ou un pied de page à cette composition.");
      return A.State.change(lib => { lib.identities.push({id: M.id(), name: label, blocks: M.copy(blocks)}); });
    },
    "use-identity": () => {
      const identity = selected(A.library.identities, "identities"), frames = M.copy(identity.blocks); frames.forEach(b => { b.id = M.id(); });
      return A.State.change(lib => {
        const doc = lib.documents.find(d => d.id === lib.activeId);
        doc.blocks = [...frames.filter(b => M.component(b.component).family === "En-têtes"), ...doc.blocks.filter(b => !["En-têtes", "Pieds de page"].includes(M.component(b.component).family)), ...frames.filter(b => M.component(b.component).family === "Pieds de page")];
      });
    },
    "remove-identity": () => { const target = selected(A.library.identities, "identities"); return A.State.change(lib => { lib.identities = lib.identities.filter(i => i.id !== target.id); }); },
    "add-block": () => {
      const id = get("catalogue").value; if (!id) throw new Error("Choisissez un composant du catalogue.");
      A.State.guard(); const b = M.createBlock(id); A.selected = b.id;
      const saving = A.State.change(lib => { const doc = lib.documents.find(d => d.id === lib.activeId), selectedIndex = doc.blocks.findIndex(x => x.id === get("block-list").querySelector('[aria-pressed="true"]')?.dataset.select); doc.blocks.splice(selectedIndex < 0 ? doc.blocks.length : selectedIndex + 1, 0, b); });
      get("block-editor").querySelector("textarea,input")?.focus();
      A.notice(`Bloc «\u00a0${A.UI.blockName(b)}\u00a0» ajouté ${A.UI.blockPlace(b.id)}.`);
      return saving;
    },
    "cancel-fields": () => {
      const restored = new Set(A.invalid);
      A.UI.clearFieldErrors(); A.invalid.clear(); A.error(""); A.UI.refresh();
      // Le rendu a remplacé le bouton activé : le focus va au premier champ restauré dans l’ordre du document (#43).
      const first = [...document.querySelectorAll("input[id],textarea[id]")].find(input => restored.has(input.id));
      (first || get("block-editor").querySelector('[data-action="cancel-fields"]'))?.focus();
      A.notice(restored.size ? "Champs invalides annulés ; les dernières valeurs valides sont affichées." : "Aucun champ invalide à annuler.");
    },
    "save-now": A.State.save,
    "recover": A.State.recover,
    "export-document": () => { A.State.guard(); A.Files.json(M.document(A.doc()), "composition.courriel.json"); A.notice("Composition proposée au téléchargement avec ses images."); },
    "export-library": () => { A.State.guard(); A.Files.json(M.library(A.library), "bibliotheque.courriels.json"); A.notice("Bibliothèque proposée au téléchargement, avec modèles et identités."); },
    "export-stored": async () => { const record = await A.Storage.load(); if (!record) throw new Error("Aucune donnée enregistrée."); A.Files.json(record, "recuperation.stockage.json"); A.notice("Copie brute du stockage proposée au téléchargement pour récupération."); },
    "export-mail": () => { A.State.guard(); A.Files.download(A.Render.html(A.doc()), "text/html;charset=utf-8", "courriel.html"); A.notice("Courriel proposé au téléchargement."); },
    "copy": A.Files.copy,
    "example-json": () => { A.State.guard(); A.Files.json(M.create("Exemple de composition", [5, 19, 40]), "exemple.courriel.json"); A.notice("Exemple JSON proposé au téléchargement. Votre composition actuelle est conservée."); },
    "json-import": async () => {
      const incoming = await A.Imports.prepare(get("json-input").value), merged = A.Imports.merge(A.library, incoming);
      return A.State.change(lib => { Object.assign(lib, merged); }).then(async () => { await A.Library.open(A.library.activeId); A.notice("Composition ou bibliothèque JSON ajoutée. Les éléments existants sont conservés."); });
    }
  };
})();
