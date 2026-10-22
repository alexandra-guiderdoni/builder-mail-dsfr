/* Document de composition du prototype ; aucune dépendance au DOM. */
(() => {
  "use strict";
  const schema = "builder-mail-prototype/1";
  const kinds = ["text", "image", "button"];
  const copy = value => JSON.parse(JSON.stringify(value));
  const fail = message => { throw new Error(message); };
  const string = (v, label) => { if (typeof v !== "string") fail(`${label} : texte attendu.`); };
  function image(value) {
    const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    let bytes;
    try {
      if (!match) throw new Error();
      bytes = atob(match[2]);
      if (btoa(bytes).replace(/=+$/, "") !== match[2].replace(/=+$/, "")) throw new Error();
    } catch { fail("Une image PNG ou JPEG avec un contenu Base64 valide est requise."); }
    const valid = match[1] === "png" ? bytes.length >= 33 && bytes.startsWith("\x89PNG\r\n\x1a\n") : bytes.length >= 4 && bytes.startsWith("\xff\xd8\xff");
    if (!valid) fail("Le contenu de l’image ne correspond pas au format annoncé.");
  }
  function link(value) {
    let url;
    try { url = new URL(value); } catch { fail("Le lien doit être une URL HTTPS complète."); }
    if (url.protocol !== "https:" || url.username || url.password || /[\x00-\x20]/.test(value)) fail("Un lien HTTPS sans identifiant est requis.");
  }
  function validate(value) {
    if (!value || value.schema !== schema || !Array.isArray(value.blocks)) fail("Le format de composition du prototype est requis.");
    for (const key of ["service", "subject", "footer", "logo"]) string(value[key], key);
    try { image(value.logo); } catch (cause) { fail(`Logo : ${cause.message}`); }
    const ids = new Set();
    for (const block of value.blocks) {
      if (!block || !kinds.includes(block.type)) fail("Type de bloc inconnu.");
      for (const key of ["id", "title", "body", "url", "image", "alt"]) string(block[key], key);
      if (!block.id || ids.has(block.id)) fail("Identifiant de bloc absent ou dupliqué.");
      ids.add(block.id);
      if (block.type === "image") { try { image(block.image); } catch (cause) { fail(`Bloc ${value.blocks.indexOf(block) + 1} : ${cause.message}`); } }
      if (block.type === "button" && !block.title.trim()) fail("Le libellé de l’action est requis.");
      if (block.type === "button" || block.url) link(block.url);
    }
    return value;
  }
  function block(type, id) {
    return {id, type, title: type === "button" ? "Consulter les informations" : "Un titre de section",
      body: "Un contenu de démonstration à personnaliser.", url: type === "button" ? "https://www.service-public.gouv.fr/" : "",
      image: type === "image" ? "@@DEMO_IMAGE@@" : "", alt: "Visuel de démonstration"};
  }
  function initial() {
    return {schema, service: "Direction de démonstration", subject: "Invitation à une rencontre",
      footer: "Service de démonstration · Informations institutionnelles", logo: "@@LOGO@@",
      blocks: [block("text", "texte-1"), block("image", "image-1"), block("button", "action-1")]};
  }
  function parse(input) {
    let value;
    try { value = JSON.parse(input); } catch { fail("Le fichier de composition n’est pas un JSON valide."); }
    const normalized = copy(validate(value));
    normalized.blocks.filter(b => b.type !== "image").forEach(b => { b.image = ""; });
    return normalized;
  }
  function fromSnum(input) {
    const packet = window.SnumMail.parse(input), doc = initial();
    doc.service = "SNUM";
    doc.subject = `Revue de presse — ${packet.edition_date_long}`;
    doc.blocks = packet.articles.map((article, i) => ({...block("text", `snum-${i}`),
      title: article.title,
      body: `${article.source} · ${article.publication_date_long}\n\n${article.fact}\n\n${article.takeaway}\n\n${article.snum_interest}\n\n${article.keywords.join(" · ")}${article.essential ? "\nEssentiel" : ""}`,
      url: article.url}));
    if (!doc.blocks.length) doc.blocks.push({...block("text", "vide"), title: "Collecte à compléter", body: "Aucun article sélectionné."});
    return {doc: validate(doc), notes: packet.watch.length};
  }
  window.MailDocument = Object.freeze({schema, initial, validate, parse, block, fromSnum, copy, image});
})();
