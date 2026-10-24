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
  // Les liens supplémentaires de mail-50 reprennent le lien du gabarit, à la suite du premier :
  // cadre, polices et couleurs restent ceux du catalogue, et les intitulés se replient comme lui.
  function footerLinks(template, value, preview) {
    const anchor = template.match(/<a\b[^>]*\bhref="\{\{f1\}\}"[^>]*>[\s\S]*?\{\{f2\}\}[\s\S]*?<\/a>/)?.[0];
    if (!anchor) throw new Error("Gabarit du pied de page non reconnu.");
    return value.additionalLinks.map(link => {
      const incomplete = preview && !link.label.trim();
      const markup = incomplete ? anchor.replace(/\s+href="\{\{f1\}\}"/, "") : anchor;
      return "&nbsp;| " + markup.replace(/\{\{(f1|f2)\}\}/g, (_, key) => escape(key === "f1" ? link.url : incomplete ? "Intitulé du lien à renseigner" : link.label));
    }).join("");
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
    const fill = part => part.replace(/\{\{(f\d+)\}\}/g, (_, key) => {
      const encoded = escape(incompleteLabels.has(key) ? "Intitulé du lien à renseigner" : value.values[key]);
      return fields.get(key).type === "text" ? encoded.replace(/\n/g, "<br>") : encoded;
    });
    let result;
    if (value.component === "mail-50" && value.additionalLinks?.length) {
      // Les intitulés ajoutés sont insérés après le remplissage des champs : ils restent du texte.
      const extras = footerLinks(definition.semanticTemplate, value, preview), end = template.indexOf("</a>", template.indexOf("{{f2}}")) + "</a>".length;
      result = fill(template.slice(0, end)) + extras + fill(template.slice(end));
    } else result = fill(template);
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
  // Un moteur qui lit ces styles sans comprendre min() garde le rendu dérivé : seules min(), width:auto
  // et des largeurs identiques à la conception sont ajoutées hors des règles !important de tête.
  // Contrairement à la copie, il conserve avec ces styles les largeurs, les proportions des colonnes et les logos.
  function exportHtml(value) {
    const doc = new DOMParser().parseFromString(html(value), "text/html");
    const add = (element, css) => element.setAttribute("style", (element.getAttribute("style") || "") + ";" + css);
    const pixels = width => /^\d+(?:\.\d+)?px$/.test(width) ? Number.parseFloat(width) : 0;
    const imageWidth = image => pixels(image.style.width) || (!image.style.width && /^\d+$/.test(image.getAttribute("width") || "") ? Number(image.getAttribute("width")) : 0);
    // Les images des colonnes tiennent dans leur colonne fixe ; seules les autres images fixes sont bornées.
    const bounded = [...doc.images].filter(image => imageWidth(image) && !image.closest("td[data-mail-column]"));
    // Une table de largeur fixe s’élargit jusqu’à l’image fixe qu’elle contient : garder cette largeur rendue.
    const rendered = new Map();
    for (const image of bounded) {
      let table = image.parentElement.closest("table");
      while (table && !pixels(table.style.width)) table = table.parentElement?.closest("table");
      if (table && imageWidth(image) > pixels(table.style.width)) rendered.set(table, Math.max(rendered.get(table) || 0, imageWidth(image)));
    }
    // WebKit ignore max-width sur une table de largeur fixe : min() la borne à son conteneur.
    for (const table of doc.querySelectorAll("table")) {
      const width = pixels(table.style.width);
      if (width) add(table, (pixels(table.style.minWidth) ? "min-width:0;" : "") + "width:min(100%," + (rendered.get(table) || width) + "px);");
    }
    // Bornée par min(), une table n’est pas élargie par ses cellules de largeur fixe, laissées inchangées.
    // Colonnes empilables : la colonne d’image garde sa largeur, le texte prend le reste, la gouttière est fixée.
    // À la largeur de conception, le partage reste celui du gabarit.
    for (const table of doc.querySelectorAll("table.mail-columns-stack")) {
      const columns = [...table.querySelectorAll(":scope>tbody>tr>td[data-mail-column]")];
      const gutter = Number(table.dataset.mailBasis) - columns.reduce((sum, cell) => sum + pixels(cell.style.width), 0);
      if (!columns.every(cell => pixels(cell.style.width)) || !(gutter >= 0)) continue;
      for (const cell of columns) if (![...cell.querySelectorAll("img")].some(imageWidth)) add(cell, "width:auto;");
      for (const gap of table.querySelectorAll(":scope>tbody>tr>td[data-mail-gap]")) add(gap, "width:" + gutter + "px;");
    }
    for (const image of bounded) {
      const limit = image.style.maxWidth;
      add(image, "max-width:min(" + (limit && limit !== "none" ? limit : imageWidth(image) + "px") + ",100%);");
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
  // Poids du HTML remis au presse-papiers, en octets UTF-8, images incorporées comprises (#35).
  // 90 et 102 Kio sont des repères prudents : ni la taille reçue ni une troncature par Gmail ne sont garanties.
  const WEIGHT_NOTICE = 90 * 1024, WEIGHT_ALERT = 102 * 1024;
  function weight(markup) {
    if (typeof markup !== "string") throw new TypeError("Seul un HTML sous forme de chaîne se pèse.");
    const bytes = new TextEncoder().encode(markup).byteLength;
    return {bytes, level: bytes >= WEIGHT_ALERT ? "alert" : bytes >= WEIGHT_NOTICE ? "notice" : "ok"};
  }
  A.Render = Object.freeze({escape, block, body, html, plain, exportHtml, clipboardHtml, weight, linkIssues, assertOutput});
})();
