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
    const input = get(issue.inputId || `field-${issue.field}`);
    if (input) { fieldError(input, issue.message); input.focus(); }
  }
  function option(value, label, selected = false) { return `<option value="${esc(value)}" ${selected ? "selected" : ""}>${esc(label)}</option>`; }
  const blockLabel = (b, definition) => b.component === "mail-31" && !b.values.f0 ? "Article sans image" : definition.label;
  // Les homonymes importés restent distinguables dans les listes : le rang s’ajoute au nom.
  const labelled = list => list.map(x => { const same = list.filter(y => y.name === x.name); return [x.id, same.length > 1 ? `${x.name} (n° ${same.indexOf(x) + 1})` : x.name]; });
  const blockName = b => blockLabel(b, M.component(b.component));
  function removal() {
    // Un bloc déjà présent (par exemple relu par « Restaurer l’état précédent ») n’est pas proposé une seconde fois.
    const doc = A.doc(), entry = A.removed.get(doc.id), available = Boolean(entry) && !doc.blocks.some(b => b.id === entry.block.id);
    get("undo-remove-zone").hidden = !available;
    get("undo-remove").textContent = available ? `Annuler le retrait du bloc « ${blockName(entry.block)} »` : "Annuler le retrait du bloc";
  }
  function selections() {
    const doc = A.doc(), template = get("saved-templates").value, identity = get("identities").value;
    get("documents").innerHTML = A.library.documents.map(d => option(d.id, d.name, d.id === doc.id)).join("");
    get("saved-templates").innerHTML = option("", "Choisir un modèle enregistré") + labelled(A.library.templates).map(([id, label]) => option(id, label, id === template)).join("");
    get("identities").innerHTML = option("", "Choisir une identité enregistrée") + labelled(A.library.identities).map(([id, label]) => option(id, label, id === identity)).join("");
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
  // Un redessin du bloc affiché garde le champ actif, son curseur et les saisies invalides.
  let shownBlock = null, composing = false, deferredFields = false;
  function capture() {
    const editor = get("block-editor"), active = editor.contains(document.activeElement) ? document.activeElement : null;
    return {
      block: shownBlock,
      active: active?.id ? {id: active.id, start: active.selectionStart, end: active.selectionEnd, direction: active.selectionDirection} : null,
      invalid: [...editor.querySelectorAll("[id]")].filter(input => A.invalid.has(input.id)).map(input => ({id: input.id, value: input.value, message: get(`error-${input.id}`)?.textContent.replace(/^Erreur : /, "") || ""}))
    };
  }
  function restore(saved) {
    if (saved.block !== A.selected) return;
    for (const item of saved.invalid) { const input = get(item.id); if (input) { input.value = item.value; if (item.message) fieldError(input, item.message); } }
    const input = saved.active && get(saved.active.id);
    if (!input || !get("block-editor").contains(input)) return;
    input.focus({preventScroll: true});
    if (typeof saved.active.start === "number") { try { input.setSelectionRange(saved.active.start, saved.active.end, saved.active.direction || "none"); } catch { /* type sans sélection */ } }
  }
  function fields() {
    const b = A.doc().blocks.find(item => item.id === A.selected);
    if (composing && b && b.id === shownBlock) { deferredFields = true; return; }
    const saved = capture(); shownBlock = b?.id ?? null;
    if (!b) { get("block-editor").innerHTML = "<p>Ajoutez un composant au courriel pour personnaliser son contenu.</p>"; return; }
    const definition = M.component(b.component), index = A.doc().blocks.indexOf(b);
    get("block-editor").innerHTML = `<h3>${esc(blockLabel(b, definition))}</h3><p class="muted">${esc(definition.family)}</p>` + definition.fields.map(f => {
      const linkLabel = definition.links.some(link => link.label === f.key), required = f.type === "url" || linkLabel;
      const label = linkLabel ? `${f.label} — Intitulé du lien (obligatoire)` : required ? `${f.label} (obligatoire)` : f.label, id = `field-${f.key}`, v = b.values[f.key];
      if (f.type === "image") return `<div class="image-field">${v ? `<img src="${esc(v)}" alt="Aperçu de l’image sélectionnée">` : '<p class="muted">Sans image</p>'}<label class="fr-label" for="${id}">${esc(b.component === "mail-31" ? "Image facultative" : label)}</label><input id="${id}" data-image-field="${esc(f.key)}" type="file" accept="image/png,image/jpeg,image/gif,image/webp">${b.component === "mail-31" && v ? '<div class="actions"><button class="fr-btn fr-btn--secondary" type="button" data-block-action="remove-image">Retirer l’image</button></div>' : ""}</div>`;
      return `<label class="fr-label" for="${id}">${esc(label)}</label>${f.type === "text" ? `<textarea class="fr-input" id="${id}" data-field="${f.key}" rows="3"${linkLabel ? ' data-link-label aria-required="true"' : ""}>${esc(v)}</textarea>` : `<input class="fr-input" id="${id}" data-field="${f.key}" type="${f.type === "url" ? "url" : "text"}"${required ? ' aria-required="true"' : ""} value="${esc(v)}">`}`;
    }).join("") + footerLinks(b) + `<label class="fr-label" for="article-source">Lien source facultatif du bloc</label><input class="fr-input" id="article-source" type="url" data-source value="${esc(b.source)}"><label class="fr-label" for="article-source-label">Intitulé du lien source</label><input class="fr-input" id="article-source-label" type="text" data-source-label value="${esc(b.sourceLabel ?? "")}" placeholder="Consulter la source" aria-describedby="source-label-help"><p id="source-label-help" class="muted">Sans intitulé, le lien affiche « Consulter la source ». Sans URL, aucun lien source n’est ajouté.</p><div class="actions"><button class="fr-btn fr-btn--secondary" type="button" data-return-to-block>Revenir au bloc sélectionné</button><button class="fr-btn fr-btn--secondary" data-block-action="up" ${index === 0 ? "disabled" : ""}>Monter</button><button class="fr-btn fr-btn--secondary" data-block-action="down" ${index === A.doc().blocks.length - 1 ? "disabled" : ""}>Descendre</button><button class="fr-btn fr-btn--secondary" data-block-action="duplicate">Dupliquer le bloc</button><button class="fr-btn fr-btn--secondary" data-block-action="remove">Retirer le bloc</button><button class="fr-btn fr-btn--secondary" data-action="cancel-fields">Annuler les champs invalides</button></div>`;
    for (const d of A.drafts.values()) {
      const input = d.doc === A.doc().id && d.block === b.id && get(d.input);
      if (input) { input.value = d.value; if (d.shown) fieldError(input, d.message); }
    }
    fitFields(); restore(saved);
  }
  function summary() { get("composition-summary").textContent = `${A.doc().blocks.length} blocs dans « ${A.doc().name} »`; }
  function preview() {
    A.Preview.show(A.doc());
    summary();
  }
  function refresh() {
    selections();
    if (!A.invalid.has("document-name")) get("document-name").value = A.doc().name;
    if (!A.invalid.has("subject")) get("subject").value = A.doc().subject;
    blockList(); fields(); preview(); removal();
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
  // Pendant une composition IME, le champ n’est pas remplacé ; le redessin attend compositionend.
  const endComposition = () => { composing = false; if (deferredFields) { deferredFields = false; setTimeout(fields, 0); } };
  get("block-editor").addEventListener("compositionstart", () => { composing = true; });
  get("block-editor").addEventListener("compositionend", endComposition);
  get("block-editor").addEventListener("focusout", endComposition);
  get("catalogue").addEventListener("change", () => get("catalogue").selectedOptions[0]?.scrollIntoView({block: "nearest"}));
  let editorWidth;
  new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width !== editorWidth) { editorWidth = width; if (width) fitFields(); }
  }).observe(get("block-editor"));
  document.fonts.ready.then(fitFields);
  A.UI = Object.freeze({refresh, preview, summary, fields, blockList, selections, catalogue, fieldError, clearFieldErrors, showLinkIssue, removal, blockName});
})();
