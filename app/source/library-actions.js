(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, get = id => document.getElementById(id);
  const selected = (list, field) => { const item = list.find(x => x.id === get(field).value); if (!item) throw new Error("Choisissez un élément enregistré."); return item; };
  const name = field => { const result = get(field).value.trim(); if (!result) throw new Error("Renseignez un nom pour cet élément."); return result; };
  // Deux noms sont homonymes s’ils ne diffèrent que par les espaces périphériques, la casse ou la forme Unicode.
  const key = value => value.normalize("NFKC").trim().toLowerCase();
  const unique = (list, label, kind) => { if (list.some(x => key(x.name) === key(label))) throw new Error(`${kind} nommé « ${label} » existe déjà. Choisissez un autre nom.`); };
  // L’annonce de réussite attend la fin de la sauvegarde ; un échec a déjà affiché son propre message.
  const announce = async message => { try { await A.State.flush(); } catch (cause) { if (get("error").hidden) throw cause; return; } A.notice(message); };
  const starters = {information: [2, 5, 8, 19, 40, 47, 49], lettre: [2, 5, 10, 31, 35, 46, 47, 49], invitation: [2, 6, 19, 39, 40, 47, 49]};
  const family = b => M.component(b.component).family, framed = b => ["En-têtes", "Pieds de page"].includes(family(b));
  // Intact : valeurs éditoriales, source et liens égaux aux valeurs initiales du composant, identifiant ignoré.
  // Un intitulé de source vide et une liste de liens vide valent leur absence, comme dans l’éditeur et le rendu.
  function intact(b) {
    const initial = M.createBlock(b.component);
    return Object.keys(initial.values).every(key => b.values[key] === initial.values[key]) && b.source === initial.source &&
      (b.sourceLabel ?? "") === (initial.sourceLabel ?? "") && JSON.stringify(b.additionalLinks ?? []) === JSON.stringify(initial.additionalLinks ?? []);
  }
  function applyIdentity(identityId, docId, label) {
    const saving = A.State.change(lib => {
      const doc = lib.documents.find(d => d.id === docId), identity = lib.identities.find(i => i.id === identityId);
      if (!doc || lib.activeId !== docId || !identity) throw new Error("La composition ou l’identité a changé ; recommencez l’application de l’identité.");
      const frames = M.copy(identity.blocks); frames.forEach(b => { b.id = M.id(); });
      doc.blocks = [...frames.filter(b => family(b) === "En-têtes"), ...doc.blocks.filter(b => !framed(b)), ...frames.filter(b => family(b) === "Pieds de page")];
    });
    A.notice(`Identité « ${label} » appliquée : en-têtes et pieds de page remplacés, corps du courriel conservé.`);
    return saving;
  }
  const identityDialog = get("identity-dialog");
  let identityTarget;
  function confirmIdentity(identity, doc, modified) {
    identityTarget = {identity: identity.id, name: identity.name, doc: doc.id};
    get("identity-dialog-title").textContent = `Appliquer l’identité « ${identity.name} » ?`;
    get("identity-dialog-blocks").replaceChildren(...modified.map(({b, index}) => {
      const definition = M.component(b.component), title = definition.fields.find(f => f.type === "text"), item = document.createElement("li");
      item.textContent = `${index + 1}. ${definition.label}${title && b.values[title.key] ? ` — ${b.values[title.key].slice(0, 64)}` : ""}`;
      return item;
    }));
    identityDialog.showModal(); get("identity-cancel").focus();
  }
  get("identity-cancel").addEventListener("click", () => identityDialog.close());
  identityDialog.addEventListener("close", () => { identityTarget = undefined; document.querySelector('[data-action="use-identity"]').focus(); });
  // Le remplacement en mémoire est synchrone : la boîte se ferme aussitôt, la sauvegarde suit sa propre file.
  get("identity-form").addEventListener("submit", event => {
    event.preventDefault(); const target = identityTarget; if (!target) return;
    identityTarget = undefined; identityDialog.close();
    try { applyIdentity(target.identity, target.doc, target.name); } catch (cause) { A.error(cause.message); }
  });
  A.Actions = {
    "new-document": () => A.State.change(lib => { const doc = M.create("Nouvelle composition", starters[get("starter").value]); lib.documents.push(doc); lib.activeId = doc.id; }),
    "duplicate-document": () => A.Library.duplicate(A.library.activeId),
    "remove-document": () => A.Library.ask("remove", A.library.activeId),
    "library-home": () => A.Library.home(),
    "resume-document": () => A.Library.open(A.library.activeId),
    "save-template": async () => { const label = name("template-name"); A.notice(""); await A.State.change(lib => { unique(lib.templates, label, "Un modèle"); lib.templates.push(M.clone(A.doc(), label)); }); await announce(`Modèle « ${label} » enregistré dans ce navigateur.`); },
    "use-template": () => { const template = selected(A.library.templates, "saved-templates"); return A.State.change(lib => { const doc = M.clone(template, `${template.name} · composition`); lib.documents.push(doc); lib.activeId = doc.id; }); },
    "remove-template": () => A.Library.askRemoval("templates", selected(A.library.templates, "saved-templates").id),
    "save-identity": async () => {
      const label = name("identity-name"), blocks = A.doc().blocks.filter(b => ["En-têtes", "Pieds de page"].includes(M.component(b.component).family));
      if (!blocks.length) throw new Error("Ajoutez un en-tête ou un pied de page à cette composition.");
      A.notice(""); await A.State.change(lib => { unique(lib.identities, label, "Une identité"); lib.identities.push({id: M.id(), name: label, blocks: M.copy(blocks)}); });
      await announce(`Identité « ${label} » enregistrée dans ce navigateur.`);
    },
    "use-identity": () => {
      const identity = selected(A.library.identities, "identities"), doc = A.doc(); A.State.guard();
      const modified = doc.blocks.map((b, index) => ({b, index})).filter(({b}) => framed(b) && !intact(b));
      if (!modified.length) return applyIdentity(identity.id, doc.id, identity.name);
      confirmIdentity(identity, doc, modified);
    },
    "remove-identity": () => A.Library.askRemoval("identities", selected(A.library.identities, "identities").id),
    "undo-remove": () => {
      const docId = A.library.activeId, entry = A.removed.get(docId);
      if (!entry) throw new Error("Aucun retrait de bloc à annuler dans cette composition.");
      // Le bloc revient dans l’état courant : les saisies faites depuis le retrait sont conservées.
      const saving = A.State.change(lib => { const blocks = lib.documents.find(d => d.id === docId).blocks; blocks.splice(Math.min(entry.index, blocks.length), 0, M.copy(entry.block)); A.selected = entry.block.id; });
      A.removed.delete(docId); A.UI.removal();
      get("block-editor").querySelector("textarea,input")?.focus();
      A.notice(`Bloc « ${A.UI.blockName(entry.block)} » restauré en position ${A.doc().blocks.findIndex(b => b.id === entry.block.id) + 1}.`);
      return saving;
    },
    "add-block": () => {
      const id = get("catalogue").value; if (!id) throw new Error("Choisissez un composant du catalogue.");
      A.State.guard(); const b = M.createBlock(id); A.selected = b.id;
      const saving = A.State.change(lib => { const doc = lib.documents.find(d => d.id === lib.activeId), selectedIndex = doc.blocks.findIndex(x => x.id === get("block-list").querySelector('[aria-pressed="true"]')?.dataset.select); doc.blocks.splice(selectedIndex < 0 ? doc.blocks.length : selectedIndex + 1, 0, b); });
      get("block-editor").querySelector("textarea,input")?.focus();
      A.notice(`Bloc «\u00a0${A.UI.blockName(b)}\u00a0» ajouté ${A.UI.blockPlace(b.id)}.`);
      return saving;
    },
    "cancel-fields": () => {
      // Les brouillons d’URL (#37) comptent parmi les champs restaurés.
      const restored = new Set([...A.invalid, ...[...A.drafts.values()].map(d => d.input)]);
      A.UI.clearFieldErrors(); A.invalid.clear(); A.drafts.clear(); A.error(""); A.UI.refresh();
      // Le rendu a remplacé le bouton activé : le focus va au premier champ restauré dans l’ordre du document (#43).
      const first = [...document.querySelectorAll("input[id],textarea[id]")].find(input => restored.has(input.id));
      (first || get("block-editor").querySelector('[data-action="cancel-fields"]'))?.focus();
      A.notice(restored.size ? "Champs invalides annulés ; les dernières valeurs valides sont affichées." : "Aucun champ invalide à annuler.");
    },
    "save-now": A.State.save,
    "recover": A.State.recover,
    "export-document": () => { A.State.guard(); A.Files.json(M.document(A.doc()), "composition.courriel.json"); A.notice("Composition proposée au téléchargement avec ses images."); },
    "export-library": () => { A.State.guard(); A.Files.json(M.library(A.library), "bibliotheque.courriels.json"); A.notice("Bibliothèque proposée au téléchargement, avec modèles et identités."); },
    // Décision #32/#37 : le secours exporte la bibliothèque en mémoire même pendant une saisie d’URL invalide (le brouillon n’en fait pas partie).
    "rescue-export": () => { A.State.guardEdit(); A.Files.json(M.library(A.library), "bibliotheque.courriels.json"); A.notice("Bibliothèque en mémoire proposée au téléchargement, avec modèles et identités."); },
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
