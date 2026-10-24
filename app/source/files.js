(() => {
  "use strict";
  const A = window.MailBuilder;
  function download(data, type, filename) {
    const url = URL.createObjectURL(new Blob([data], {type})), anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  // Nom de fichier lisible : caractères interdits par Windows, macOS et Linux remplacés, longueur bornée.
  function safeName(value, fallback = "composition") {
    const bytes = text => new TextEncoder().encode(text).length;
    let base = String(value ?? "").normalize("NFC").replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "-").replace(/\s+/g, "-").replace(/-{2,}/g, "-").replace(/^[-.]+|[-.]+$/g, "");
    let chars = Array.from(base).slice(0, 80);
    while (chars.length && bytes(chars.join("")) > 120) chars.pop();
    base = chars.join("").replace(/[-.]+$/, "");
    return base || fallback;
  }
  // Date d'export locale au format AAAA-MM-JJ (celle du poste, pas l'UTC).
  const exportDate = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const exportName = (base, extension, now) => `${safeName(base)}-${exportDate(now)}.${extension}`;
  const json = (value, filename) => download(JSON.stringify(value, null, 2), "application/json", filename);
  async function image(file) {
    const data = await MailImages.read(file, ["image/png", "image/jpeg", "image/gif", "image/webp"]);
    A.Model.image(data); return data;
  }
  async function validate(value) {
    const items = value.schema === "dsfr-mail/library" ? [...value.documents, ...value.templates, ...value.identities] : [value];
    const entries = items.flatMap(item => item.blocks.flatMap((block, i) => A.Model.component(block.component).fields.filter(f => f.type === "image" && !(block.component === "mail-31" && f.key === "f0" && block.values.f0 === "")).map(f => ({value: block.values[f.key], label: `${item.name}, bloc ${i + 1}, ${f.label}`}))));
    await MailImages.validate(entries);
  }
  async function copy() {
    A.State.guard();
    A.Render.assertOutput(A.doc());
    if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error("La copie enrichie est indisponible ici. Téléchargez le mail HTML pour sa reprise sur votre poste.");
    await navigator.clipboard.write([new ClipboardItem({"text/html": new Blob([A.Render.clipboardHtml(A.doc())], {type: "text/html"}), "text/plain": new Blob([A.Render.plain(A.doc())], {type: "text/plain"})})]);
    A.notice("Courriel copié en HTML et texte. Contrôlez le collage et les images dans votre messagerie.");
  }
  A.Files = Object.freeze({download, json, safeName, exportDate, exportName, image, validate, copy});
})();
