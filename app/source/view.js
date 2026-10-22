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
      return `<li><button type="button" data-select="${esc(b.id)}" aria-pressed="${A.selected === b.id}"><span>${i + 1}. ${esc(definition.label)}</span><small>${esc(detail)}</small></button></li>`;
    }).join("");
  }
  function fields() {
    const b = A.doc().blocks.find(item => item.id === A.selected);
    if (!b) { get("block-editor").innerHTML = "<p>Ajoutez un composant au courriel pour personnaliser son contenu.</p>"; return; }
    const definition = M.component(b.component), index = A.doc().blocks.indexOf(b);
    get("block-editor").innerHTML = `<h3>${esc(definition.label)}</h3><p class="muted">${esc(definition.family)}</p>` + definition.fields.map(f => {
      const label = f.label, id = `field-${f.key}`, v = b.values[f.key];
      if (f.type === "image") return `<div class="image-field"><img src="${esc(v)}" alt="Aperçu de l’image sélectionnée"><label for="${id}">${esc(label)}</label><input id="${id}" data-image-field="${esc(f.key)}" type="file" accept="image/png,image/jpeg,image/gif,image/webp"></div>`;
      return `<label for="${id}">${esc(label)}</label>${f.type === "text" ? `<textarea id="${id}" data-field="${f.key}" rows="3">${esc(v)}</textarea>` : `<input id="${id}" data-field="${f.key}" type="${f.type === "url" ? "url" : "text"}" value="${esc(v)}">`}`;
    }).join("") + `<label for="article-source">Lien source facultatif de l’article</label><input id="article-source" type="url" data-source value="${esc(b.source)}"><div class="actions"><button data-block-action="up" ${index === 0 ? "disabled" : ""}>Monter</button><button data-block-action="down" ${index === A.doc().blocks.length - 1 ? "disabled" : ""}>Descendre</button><button data-block-action="duplicate">Dupliquer</button><button data-block-action="remove">Retirer le bloc</button><button data-action="cancel-fields">Annuler les champs invalides</button></div>`;
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
