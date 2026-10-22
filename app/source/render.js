/* Le catalogue canonique fournit le HTML ; les données ne fournissent aucun balisage. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
  function block(value) {
    M.block(value);
    const definition = M.component(value.component);
    const fields = new Map(definition.fields.map(f => [f.key, f]));
    let result = definition.template.replace(/\{\{(f\d+)\}\}/g, (_, key) => {
      const encoded = escape(value.values[key]);
      return fields.get(key).type === "text" ? encoded.replace(/\n/g, "<br>") : encoded;
    });
    if (value.source) result += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center"><table role="presentation" width="600" style="width:100%;max-width:600px"><tr><td style="padding:8px 52px 20px;font-family:Tahoma,Geneva,sans-serif;font-size:14px;"><a href="${escape(value.source)}" style="color:#000091">Consulter la source</a></td></tr></table></td></tr></table>`;
    return result;
  }
  function body(value) { M.document(value); return value.blocks.map(block).join("\n"); }
  function html(value, preview = false) {
    return `<!doctype html><html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(value.subject)}</title>${preview ? '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;;style-src &#39;unsafe-inline&#39;;img-src data:;base-uri &#39;none&#39;;form-action &#39;none&#39;">' : ""}<style>${A.catalog.css}</style></head><body style="font-family:Tahoma,Geneva,sans-serif;">${body(value)}</body></html>`;
  }
  function plain(value) {
    M.document(value);
    return [value.subject, ...value.blocks.map(b => [...M.component(b.component).fields.map(f => f.type === "image" ? "" : b.values[f.key]), b.source].filter(Boolean).join("\n"))].join("\n\n");
  }
  function clipboardHtml(value) {
    const doc = new DOMParser().parseFromString(html(value), "text/html");
    // Les messageries retirent les règles de tête et peuvent figer les largeurs.
    // Les bornes inline doivent rester efficaces sans ces règles, sans masquer de contenu.
    for (const table of doc.querySelectorAll("table")) {
      table.style.setProperty("min-width", "0", "important");
      table.style.setProperty("max-width", "100%", "important");
      table.style.borderCollapse = "collapse";
      table.style.tableLayout = "fixed";
      if (table.parentElement === doc.body) {
        table.removeAttribute("align");
        table.setAttribute("width", "620");
        table.style.width = "620px";
        table.style.margin = "0";
      }
    }
    for (const cell of doc.querySelectorAll("td")) {
      cell.style.overflowWrap = "anywhere";
      cell.style.wordBreak = "break-word";
      cell.style.maxWidth = "100%";
      // Une largeur de cellule figée force son tableau malgré max-width.
      // Les cellules vides colorées gardent l’épaisseur de leur filet décoratif.
      if (cell.textContent.trim() || cell.children.length || !cell.style.backgroundColor) {
        cell.removeAttribute("width");
        cell.style.removeProperty("width");
      }
    }
    for (const image of doc.images) {
      image.style.setProperty("max-width", "100%", "important");
      image.style.height = "auto";
    }
    for (const element of doc.querySelectorAll(".hide-white")) element.style.display = "none";
    for (const element of doc.querySelectorAll(".hide-black")) element.style.display = "block";
    return "<!doctype html>" + doc.documentElement.outerHTML;
  }
  A.Render = Object.freeze({escape, block, body, html, plain, clipboardHtml});
})();
