/* Modèle versionné : les compositions contiennent des valeurs, jamais des gabarits. */
(() => {
  "use strict";
  const A = window.MailBuilder, components = new Map(A.catalog.components.map(c => [c.id, c]));
  const copy = value => JSON.parse(JSON.stringify(value));
  const fail = message => { throw new Error(message); };
  const text = (value, label) => { if (typeof value !== "string") fail(`${label} : texte requis.`); };
  function object(value, fields, label, optional = []) {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} : objet requis.`);
    if (Object.keys(value).some(key => !fields.includes(key) && !optional.includes(key)) || fields.some(key => !Object.hasOwn(value, key))) fail(`${label} : champs manquants ou inconnus.`);
  }
  function url(value, empty = false) {
    if (empty && value === "") return;
    let parsed; try { parsed = new URL(value); } catch { fail("Lien HTTPS complet requis."); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || /[\x00-\x20\x7f]/.test(value)) fail("Lien HTTPS sans identifiant requis.");
  }
  function image(value) {
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
    object(value, ["id", "component", "values", "source"], "Bloc", ["sourceLabel"]);
    text(value.id, "Identifiant"); if (!value.id) fail("Identifiant de bloc vide.");
    const definition = component(value.component);
    object(value.values, definition.fields.map(f => f.key), definition.label);
    for (const field of definition.fields) {
      const v = value.values[field.key]; text(v, field.label);
      if (field.type === "image") { try { image(v); } catch (cause) { fail(`${definition.label}, ${field.label} : ${cause.message}`); } }
      if (field.type === "url") url(v);
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
  function initial() {
    const first = create("Mon premier courriel");
    return {schema: "dsfr-mail/library", version: 1, catalogue: A.catalog.id, activeId: first.id, documents: [first], templates: [], identities: []};
  }
  function setTexts(value, strings) {
    component(value.component).fields.filter(f => f.type === "text").forEach((f, i) => { if (strings[i] !== undefined) value.values[f.key] = strings[i]; });
    return value;
  }
  A.Model = Object.freeze({copy, document, library, block, blocks, component, image, url, id, createBlock, create, clone, initial, setTexts});
})();
