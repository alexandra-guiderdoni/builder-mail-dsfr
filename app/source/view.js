/* L’éditeur affiche seulement les champs du bloc sélectionné. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, esc = A.Render.escape, get = id => document.getElementById(id);
  function fitField(input) {
    if (!input.matches("textarea[data-field]") || !input.getClientRects().length) return;
    input.style.minHeight = "0px"; input.style.height = "auto";
    const style = getComputedStyle(input), height = Math.ceil(input.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth));
    input.style.minHeight = input.style.height = `${height}px`;
  }
  function fitFields() { get("block-editor").querySelectorAll("textarea[data-field]").forEach(fitField); }
  function fieldError(input, message) {
    const id = `error-${input.id}`, descriptions = new Set((input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    let hint = get(id);
    if (message) {
      if (!hint) { hint = document.createElement("p"); hint.id = id; hint.className = "field-error"; hint.dataset.fieldError = input.id; input.insertAdjacentElement("afterend", hint); }
      hint.textContent = `Erreur : ${message}`; descriptions.add(id); input.setAttribute("aria-invalid", "true");
    } else { hint?.remove(); descriptions.delete(id); input.removeAttribute("aria-invalid"); }
    if (descriptions.size) input.setAttribute("aria-describedby", [...descriptions].join(" ")); else input.removeAttribute("aria-describedby");
  }
  function clearFieldErrors() { for (const hint of document.querySelectorAll("[data-field-error]")) { const input = get(hint.dataset.fieldError); if (input) fieldError(input, ""); else hint.remove(); } }
  function showLinkIssue(issue) {
    if (get("editor-page").hidden) return;
    A.selected = issue.block; blockList(); fields();
    const input = get(`field-${issue.field}`);
    if (input) { fieldError(input, issue.message); input.focus(); }
  }
  function option(value, label, selected = false) { return `<option value="${esc(value)}" ${selected ? "selected" : ""}>${esc(label)}</option>`; }
  const blockLabel = (b, definition) => b.component === "mail-31" && !b.values.f0 ? "Article sans image" : definition.label;
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
      const definition = M.component(b.component), title = definition.fields.find(f => f.key === (b.component === "mail-31" ? "f4" : "")) || definition.fields.find(f => f.type === "text");
      const detail = title ? b.values[title.key].slice(0, 64) : "";
      return `<li><button class="fr-btn fr-btn--secondary" type="button" data-select="${esc(b.id)}" aria-pressed="${A.selected === b.id}"><span>${i + 1}. ${esc(blockLabel(b, definition))}</span><small>${esc(detail)}</small></button></li>`;
    }).join("");
  }
  function footerLinks(b) {
    if (b.component !== "mail-50") return "";
    const links = b.additionalLinks || [];
    return `<h4>Autres liens du pied de page</h4>` + links.map((link, i) => `<fieldset><legend>Lien supplémentaire ${i + 1}</legend><label class="fr-label" for="field-footer-url-${i}">Lien HTTPS ou mailto (obligatoire)</label><input class="fr-input" id="field-footer-url-${i}" type="url" data-footer-link-index="${i}" data-footer-link-field="url" aria-required="true" value="${esc(link.url)}"><label class="fr-label" for="field-footer-label-${i}">Intitulé du lien (obligatoire)</label><input class="fr-input" id="field-footer-label-${i}" type="text" data-footer-link-index="${i}" data-footer-link-field="label" data-link-label aria-required="true" value="${esc(link.label)}"><div class="actions"><button class="fr-btn fr-btn--secondary" type="button" data-block-action="remove-footer-link" data-footer-link-index="${i}">Retirer le lien ${i + 1}</button></div></fieldset>`).join("") + `<div class="actions"><button class="fr-btn fr-btn--secondary" type="button" data-block-action="add-footer-link" ${links.length >= 2 ? "disabled" : ""}>Ajouter un lien</button></div>`;
  }
  function fields() {
    const b = A.doc().blocks.find(item => item.id === A.selected);
    if (!b) { get("block-editor").innerHTML = "<p>Ajoutez un composant au courriel pour personnaliser son contenu.</p>"; return; }
    const definition = M.component(b.component), index = A.doc().blocks.indexOf(b);
    get("block-editor").innerHTML = `<h3>${esc(blockLabel(b, definition))}</h3><p class="muted">${esc(definition.family)}</p>` + definition.fields.map(f => {
      const linkLabel = definition.links.some(link => link.label === f.key), required = f.type === "url" || linkLabel;
      const fieldLabel = f.type === "url" && definition.family === "Pieds de page" ? "Lien HTTPS ou mailto" : f.label;
      const label = linkLabel ? `${fieldLabel} — Intitulé du lien (obligatoire)` : required ? `${fieldLabel} (obligatoire)` : fieldLabel, id = `field-${f.key}`, v = b.values[f.key];
      if (f.type === "image") return `<div class="image-field">${v ? `<img src="${esc(v)}" alt="Aperçu de l’image sélectionnée">` : '<p class="muted">Sans image</p>'}<label class="fr-label" for="${id}">${esc(b.component === "mail-31" ? "Image facultative" : label)}</label><p id="image-help-${esc(f.key)}" class="muted">${esc(A.Images.help(b.component, f.key))}</p><input id="${id}" data-image-field="${esc(f.key)}" type="file" accept="image/png,image/jpeg,image/gif,image/webp" aria-describedby="image-help-${esc(f.key)}">${b.component === "mail-31" && v ? '<div class="actions"><button class="fr-btn fr-btn--secondary" type="button" data-block-action="remove-image">Retirer l’image</button></div>' : ""}</div>`;
      return `<label class="fr-label" for="${id}">${esc(label)}</label>${f.type === "text" ? `<textarea class="fr-input" id="${id}" data-field="${f.key}" rows="3"${linkLabel ? ' data-link-label aria-required="true"' : ""}>${esc(v)}</textarea>` : `<input class="fr-input" id="${id}" data-field="${f.key}" type="${f.type === "url" ? "url" : "text"}"${required ? ' aria-required="true"' : ""} value="${esc(v)}">`}`;
    }).join("") + footerLinks(b) + `<label class="fr-label" for="article-source">Lien source facultatif du bloc</label><input class="fr-input" id="article-source" type="url" data-source value="${esc(b.source)}"><label class="fr-label" for="article-source-label">Intitulé du lien source</label><input class="fr-input" id="article-source-label" type="text" data-source-label value="${esc(b.sourceLabel ?? "")}" placeholder="Consulter la source" aria-describedby="source-label-help"><p id="source-label-help" class="muted">Sans intitulé, le lien affiche « Consulter la source ». Sans URL, aucun lien source n’est ajouté.</p><div class="actions"><button class="fr-btn fr-btn--secondary" type="button" data-return-to-block>Revenir au bloc sélectionné</button><button class="fr-btn fr-btn--secondary" data-block-action="up" ${index === 0 ? "disabled" : ""}>Monter</button><button class="fr-btn fr-btn--secondary" data-block-action="down" ${index === A.doc().blocks.length - 1 ? "disabled" : ""}>Descendre</button><button class="fr-btn fr-btn--secondary" data-block-action="duplicate">Dupliquer</button><button class="fr-btn fr-btn--secondary" data-block-action="remove">Retirer le bloc</button><button class="fr-btn fr-btn--secondary" data-action="cancel-fields">Annuler les champs invalides</button></div>`;
    fitFields();
  }
  function preview() {
    A.Preview.show(A.doc());
    get("composition-summary").textContent = `${A.doc().blocks.length} blocs dans « ${A.doc().name} »`;
  }
  function refresh() {
    selections(); get("document-name").value = A.doc().name; get("subject").value = A.doc().subject;
    blockList(); fields(); preview();
  }
  function catalogue() {
    const select = get("catalogue"), previous = select.value, query = get("catalogue-search").value.toLocaleLowerCase("fr");
    const visible = A.catalog.components.filter(c => `${c.family} ${c.label}`.toLocaleLowerCase("fr").includes(query));
    select.innerHTML = visible.map(c => option(c.id, `${c.family} — ${c.label}`)).join("");
    select.size = Math.max(2, visible.length);
    if (visible.some(c => c.id === previous)) select.value = previous;
    get("catalogue-count").textContent = `${visible.length} composants sur ${A.catalog.components.length}`;
  }
  get("block-editor").addEventListener("input", event => fitField(event.target));
  get("catalogue").addEventListener("change", () => get("catalogue").selectedOptions[0]?.scrollIntoView({block: "nearest"}));
  let editorWidth;
  new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width !== editorWidth) { editorWidth = width; if (width) fitFields(); }
  }).observe(get("block-editor"));
  document.fonts.ready.then(fitFields);
  A.UI = Object.freeze({refresh, preview, fields, blockList, selections, catalogue, fieldError, clearFieldErrors, showLinkIssue});
})();
