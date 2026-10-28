/* Modèle versionné : les compositions contiennent des valeurs, jamais des gabarits. */
(() => {
  "use strict";
  const A = window.MailBuilder, components = new Map(A.catalog.components.map(c => [c.id, c]));
  // Les conteneurs sont recopiés ; les chaînes, immuables, sont partagées au lieu de recopier les images Base64.
  const copy = value => Array.isArray(value) ? value.map(copy) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)])) : value;
  const fail = message => { throw new Error(message); };
  const text = (value, label) => { if (typeof value !== "string") fail(`${label} : texte requis.`); };
  function object(value, fields, label, optional = []) {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} : objet requis.`);
    if (Object.keys(value).some(key => !fields.includes(key) && !optional.includes(key)) || fields.some(key => !Object.hasOwn(value, key))) fail(`${label} : champs manquants ou inconnus.`);
  }
  // Quatre causes distinctes, testées dans cet ordre : caractères interdits, adresse incomplète, protocole, identifiants.
  const URL_MESSAGES = Object.freeze({
    characters: "Caractères interdits dans l’adresse HTTPS : retirez les espaces et les caractères de contrôle.",
    incomplete: "Adresse HTTPS incomplète : saisissez une adresse complète commençant par https://, par exemple https://exemple.fr/page.",
    protocol: "Protocole interdit : seul HTTPS est accepté, l’adresse doit commencer par https://.",
    credentials: "Identifiants interdits dans l’adresse HTTPS : retirez l’identifiant et le mot de passe."
  });
  function urlIssue(value) {
    if (/[\x00-\x20\x7f]/.test(value)) return "characters";
    let parsed; try { parsed = new URL(value); } catch { return "incomplete"; }
    if (parsed.protocol !== "https:") return "protocol";
    if (parsed.username || parsed.password) return "credentials";
    // Une autorité explicite conserve la destination lorsque le HTML rejoint un webmail HTTPS.
    if (!/^https:\/\//i.test(value)) return "incomplete";
    return null;
  }
  function url(value, empty = false) {
    if (empty && value === "") return;
    const issue = urlIssue(value);
    if (issue) fail(URL_MESSAGES[issue]);
  }
  function footerUrl(value) {
    if (!/^mailto:/i.test(value)) return url(value);
    const message = "Lien mailto de pied de page : une adresse ASCII et un objet facultatif, sans autre paramètre.";
    let mail; try { mail = new URL(value); } catch { fail(message); }
    const address = /^[A-Za-z0-9_+-]+(?:\.[A-Za-z0-9_+-]+)*@[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*(?:\.[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)+$/;
    if (/[\x00-\x20\x7f]/.test(value) || mail.hash || !address.test(mail.pathname) ||
        [...mail.searchParams.keys()].some(key => key !== "subject") || mail.searchParams.getAll("subject").length > 1) fail(message);
    let subject = mail.searchParams.get("subject") || "";
    for (let depth = 0; depth < 8; depth++) {
      if (/[\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(subject)) fail(message);
      // Normaliser les encodages imbriqués sans réinterpréter les caractères & et +.
      const decoded = new URLSearchParams("subject=" + subject.replace(/[&+]/g, c => encodeURIComponent(c))).get("subject");
      if (decoded === subject) return;
      subject = decoded;
    }
    fail(message);
  }
  // Message exact d’un champ de lien, sans préfixe de bloc ; chaîne vide si le lien est valide.
  function checkUrl(value, {optional = false, footer = false} = {}) {
    try { if (footer) footerUrl(value); else url(value, optional); return ""; } catch (cause) { return cause.message; }
  }
  // Le contrôle d’une image ne dépend que de sa chaîne : une chaîne déjà acceptée n’est pas redécodée à chaque frappe.
  // Le mémo ne garde que les images de la dernière bibliothèque validée, plus celles acceptées depuis.
  let accepted = new Set(), collected;
  function image(value) {
    if (!accepted.has(value)) { checkImage(value); accepted.add(value); }
    collected?.add(value);
  }
  function checkImage(value) {
    const match = /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    let bytes;
    try {
      if (!match) throw new Error();
      bytes = atob(match[2]);
      if (btoa(bytes).replace(/=+$/, "") !== match[2].replace(/=+$/, "")) throw new Error();
    } catch { fail("Une image incorporée avec un contenu Base64 valide est requise."); }
    const signatures = {png: bytes.length >= 33 && bytes.startsWith("\x89PNG\r\n\x1a\n"),
      jpeg: bytes.length >= 4 && bytes.startsWith("\xff\xd8\xff"),
      gif: bytes.length >= 13 && /^GIF8[79]a/.test(bytes),
      webp: bytes.length >= 20 && bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP"};
    if (!signatures[match[1]]) fail("Le contenu de l’image ne correspond pas au format annoncé.");
  }
  function component(id) { const result = components.get(id); if (!result) fail("Composant de courriel inconnu."); return result; }
  function block(value) {
    object(value, ["id", "component", "values", "source"], "Bloc", ["sourceLabel", ...(value?.component === "mail-50" ? ["additionalLinks"] : [])]);
    text(value.id, "Identifiant"); if (!value.id) fail("Identifiant de bloc vide.");
    const definition = component(value.component);
    object(value.values, definition.fields.map(f => f.key), definition.label);
    for (const field of definition.fields) {
      const v = value.values[field.key]; text(v, field.label);
      if (field.type === "image" && !(definition.id === "mail-31" && field.key === "f0" && v === "")) { try { image(v); } catch (cause) { fail(`${definition.label}, ${field.label} : ${cause.message}`); } }
      if (field.type === "url") (definition.family === "Pieds de page" ? footerUrl : url)(v);
    }
    if (Object.hasOwn(value, "additionalLinks")) {
      if (!Array.isArray(value.additionalLinks) || value.additionalLinks.length > 2) fail("Le pied de page accepte au plus deux liens supplémentaires.");
      for (const link of value.additionalLinks) {
        object(link, ["url", "label"], "Lien supplémentaire");
        text(link.url, "URL du lien supplémentaire"); footerUrl(link.url);
        text(link.label, "Intitulé du lien supplémentaire");
        if (/[\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(link.label)) fail("L’intitulé du lien supplémentaire doit tenir sur une ligne sans caractère de contrôle.");
      }
    }
    text(value.source, "Source"); url(value.source, true);
    if (Object.hasOwn(value, "sourceLabel")) text(value.sourceLabel, "Intitulé du lien source");
    return value;
  }
  function blocks(values) {
    if (!Array.isArray(values)) fail("Liste de blocs requise.");
    const ids = new Set();
    for (const [index, value] of values.entries()) { try { block(value); } catch (cause) { fail(`Bloc ${index + 1} : ${cause.message}`); } if (ids.has(value.id)) fail("Identifiant de bloc dupliqué."); ids.add(value.id); }
  }
  function document(value) {
    object(value, ["schema", "version", "catalogue", "id", "name", "subject", "blocks"], "Composition");
    if (value.schema !== "dsfr-mail/document" || value.version !== 1) fail("Version de composition non prise en charge.");
    if (value.catalogue !== A.catalog.id) fail("Cette composition utilise un autre catalogue. Conservez son fichier original pour une migration.");
    for (const key of ["id", "name", "subject"]) text(value[key], key);
    if (!value.id || !value.name.trim()) fail("Identifiant et nom de composition requis.");
    blocks(value.blocks); return value;
  }
  function library(value) {
    collected = new Set();
    try { libraryFields(value); accepted = collected; return value; } finally { collected = undefined; }
  }
  function libraryFields(value) {
    object(value, ["schema", "version", "catalogue", "activeId", "documents", "templates", "identities"], "Bibliothèque");
    if (value.schema !== "dsfr-mail/library" || value.version !== 1) fail("Version de bibliothèque non prise en charge ; les données sont conservées.");
    if (value.catalogue !== A.catalog.id) fail("Cette bibliothèque utilise un autre catalogue ; les données restent intactes pour une migration.");
    if (!Array.isArray(value.documents) || !Array.isArray(value.templates) || !Array.isArray(value.identities)) fail("Bibliothèque incomplète.");
    for (const list of [value.documents, value.templates, value.identities]) {
      const ids = new Set();
      for (const item of list) {
        if (list === value.identities) {
          object(item, ["id", "name", "blocks"], "Identité");
          text(item.id, "Identifiant"); text(item.name, "Nom");
          if (!item.id || !item.name.trim()) fail("Identité sans nom ou identifiant.");
          blocks(item.blocks);
          if (item.blocks.some(b => !["En-têtes", "Pieds de page"].includes(component(b.component).family))) fail("Une identité contient seulement ses en-têtes et pieds de page.");
        } else document(item);
        if (ids.has(item.id)) fail("Identifiant de bibliothèque dupliqué."); ids.add(item.id);
      }
    }
    if (!value.documents.some(d => d.id === value.activeId)) fail("Composition active absente.");
    return value;
  }
  const id = () => crypto.randomUUID();
  function createBlock(index) {
    const definition = component(typeof index === "number" ? `mail-${String(index).padStart(2, "0")}` : index);
    return {id: id(), component: definition.id, values: Object.fromEntries(definition.fields.map(f => [f.key, f.default])), source: ""};
  }
  function create(name = "Nouvelle composition", indices = [2, 5, 19, 40, 47, 49]) {
    return {schema: "dsfr-mail/document", version: 1, catalogue: A.catalog.id, id: id(), name, subject: name, blocks: indices.map(createBlock)};
  }
  function clone(value, name = value.name) {
    const next = copy(document(value)); next.id = id(); next.name = name;
    next.blocks.forEach(b => { b.id = id(); }); return next;
  }
  // Date explicite dans un texte : année, jour et mois en lettres, jj/mm, jj.mm.aa, aaaa-mm-jj.
  const MONTHS = "janvier|janv|février|fevrier|févr|fevr|mars|avril|avr|mai|juin|juillet|juil|août|aout|septembre|sept|octobre|oct|novembre|nov|décembre|decembre|déc|dec";
  const DATE = new RegExp(`\\b(?:19|20)\\d{2}\\b|\\b(?:${MONTHS})\\b\\.?|\\b(?:0?[1-9]|[12]\\d|3[01])\\/(?:0?[1-9]|1[0-2])\\b|\\b(?:0?[1-9]|[12]\\d|3[01])[.-](?:0?[1-9]|1[0-2])[.-](?:\\d{2}|\\d{4})\\b`, "iu");
  const hasDate = text => DATE.test(String(text ?? ""));
  // Nom libre dans la bibliothèque : « X », puis « X (2) », « X (3) »…
  function uniqueName(base, documents) {
    const taken = new Set(documents.map(d => d.name.trim()));
    if (!taken.has(base.trim())) return base;
    let n = 2; while (taken.has(`${base} (${n})`)) n++;
    return `${base} (${n})`;
  }
  // Composition dérivée d'une autre (modèle, copie) : un objet daté n'est jamais transmis tel quel.
  function derive(source, name) {
    const doc = clone(source, name), replacedSubject = hasDate(doc.subject) ? doc.subject : null;
    if (replacedSubject !== null) doc.subject = name;
    return {doc, replacedSubject};
  }
  function initial() {
    const first = create("Mon premier courriel");
    return {schema: "dsfr-mail/library", version: 1, catalogue: A.catalog.id, activeId: first.id, documents: [first], templates: [], identities: []};
  }
  function setTexts(value, strings) {
    component(value.component).fields.filter(f => f.type === "text").forEach((f, i) => { if (strings[i] !== undefined) value.values[f.key] = strings[i]; });
    return value;
  }
  A.Model = Object.freeze({copy, document, library, block, blocks, component, image, url, checkUrl, urlMessages: URL_MESSAGES, id, createBlock, create, clone, hasDate, uniqueName, derive, initial, setTexts});
})();
