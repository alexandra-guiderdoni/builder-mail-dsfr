/* Adaptateurs d’entrée ; le modèle valide le résultat avant toute mutation. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model;
  function legacy(value) {
    if (!value || value.schema !== "builder-mail-prototype/1" || !Array.isArray(value.blocks)) throw new Error("Composition du prototype invalide.");
    for (const key of ["service", "subject", "footer", "logo"]) if (typeof value[key] !== "string") throw new Error("Composition du prototype incomplète.");
    const doc = M.create(value.subject || "Composition du prototype", [2]);
    doc.subject = value.subject;
    M.image(value.logo); M.setTexts(doc.blocks[0], [value.service]);
    M.component(doc.blocks[0].component).fields.filter(f => f.type === "image").forEach(f => { doc.blocks[0].values[f.key] = value.logo; });
    if (value.subject.trim()) doc.blocks.push(M.setTexts(M.createBlock(5), [value.subject]));
    for (const old of value.blocks) {
      if (!old || !["text", "button", "image"].includes(old.type)) throw new Error("Bloc du prototype inconnu.");
      for (const key of ["title", "body", "url", "image", "alt"]) if (typeof old[key] !== "string") throw new Error("Bloc du prototype incomplet.");
      const b = M.createBlock({text: 25, button: 40, image: 27}[old.type]), fields = M.component(b.component).fields;
      if (old.type === "text") { M.setTexts(b, [old.title, old.body]); b.source = old.url; }
      if (old.type === "button") { M.setTexts(b, [old.title]); b.values[fields.find(f => f.type === "url").key] = old.url; }
      if (old.type === "image") { M.setTexts(b, [""]); b.values[fields.find(f => f.type === "image").key] = old.image; b.values[fields.find(f => f.type === "alt").key] = old.alt; }
      doc.blocks.push(b);
    }
    doc.blocks.push(M.setTexts(M.createBlock(19), [value.footer])); return M.document(doc);
  }
  // Un article sans image ne garde aucune alternative : normalisation à l’import, sur la copie validée.
  function normalize(blocks) { for (const b of blocks) if (b.component === "mail-31" && b.values.f0 === "") b.values.f1 = ""; }
  function normalized(type, value) {
    if (type === "library") [...value.documents, ...value.templates].forEach(d => normalize(d.blocks)); else normalize(value.blocks);
    return {type, value: M.copy(type === "library" ? M.library(value) : M.document(value))};
  }
  function parse(input) {
    let value; try { value = JSON.parse(input); } catch { throw new Error("Le fichier JSON est invalide ou incomplet."); }
    if (value?.schema === "dsfr-mail/library") {
      try { return normalized("library", M.copy(M.library(value))); }
      catch (cause) {
        const legacy = A.LegacyRecovery?.inspect(value);
        if (legacy) throw new Error(`Ancienne bibliothèque contenant ${legacy.links.length} adresses HTTPS abrégées. Le fichier original et votre bibliothèque actuelle restent inchangés. Corrigez les destinations dans une copie du fichier JSON avant de l’importer : ${legacy.links.map(link => `${link.label} (${link.path.join(".")})`).join(" ; ")}. Aucune adresse ne sera complétée automatiquement.`);
        throw cause;
      }
    }
    if (value?.schema === "builder-mail-prototype/1") return normalized("document", legacy(value));
    return normalized("document", M.copy(M.document(value)));
  }
  function merge(current, incoming) {
    const next = M.copy(M.library(current));
    if (incoming.type === "document") {
      const added = M.clone(incoming.value); next.documents.push(added); next.activeId = added.id;
    } else {
      const documents = incoming.value.documents.map(d => M.clone(d));
      next.documents.push(...documents);
      next.templates.push(...incoming.value.templates.map(d => M.clone(d)));
      next.identities.push(...incoming.value.identities.map(i => ({...M.copy(i), id: M.id(), blocks: i.blocks.map(b => ({...M.copy(b), id: M.id()}))})));
      next.activeId = documents[incoming.value.documents.findIndex(d => d.id === incoming.value.activeId)].id;
    }
    return M.library(next);
  }
  async function read(file) {
    try { return await file.text(); } catch { throw new Error(`Le fichier « ${file.name} » n’a pas pu être lu. Vérifiez qu’il est toujours présent sur votre poste, puis choisissez-le de nouveau ou collez son contenu dans « Importer du JSON ». Votre bibliothèque n’est pas modifiée.`); }
  }
  async function prepare(input) {
    A.State.guard(); const before = A.library; A.pendingInputs++;
    try {
      const incoming = parse(typeof input === "string" ? input : await read(input));
      await A.Files.validate(incoming.value);
      if (A.library !== before) {
        const message = "Import obsolète ignoré : la composition a changé pendant la validation des images.";
        A.notice(message); throw new Error(message);
      }
      return incoming;
    } finally { A.pendingInputs--; }
  }
  A.Imports = Object.freeze({parse, merge, prepare});
})();
