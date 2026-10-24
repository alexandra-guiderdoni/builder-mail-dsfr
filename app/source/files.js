(() => {
  "use strict";
  const A = window.MailBuilder;
  function download(data, type, filename) {
    const url = URL.createObjectURL(new Blob([data], {type})), anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const json = (value, filename) => download(JSON.stringify(value, null, 2), "application/json", filename);
  // Nouvelle image locale seulement : réduite et recompressée selon le contrat de A.Images.
  async function image(file, displayWidth) {
    const result = await A.Images.prepare(file, displayWidth);
    A.Model.image(result.value); return result;
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
  A.Files = Object.freeze({download, json, image, validate, copy});
})();
