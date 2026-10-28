/* Récupération guidée des seules URL HTTPS abrégées autrefois acceptées.
   Les valeurs d'origine ne sont jamais normalisées ni enregistrées sans correction explicite. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, get = id => document.getElementById(id);
  let current;
  const at = (value, path) => path.slice(0, -1).reduce((item, key) => item[key], value);
  function inspect(value) {
    const library = M.copy(value), checked = M.copy(value), links = [];
    function check(value, path, label, options = {}) {
      if (typeof value !== "string" || !/^https:/i.test(value) || /^https:\/\//i.test(value) || /[\x00-\x20\x7f]/.test(value)) return;
      let parsed; try { parsed = new URL(value); } catch { return; }
      if (parsed.protocol !== "https:" || parsed.username || parsed.password) return;
      // Cette substitution sert seulement à valider la structure et les autres données.
      // La copie checked n'est jamais affichée, retournée, diffusée ou sauvegardée.
      at(checked, path)[path.at(-1)] = parsed.href;
      links.push({path, label, value, options});
    }
    try {
      for (const group of ["documents", "templates", "identities"]) {
        if (!Array.isArray(library?.[group])) return null;
        library[group].forEach((item, index) => item.blocks.forEach((block, number) => {
          const definition = M.component(block.component), footer = definition.family === "Pieds de page";
          const prefix = [group, index, "blocks", number];
          const label = `${group === "documents" ? "Composition" : group === "templates" ? "Modèle" : "Identité"} « ${item.name} », bloc ${number + 1} « ${definition.label} »`;
          for (const field of definition.fields.filter(field => field.type === "url")) check(block.values[field.key], [...prefix, "values", field.key], `${label}, ${field.label}`, {footer});
          check(block.source, [...prefix, "source"], `${label}, lien source`, {optional: true});
          (block.additionalLinks || []).forEach((link, position) => check(link.url, [...prefix, "additionalLinks", position, "url"], `${label}, lien supplémentaire ${position + 1}`, {footer: true}));
        }));
      }
      if (!links.length) return null;
      M.library(checked); // Tous les autres contrôles restent stricts : schéma, identifiants, images, protocoles…
      return {library, links};
    } catch { return null; }
  }
  function element(tag, text, className) {
    const node = document.createElement(tag); if (text !== undefined) node.textContent = text;
    if (className) node.className = className; return node;
  }
  function offer(record) {
    const plan = inspect(record.library); if (!plan) return false;
    record = M.copy(record);
    current = {record, plan};
    const section = element("section", undefined, "app-panel"); section.id = "legacy-url-recovery"; section.setAttribute("aria-labelledby", "legacy-url-title");
    const title = element("h2", "Retrouver votre bibliothèque"); title.id = "legacy-url-title"; title.tabIndex = -1;
    section.append(title, element("p", "Vos compositions sont toujours enregistrées. Certaines anciennes adresses ne sont plus acceptées : corrigez-les ci-dessous, puis restaurez la bibliothèque. Aucune écriture n’a encore été faite."));
    const inventory = element("div");
    for (const group of ["documents", "templates", "identities"]) for (const item of plan.library[group]) {
      const details = element("details"), summary = element("summary", `${group === "documents" ? "Composition" : group === "templates" ? "Modèle" : "Identité"} : ${item.name}`);
      const lines = item.blocks.flatMap((block, index) => {
        const definition = M.component(block.component);
        return [`${index + 1}. ${definition.label}`, ...definition.fields.map(field => `${field.label} : ${field.type === "image" ? "image incorporée conservée" : block.values[field.key]}`), `Source : ${block.source}`, ...(block.sourceLabel ? [`Intitulé source : ${block.sourceLabel}`] : []), ...(block.additionalLinks || []).map(link => `${link.label} : ${link.url}`)];
      });
      const content = element("pre", lines.join("\n")); content.style.whiteSpace = "pre-wrap"; content.style.overflowWrap = "anywhere";
      details.append(summary, content); inventory.append(details);
    }
    section.append(inventory);
    const exportButton = element("button", "Exporter la copie brute d’origine", "fr-btn fr-btn--secondary");
    exportButton.type = "button"; exportButton.dataset.legacyExport = "";
    exportButton.addEventListener("click", () => { A.Files.json(record, "recuperation.stockage.json"); A.notice("Copie brute de la bibliothèque lue au démarrage proposée au téléchargement."); });
    section.append(exportButton, element("p", "Exportez d’abord cette copie pour conserver l’original indépendamment du navigateur. Elle ne contient pas les corrections en cours. La restauration conservera aussi l’original comme état précédent, jusqu’à la sauvegarde suivante."));
    const form = element("form"); form.noValidate = true;
    const fields = plan.links.map((link, index) => {
      const row = element("div", undefined, "fr-mt-4v"), label = element("label", link.label, "fr-label"), input = element("input", undefined, "fr-input");
      input.id = `legacy-url-${index}`; input.type = "url"; input.value = link.value; label.htmlFor = input.id;
      const hint = element("p", `Saisissez vous-même la destination complète en https://${link.options.footer ? " ou un lien mailto autorisé en pied de page" : ""}. Aucune adresse ne sera devinée.${link.options.optional ? " Ce lien source peut aussi être laissé vide." : ""}`, "muted"), error = element("p", M.checkUrl(link.value, link.options), "error");
      hint.id = `${input.id}-help`; error.id = `${input.id}-error`; input.setAttribute("aria-describedby", `${hint.id} ${error.id}`); input.setAttribute("aria-invalid", "true");
      row.append(label, hint, input, error); form.append(row);
      input.addEventListener("input", () => { update(); if (!M.checkUrl(input.value, link.options)) { error.textContent = ""; input.removeAttribute("aria-invalid"); } });
      input.addEventListener("blur", () => { const message = M.checkUrl(input.value, link.options); error.textContent = message; if (message) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid"); });
      return {input, link};
    });
    const restoreButton = element("button", "Restaurer la bibliothèque corrigée", "fr-btn primary fr-mt-4v"); restoreButton.type = "submit"; restoreButton.dataset.legacyRestore = "";
    const update = () => { restoreButton.disabled = fields.some(({input, link}) => !!M.checkUrl(input.value, link.options)); };
    form.append(restoreButton); update();
    form.addEventListener("submit", async event => {
      event.preventDefault(); update(); if (restoreButton.disabled) return;
      const library = M.copy(plan.library);
      for (const {input, link} of fields) at(library, link.path)[link.path.at(-1)] = input.value;
      restoreButton.disabled = true;
      try { await A.State.restoreLegacy(library, record.token); }
      catch (cause) { A.error(cause.message); update(); }
    });
    section.append(form); get("workspace").before(section); get("workspace").hidden = true; get("save-rescue").hidden = true;
    title.focus(); return true;
  }
  function close() { current = undefined; get("legacy-url-recovery")?.remove(); get("workspace").hidden = false; }
  const summary = () => current ? `${current.plan.library.documents.length} compositions, ${current.plan.library.templates.length} modèles et ${current.plan.library.identities.length} identités à récupérer ; ${current.plan.links.length} adresse${current.plan.links.length > 1 ? "s" : ""} à corriger.` : "";
  A.LegacyRecovery = Object.freeze({inspect, offer, close, summary, pending: () => !!current});
})();
