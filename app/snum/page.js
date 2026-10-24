(() => {
  "use strict";
  const A = window.MailBuilder, get = id => document.getElementById(id);
  let current, dirty = true, previewURL;
  A.doc = () => current;
  A.error = message => { get("error").textContent = message; get("error").hidden = !message; };
  A.notice = message => { get("notice").textContent = message; };
  A.State = Object.freeze({guard() { if (!current || dirty) throw new Error("Convertissez la collecte actuelle avant d’exporter."); }});
  const buttons = () => { for (const id of ["export-json", "export-html", "copy"]) get(id).disabled = !current || dirty; };
  const attempt = async action => { try { await action(); } catch (cause) { A.error(cause.linkIssue ? `${cause.message} Exportez le JSON puis corrigez cet intitulé dans le builder.` : cause.message); } };
  get("snum-input").addEventListener("input", () => { dirty = true; buttons(); A.error(""); A.notice(current ? "Collecte modifiée : reconvertissez avant d’exporter. L’aperçu précédent est conservé." : ""); A.Files.staleWeight("Poids du courriel à copier : calculé après la conversion."); });
  get("convert").addEventListener("click", () => attempt(() => {
    const result = A.SnumAdapter.convert(get("snum-input").value);
    current = result.document; dirty = false; A.error(""); A.notice(result.notice); buttons(); A.Files.measureWeight();
    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = URL.createObjectURL(new Blob([A.Render.html(current, true)], {type: "text/html"}));
    get("preview").src = previewURL; get("preview").hidden = false; get("empty").hidden = true;
  }));
  get("export-json").addEventListener("click", () => attempt(() => { A.State.guard(); A.Files.json(A.Model.document(current), "snum.composition.courriel.json"); A.notice("Composition générique proposée au téléchargement. Importez ce fichier dans le builder pour poursuivre l’édition."); }));
  get("export-html").addEventListener("click", () => attempt(() => { A.State.guard(); A.Files.download(A.Render.exportHtml(current), "text/html;charset=utf-8", "snum.courriel.html"); }));
  get("copy").addEventListener("click", () => attempt(A.Files.copy));
  A.ready = true;
})();
