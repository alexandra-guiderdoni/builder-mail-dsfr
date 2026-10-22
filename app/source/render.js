/* Le catalogue canonique fournit le HTML ; les données ne fournissent aucun balisage. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
  function block(value, context = [], preview = false) {
    M.block(value);
    const definition = M.component(value.component);
    const fields = new Map(definition.fields.map(f => [f.key, f]));
    const levels = new Map(), ranks = {principal: 1, section: 2, partie: 3};
    for (const heading of definition.headings) {
      const rank = ranks[heading.role];
      if (rank) while (context.length && context.at(-1).rank >= rank) context.pop();
      const level = value.values[heading.field].trim() ? (context.at(-1)?.level || 0) + 1 : 0;
      levels.set(heading.field, level);
      if (rank && level) context.push({rank, level});
    }
    let template = definition.semanticTemplate.replace(/\{\{heading_(open|close)_(f\d+)\}\}/g, (_, edge, key) => {
      const level = levels.get(key);
      return !level ? "" : edge === "close" ? `</h${level}>` : `<h${level} style="display:inline;margin:0;font-size:inherit;line-height:inherit;font-weight:inherit;">`;
    });
    const incompleteLabels = new Set();
    if (preview) for (const link of definition.links.filter(link => !value.values[link.label].trim())) {
      incompleteLabels.add(link.label);
      template = template.replace(new RegExp(`(<a\\b[^>]*?)\\s+href="\\{\\{${link.url}\\}\\}"`, "g"), "$1");
    }
    let result = template.replace(/\{\{(f\d+)\}\}/g, (_, key) => {
      const encoded = escape(incompleteLabels.has(key) ? "Intitulé du lien à renseigner" : value.values[key]);
      return fields.get(key).type === "text" ? encoded.replace(/\n/g, "<br>") : encoded;
    });
    if (value.source) result += `<table role="presentation" style="text-align:left;text-align:start;width:100%;border-spacing:0;border:0"><tr><td style="padding:0;text-align:center;overflow-wrap:anywhere;word-break:break-word"><table role="presentation" style="text-align:left;text-align:start;width:100%;max-width:600px;margin-left:auto;margin-right:auto"><tr><td style="padding:8px 52px 20px;font-family:Tahoma,Geneva,sans-serif;font-size:14px;overflow-wrap:anywhere;word-break:break-word"><a href="${escape(value.source)}" style="color:#000091">${escape(value.sourceLabel?.trim() || "Consulter la source")}</a></td></tr></table></td></tr></table>`;
    return result;
  }
  function body(value, preview = false) { M.document(value); const context = []; return value.blocks.map(b => block(b, context, preview)).join("\n"); }
  function linkIssues(value) {
    M.document(value);
    return value.blocks.flatMap((b, index) => {
      const definition = M.component(b.component);
      return definition.links.filter(link => !b.values[link.label].trim()).map(link => ({block: b.id, field: link.label, message: `Renseignez l’intitulé du lien : bloc ${index + 1} « ${definition.label} », champ « ${definition.fields.find(f => f.key === link.label).label} ».`}));
    });
  }
  function assertOutput(value) {
    const issue = linkIssues(value)[0];
    if (issue) { const error = new Error(issue.message); error.linkIssue = issue; throw error; }
  }
  function html(value, preview = false) {
    if (!preview) assertOutput(value);
    return `<!doctype html><html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(value.subject)}</title>${preview ? '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;;style-src &#39;unsafe-inline&#39;;img-src data:;base-uri &#39;none&#39;;form-action &#39;none&#39;">' : ""}<style>${A.catalog.css}\n${A.catalog.layoutCss}</style></head><body style="font-family:Tahoma,Geneva,sans-serif;">${body(value, preview)}</body></html>`;
  }
  function plain(value) {
    M.document(value);
    return [value.subject, ...value.blocks.map(b => [...M.component(b.component).fields.map(f => f.type === "image" ? "" : b.values[f.key]), ...(b.source && b.sourceLabel?.trim() ? [b.sourceLabel.trim()] : []), b.source].filter(Boolean).join("\n"))].join("\n\n");
  }
  function clipboardHtml(value) {
    const markup = html(value), doc = new DOMParser().parseFromString(markup, "text/html");
    const add = (element, css) => element.setAttribute("style", (element.getAttribute("style") || "") + ";" + css);
    const remove = (element, property) => element.setAttribute("style", (element.getAttribute("style") || "").replace(new RegExp("(^|;)\\s*" + property + "\\s*:[^;]*(?=;|$)", "gi"), "$1"));
    const gutters = new Map();
    for (const table of doc.querySelectorAll("table.mail-columns-stack")) {
      const widths = [...table.querySelectorAll(":scope>tbody>tr>td[data-mail-column]")].map(cell => Number.parseFloat(cell.style.width));
      const gutter = Number(table.dataset.mailBasis) - widths.reduce((sum, width) => sum + width, 0);
      if (!widths.every(width => Number.isFinite(width) && width > 0) || !Number.isFinite(gutter) || gutter < 0) throw new Error("Largeur de colonne non reconnue.");
      gutters.set(table, gutter);
    }
    // Les messageries retirent les règles de tête et peuvent figer les largeurs.
    // Les bornes inline doivent rester efficaces sans ces règles, sans masquer de contenu.
    // Conserver les chaînes brutes : leur sérialisation CSSOM retirerait les styles Office.
    for (const table of doc.querySelectorAll("table")) {
      const layout = table.hasAttribute("data-mail-columns") && !table.classList.contains("mail-columns-stack") ? "auto" : "fixed";
      add(table, "min-width:0!important;max-width:100%!important;border-collapse:collapse;table-layout:" + layout + ";");
      if (table.parentElement === doc.body) {
        add(table, "width:620px;margin:0;");
      }
    }
    for (const cell of doc.querySelectorAll("td")) {
      add(cell, "overflow-wrap:anywhere;word-break:break-word;max-width:100%;");
      if (cell.hasAttribute("data-mail-column")) {
        const table = cell.closest("[data-mail-columns]");
        // Une lecture filtrée peut figer les pourcentages en pixels.
        // Laisser les deux colonnes se partager l’espace ; garder la gouttière.
        if (gutters.has(table)) remove(cell, "width");
      }
      if (cell.hasAttribute("data-mail-gap")) {
        const table = cell.closest("[data-mail-columns]");
        if (gutters.has(table)) add(cell, "width:" + gutters.get(table) + "px;");
      }
      // Une largeur de cellule figée force son tableau malgré max-width.
      // Les cellules vides colorées gardent l’épaisseur de leur filet décoratif.
      if (!cell.hasAttribute("data-mail-column") && !cell.hasAttribute("data-mail-gap") && (cell.textContent.trim() || cell.children.length || !cell.style.backgroundColor)) {
        remove(cell, "width");
      }
    }
    for (const image of doc.images) {
      add(image, "max-width:100%!important;height:auto;");
    }
    for (const element of doc.querySelectorAll(".hide-white")) add(element, "display:none;");
    for (const element of doc.querySelectorAll(".hide-black")) add(element, "display:block;");
    return "<!doctype html>" + doc.documentElement.outerHTML;
  }
  A.Render = Object.freeze({escape, block, body, html, plain, clipboardHtml, linkIssues, assertOutput});
})();
