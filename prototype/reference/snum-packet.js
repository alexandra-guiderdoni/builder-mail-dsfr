/* Copie locale V519 : contrôle du jour ajouté pour #24 ; projet SNUM source intact. */
(() => {
  "use strict";
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const labels = {numerique: "Numérique", ia: "Intelligence artificielle (IA)", commande: "Commande publique", rh: "Ressources humaines", bercy: "Bercy"};
  const packetFields = ["schema_version", "edition_date", "edition_date_long", "window_start", "window_end", "articles", "watch"];
  const articleFields = ["id", "rubric", "title", "source", "publication_date_iso", "publication_date_long", "url", "fact", "keywords", "takeaway", "snum_interest", "essential"];
  const fail = message => { throw new Error(message); };
  const isText = value => typeof value === "string" && value.trim().length > 0;

  function fields(value, expected, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} : objet JSON requis.`);
    const missing = expected.filter(key => !Object.hasOwn(value, key));
    const extra = Object.keys(value).filter(key => !expected.includes(key));
    if (missing.length) fail(`${label} : champs manquants (${missing.join(", ")}).`);
    if (extra.length) fail(`${label} : champs inattendus (${extra.join(", ")}).`);
  }

  function isoDate(value, label) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${label} : date ISO attendue (AAAA-MM-JJ).`);
    const [year, month, day] = value.split("-").map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) fail(`${label} : date impossible.`);
    return value;
  }

  function longDate(value, label, weekday = false) {
    const prefix = weekday ? "(?:(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) )?" : "";
    const match = typeof value === "string" && value.match(new RegExp(`^${prefix}([1-9]|[12]\\d|3[01]) (${months.join("|")}) (\\d{4})$`));
    if (!match) fail(`${label} : date en toutes lettres attendue (14 octobre 2026).`);
    const iso = isoDate(`${match[3]}-${String(months.indexOf(match[2]) + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`, label);
    const day = weekday && value.match(/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) /)?.[1];
    if (day && day !== ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][new Date(iso + "T00:00:00Z").getUTCDay()]) fail(`${label} : jour de semaine incohérent avec la date.`);
    return iso;
  }

  function validate(payload) {
    fields(payload, packetFields, "Paquet");
    if (payload.schema_version !== "SNUM_PAQUET_RENDU_V519") fail("Le schéma SNUM_PAQUET_RENDU_V519 est requis.");
    if (!Array.isArray(payload.articles) || !Array.isArray(payload.watch)) fail("articles et watch doivent être des listes.");
    if (isoDate(payload.edition_date, "Édition") !== longDate(payload.edition_date_long, "Édition", true)) fail("Les dates d’édition sont incohérentes.");
    if (isoDate(payload.window_start, "Début de période") > isoDate(payload.window_end, "Fin de période")) fail("La période de collecte est inversée.");
    const ids = new Set(), urls = new Set();
    payload.articles.forEach((article, index) => {
      const name = `Article ${index + 1}`;
      fields(article, articleFields, name);
      articleFields.filter(key => !["keywords", "essential"].includes(key)).forEach(key => {
        if (!isText(article[key])) fail(`${name} : texte requis dans ${key}.`);
      });
      if (!Object.hasOwn(labels, article.rubric)) fail(`${name} : rubrique inconnue.`);
      if (typeof article.essential !== "boolean") fail(`${name} : essential doit être true ou false.`);
      if (isoDate(article.publication_date_iso, name) !== longDate(article.publication_date_long, name)) fail(`${name} : dates de publication incohérentes.`);
      if (!Array.isArray(article.keywords) || article.keywords.length < 3 || article.keywords.length > 5 || !article.keywords.every(isText)) fail(`${name} : trois à cinq mots-clés textuels sont requis.`);
      let url;
      try { url = new URL(article.url); } catch { fail(`${name} : URL HTTPS invalide.`); }
      if (!article.url.startsWith("https://") || url.protocol !== "https:" || !url.hostname || /[\u0000-\u0020\u007f]/.test(article.url)) fail(`${name} : URL HTTPS invalide.`);
      if (ids.has(article.id)) fail(`${name} : identifiant d’article dupliqué.`);
      if (urls.has(article.url)) fail(`${name} : URL d’article dupliquée.`);
      ids.add(article.id); urls.add(article.url);
    });
    payload.watch.forEach((item, index) => {
      const name = `À surveiller ${index + 1}`;
      fields(item, ["title", "summary"], name);
      if (!isText(item.title) || !isText(item.summary)) fail(`${name} : titre et résumé textuels requis.`);
    });
  }

  function parse(input) {
    let value = input.trim();
    const start = "SNUM_PAQUET_RENDU_V519_START", end = "SNUM_PAQUET_RENDU_V519_END";
    if (!value) fail("Collez le paquet produit par la Collecte.");
    if (value.startsWith("```")) {
      const fenced = value.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
      if (!fenced) fail("Le bloc JSON est incomplet.");
      value = fenced[1].trim();
    }
    if (!value.startsWith("{") && value.includes(start)) {
      const begin = value.indexOf(start) + start.length, finish = value.lastIndexOf(end);
      if (finish < begin) fail("Le marqueur de fin du paquet manque. Recopiez le paquet complet.");
      value = value.slice(begin, finish).trim();
    }
    let result;
    try { result = JSON.parse(value); } catch { fail("Le JSON est incomplet ou invalide. Recopiez le paquet complet depuis la Collecte."); }
    validate(result);
    return result;
  }

  function text(value) {
    const escapes = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;"};
    return String(value).replace(/[&<>"']/g, char => escapes[char])
      .replace(/ ([;:!?%])/g, "&nbsp;$1")
      .replace(/(\d) (\d{3}\b)/g, "$1&nbsp;$2")
      .replace(/@@/g, "&#64;&#64;");
  }

  function fill(template, values) {
    return template.replace(/@@([A-Z_]+)@@/g, (_, key) => {
      if (!Object.hasOwn(values, key)) fail("Le modèle intégré est incomplet.");
      return values[key];
    });
  }

  function dateLabel(value) {
    const [year, month, day] = value.split("-").map(Number);
    return `${day} ${months[month - 1]} ${year}`;
  }

  function build(payload, canon) {
    validate(payload);
    const groups = new Map();
    payload.articles.forEach(article => {
      if (!groups.has(article.rubric)) groups.set(article.rubric, []);
      groups.get(article.rubric).push(article);
    });
    const sections = Array.from(groups, ([rubric, articles], index) => {
      const rows = articles.map(article => {
        const values = {};
        for (const [key, field] of Object.entries({ID: "id", URL: "url", TITLE: "title", SOURCE: "source", DATE_ISO: "publication_date_iso", DATE_LONG: "publication_date_long", FACT: "fact", TAKEAWAY: "takeaway", INTEREST: "snum_interest"})) values[key] = text(article[field]);
        values.KEYWORDS = article.keywords.map(text).join(" · ");
        values.ESSENTIAL = article.essential ? canon.ESSENTIAL : "";
        return fill(canon.ARTICLE, values);
      });
      return fill(canon.RUBRIC, {NUMBER: String(index + 1).padStart(2, "0"), LABEL: labels[rubric], ARTICLES: rows.join("\n")});
    });
    const count = payload.articles.length, essentials = payload.articles.filter(article => article.essential).length;
    const intro = count ? `Veille du ${dateLabel(payload.window_start)} au ${dateLabel(payload.window_end)} · ${count} ${count === 1 ? "article sélectionné" : "articles sélectionnés"}, dont ${essentials} ${essentials === 1 ? "essentiel" : "essentiels"}.` : "Aucun article sélectionné.";
    return fill(canon.PAGE, {
      EDITION_LONG: text(payload.edition_date_long), LOGO: canon.LOGO, INTRO: text(intro),
      RUBRICS: count ? sections.join("\n") : canon.EMPTY,
      WATCH: ""
    });
  }

  window.SnumMail = Object.freeze({parse, build});
})();
