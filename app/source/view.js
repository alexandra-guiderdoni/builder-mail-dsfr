/* L’éditeur affiche seulement les champs du bloc sélectionné. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, esc = A.Render.escape, get = id => document.getElementById(id);
  let previewURL;
  function option(value, label, selected = false) { return `<option value="${esc(value)}" ${selected ? "selected" : ""}>${esc(label)}</option>`; }
  function selections() {
    const doc = A.doc();
    get("documents").innerHTML = A.library.documents.map(d => option(d.id, d.name, d.id === doc.id)).join("");
    get("saved-templates").innerHTML = option("", "Choisir un modèle enregistré") + A.library.templates.map(t => option(t.id, t.name)).join("");
    get("identities").innerHTML = option("", "Choisir une identité enregistrée") + A.library.identities.map(i => option(i.id, i.name)).join("");
    get("library-count").textContent = `${A.library.documents.length} compositions · ${A.library.templates.length} modèles · ${A.library.identities.length} identités`;
    A.Library?.refresh();
  }
  function blockList() {
    get("block-list").innerHTML = A.doc().blocks.map((b, i) => {
      const definition = M.component(b.component), title = definition.fields.find(f => f.type === "text");
      const detail = title ? b.values[title.key].slice(0, 64) : "";
      return `<li><button class="fr-btn fr-btn--secondary" type="button" data-select="${esc(b.id)}" aria-pressed="${A.selected === b.id}"><span>${i + 1}. ${esc(definition.label)}</span><small>${esc(detail)}</small></button></li>`;
    }).join("");
  }
  function fields() {
    const b = A.doc().blocks.find(item => item.id === A.selected);
    if (!b) { get("block-editor").innerHTML = "<p>Ajoutez un composant au courriel pour personnaliser son contenu.</p>"; return; }
    const definition = M.component(b.component), index = A.doc().blocks.indexOf(b);
    get("block-editor").innerHTML = `<h3>${esc(definition.label)}</h3><p class="muted">${esc(definition.family)}</p>` + definition.fields.map(f => {
      const label = f.label, id = `field-${f.key}`, v = b.values[f.key];
      if (f.type === "image") return `<div class="image-field"><img src="${esc(v)}" alt="Aperçu de l’image sélectionnée"><label class="fr-label" for="${id}">${esc(label)}</label><input id="${id}" data-image-field="${esc(f.key)}" type="file" accept="image/png,image/jpeg,image/gif,image/webp"></div>`;
      return `<label class="fr-label" for="${id}">${esc(label)}</label>${f.type === "text" ? `<textarea class="fr-input" id="${id}" data-field="${f.key}" rows="3">${esc(v)}</textarea>` : `<input class="fr-input" id="${id}" data-field="${f.key}" type="${f.type === "url" ? "url" : "text"}" value="${esc(v)}">`}`;
    }).join("") + `<label class="fr-label" for="article-source">Lien source facultatif du bloc</label><input class="fr-input" id="article-source" type="url" data-source value="${esc(b.source)}"><label class="fr-label" for="article-source-label">Intitulé du lien source</label><input class="fr-input" id="article-source-label" type="text" data-source-label value="${esc(b.sourceLabel ?? "")}" placeholder="Consulter la source" aria-describedby="source-label-help"><p id="source-label-help" class="muted">Sans intitulé, le lien affiche « Consulter la source ». Sans URL, aucun lien source n’est ajouté.</p><div class="actions"><button class="fr-btn fr-btn--secondary" data-block-action="up" ${index === 0 ? "disabled" : ""}>Monter</button><button class="fr-btn fr-btn--secondary" data-block-action="down" ${index === A.doc().blocks.length - 1 ? "disabled" : ""}>Descendre</button><button class="fr-btn fr-btn--secondary" data-block-action="duplicate">Dupliquer</button><button class="fr-btn fr-btn--secondary" data-block-action="remove">Retirer le bloc</button><button class="fr-btn fr-btn--secondary" data-action="cancel-fields">Annuler les champs invalides</button></div>`;
  }
  function preview() {
    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = URL.createObjectURL(new Blob([A.Render.html(A.doc(), true)], {type: "text/html"})); get("preview").src = previewURL;
    get("composition-summary").textContent = `${A.doc().blocks.length} blocs dans « ${A.doc().name} »`;
  }
  function refresh() {
    selections(); get("document-name").value = A.doc().name; get("subject").value = A.doc().subject;
    blockList(); fields(); preview();
  }
  function catalogue() {
    const query = get("catalogue-search").value.toLocaleLowerCase("fr");
    const visible = A.catalog.components.filter(c => `${c.family} ${c.label}`.toLocaleLowerCase("fr").includes(query));
    get("catalogue").innerHTML = visible.map(c => option(c.id, `${c.family} — ${c.label}`)).join("");
    get("catalogue-count").textContent = `${visible.length} composants sur ${A.catalog.components.length}`;
  }
  A.UI = Object.freeze({refresh, preview, fields, blockList, selections, catalogue});
})();
