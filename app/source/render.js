/* Le catalogue et ses variantes contrôlées fournissent le HTML ; les données ne fournissent aucun balisage. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
  function editorialFrame(content) {
    return `<table role="presentation" class="darkmode" style="width:100%;border:0;border-spacing:0;background-color:#ffffff"><tr><td style="padding:0;text-align:center"><table role="presentation" class="wlkm-mw darkmode" style="width:620px;margin:0 auto;border:0;border-spacing:0;background:linear-gradient(90deg,#ffffff 0%,#eaeaea 5%,#eaeaea 95%,#ffffff 100%)"><tr><td style="padding:0"><table role="presentation" class="wlkm-mw darkmode" style="width:600px;margin:0 auto;border-left:1px solid #e5e5e5;border-right:1px solid #e5e5e5;border-spacing:0;background-color:#ffffff"><tr><td style="padding:0"><table role="presentation" class="wlkm-cl darkmode" style="width:496px;max-width:496px;margin:0 auto;border:0;border-spacing:0;border-collapse:collapse">${content}</table></td></tr></table></td></tr></table></td></tr></table>`;
  }
  function articleTextTemplate(values) {
    const pretext = values.f2.trim() ? '<div class="darkmode-1" style="font-size:13px;line-height:20px;color:#666666;margin:0 0 4px">{{f2}}</div>' : "";
    const metadata = values.f5.trim() ? '<div class="darkmode-1" style="font-size:13px;line-height:20px;color:#666666;margin:2px 0 0">{{f5}}</div>' : "";
    const ending = values.f6.trim() ? '<div class="darkmode-1" style="font-size:13px;line-height:20px;color:#666666;margin:4px 0 0">{{f6}}</div>' : "";
    return editorialFrame(`<tr><td class="darkmode-1" style="padding:14px 10px 16px;border-bottom:1px solid #e5e5e5;font-family:Arial,Helvetica,sans-serif;text-align:left;overflow-wrap:anywhere;word-break:break-word">${pretext}<div style="font-size:18px;line-height:26px;font-weight:700;margin:0">{{heading_open_f4}}<a href="{{f3}}" style="color:#000091;font-size:18px;line-height:26px;font-weight:700;text-decoration:none">{{f4}}</a>{{heading_close_f4}}</div>${metadata}${ending}</td></tr>`);
  }
  function footerLinks(value, preview) {
    const links = [{url: value.values.f1, label: value.values.f2}, ...value.additionalLinks];
    const actions = links.map(link => {
      const incomplete = !link.label.trim();
      const target = preview && incomplete ? "" : ` href="${escape(link.url)}"`;
      const label = preview && incomplete ? "Intitulé du lien à renseigner" : link.label;
      return `<a${target} style="display:inline-block;white-space:nowrap;font-size:13px;line-height:24px;color:#000091;text-decoration:underline;margin:0 8px">${escape(label)}</a>`;
    }).join(" ");
    const question = value.values.f0.trim() ? `<div style="margin:0 0 6px">${escape(value.values.f0).replace(/\n/g, "<br>")}</div>` : "";
    return editorialFrame(`<tr><td class="darkmode-1" style="padding:16px 10px 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#666666;text-align:center">${question}<div style="text-align:center">${actions}</div></td></tr>`);
  }
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
    const sourceTemplate = value.component === "mail-31" && value.values.f0 === "" ? articleTextTemplate(value.values) : definition.semanticTemplate;
    let template = sourceTemplate.replace(/\{\{heading_(open|close)_(f\d+)\}\}/g, (_, edge, key) => {
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
    if (value.component === "mail-50" && value.additionalLinks?.length) result = footerLinks(value, preview);
    if (value.source) result += `<table role="presentation" style="text-align:left;text-align:start;width:100%;border-spacing:0;border:0"><tr><td style="padding:0;text-align:center;overflow-wrap:anywhere;word-break:break-word"><table role="presentation" style="text-align:left;text-align:start;width:100%;max-width:600px;margin-left:auto;margin-right:auto"><tr><td style="padding:8px 52px 20px;font-family:Tahoma,Geneva,sans-serif;font-size:14px;overflow-wrap:anywhere;word-break:break-word"><a href="${escape(value.source)}" style="color:#000091">${escape(value.sourceLabel?.trim() || "Consulter la source")}</a></td></tr></table></td></tr></table>`;
    return result;
  }
  function body(value, preview = false) { M.document(value); const context = []; return value.blocks.map(b => block(b, context, preview)).join("\n"); }
  function linkIssues(value) {
    M.document(value);
    return value.blocks.flatMap((b, index) => {
      const definition = M.component(b.component);
      const issues = definition.links.filter(link => !b.values[link.label].trim()).map(link => ({block: b.id, field: link.label, message: `Renseignez l’intitulé du lien : bloc ${index + 1} « ${definition.label} », champ « ${definition.fields.find(f => f.key === link.label).label} ».`}));
      for (const [linkIndex, link] of (b.additionalLinks || []).entries()) if (!link.label.trim()) issues.push({block: b.id, field: `footer-label-${linkIndex}`, message: `Renseignez l’intitulé du lien supplémentaire ${linkIndex + 1} : bloc ${index + 1} « ${definition.label} ».`});
      return issues;
    });
  }
  function assertOutput(value) {
    const issue = linkIssues(value)[0];
    if (issue) { const error = new Error(issue.message); error.linkIssue = issue; throw error; }
  }
  function html(value, preview = false) {
    if (!preview) assertOutput(value);
    const title = value.subject.trim() ? value.subject : value.name;
    return `<!doctype html><html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title>${preview ? '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;;style-src &#39;unsafe-inline&#39;;img-src data:;base-uri &#39;none&#39;;form-action &#39;none&#39;">' : ""}<style>${A.catalog.renderCss}\n${A.catalog.layoutCss}</style></head><body style="font-family:Tahoma,Geneva,sans-serif;">${body(value, preview)}</body></html>`;
  }
  function plain(value) {
    M.document(value);
    return [value.subject, ...value.blocks.map(b => [...M.component(b.component).fields.map(f => f.type === "image" ? "" : b.values[f.key]), ...(b.additionalLinks || []).flatMap(link => [link.label, link.url]), ...(b.source && b.sourceLabel?.trim() ? [b.sourceLabel.trim()] : []), b.source].filter(Boolean).join("\n"))].join("\n\n");
  }
  // L’export garde le rendu dérivé et ses styles de tête ; les bornes ajoutées en fin de style
  // ne jouent que si une messagerie retire ces styles, dont les règles !important l’emportent sinon.
  // Contrairement à la copie, il conserve les largeurs, les proportions des colonnes et les logos.
  function exportHtml(value) {
    const doc = new DOMParser().parseFromString(html(value), "text/html");
    const add = (element, css) => element.setAttribute("style", (element.getAttribute("style") || "") + ";" + css);
    const pixels = width => /^\d+(?:\.\d+)?px$/.test(width) ? Number.parseFloat(width) : 0;
    const imageWidth = image => pixels(image.style.width) || (!image.style.width && /^\d+$/.test(image.getAttribute("width") || "") ? Number(image.getAttribute("width")) : 0);
    // Une table de largeur fixe s’élargit jusqu’à l’image fixe qu’elle contient : garder cette largeur rendue.
    const rendered = new Map();
    for (const image of doc.images) {
      const width = imageWidth(image);
      let table = image.parentElement.closest("table");
      while (table && !pixels(table.style.width)) table = table.parentElement?.closest("table");
      if (width && table && width > pixels(table.style.width)) rendered.set(table, Math.max(rendered.get(table) || 0, width));
    }
    // WebKit ignore max-width sur une table de largeur fixe : min() la borne à son conteneur.
    for (const table of doc.querySelectorAll("table")) {
      const width = pixels(table.style.width);
      if (width) add(table, (pixels(table.style.minWidth) ? "min-width:0;" : "") + "width:min(100%," + (rendered.get(table) || width) + "px);");
    }
    for (const cell of doc.querySelectorAll("td")) {
      const width = pixels(cell.style.width), table = cell.closest("[data-mail-basis]"), basis = Number(table?.dataset.mailBasis);
      if (!width) continue;
      // Colonnes empilables : la même proportion, exacte à la largeur de conception ; un arrondi la décale sous WebKit.
      if (cell.hasAttribute("data-mail-column")) {
        if (table.classList.contains("mail-columns-stack") && basis > 0) add(cell, "width:" + width / basis * 100 + "%;");
      } else if (width > 3) add(cell, "width:min(100%," + width + "px);");
    }
    for (const image of doc.images) {
      const width = imageWidth(image), limit = image.style.maxWidth, height = image.getAttribute("height");
      if (!width) continue;
      add(image, "max-width:" + (limit && limit !== "none" ? "min(" + limit + ",100%)" : "100%") + ";");
      // Une hauteur d’attribut fixe déformerait l’image réduite : garder le cadre du gabarit.
      if (/^\d+$/.test(height || "") && !image.style.height) add(image, "height:auto;aspect-ratio:" + width + "/" + height + ";");
    }
    for (const element of doc.querySelectorAll(".hide-white")) add(element, "display:none;");
    return "<!doctype html>" + doc.documentElement.outerHTML;
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
      // WebKit ignore max-width sur une table de largeur fixe en pixels, imbriquée ou racine.
      // min() la borne à son conteneur ; un moteur qui ignore min() garde la largeur fixe.
      const width = table.style.width;
      if (/^\d+(?:\.\d+)?px$/.test(width)) add(table, "width:min(100%," + width + ");");
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
  A.Render = Object.freeze({escape, block, body, html, plain, exportHtml, clipboardHtml, linkIssues, assertOutput});
})();
