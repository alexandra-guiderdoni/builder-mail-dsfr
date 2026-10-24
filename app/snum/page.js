(() => {
  "use strict";
  const A = window.MailBuilder, get = id => document.getElementById(id);
  let current, dirty = true, previewURL;
  A.doc = () => current;
  const input = get("snum-input");
  A.error = (message, detail) => {
    get("error-text").textContent = message || ""; get("error-detail-text").textContent = detail || "";
    get("error-detail").hidden = !detail; get("error-detail").open = false; get("error").hidden = !message;
  };
  const clearFieldError = () => { input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); };
  const whole = "Le texte collé n’est pas un paquet de Collecte complet. Copiez le bloc entier depuis la Collecte, puis collez-le ici.";
  const plainRules = [
    [/^(Paquet :|articles et watch)/, () => whole],
    [/^Le schéma /, () => "Ce paquet ne vient pas de la version attendue de la Collecte. Générez-le de nouveau depuis la Collecte, puis collez-le ici."],
    [/^Article (\d+) :/, m => `L’article ${m[1]} du paquet est incomplet ou incorrect. Corrigez-le dans la Collecte, puis copiez de nouveau le paquet.`],
    [/^À surveiller (\d+) :/, m => `La remarque « à surveiller » ${m[1]} du paquet est incomplète. Corrigez-la dans la Collecte, puis copiez de nouveau le paquet.`],
    [/^(Édition|Début de période|Fin de période|Les dates|La période)/, () => "Une date du paquet est absente, incorrecte ou incohérente. Vérifiez-la dans la Collecte, puis copiez de nouveau le paquet."]
  ];
  const explain = message => { for (const [pattern, say] of plainRules) { const m = message.match(pattern); if (m) return {text: say(m), detail: message}; } return {text: message}; };
  const fieldError = cause => { const {text, detail} = explain(cause.message); A.error(text, detail); input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", "error"); input.focus(); };
  A.notice = message => { get("notice").textContent = message; };
  A.State = Object.freeze({guard() { if (!current || dirty) throw new Error("Convertissez la collecte actuelle avant d’exporter."); }});
  const buttons = () => { for (const id of ["export-json", "export-html", "copy"]) get(id).disabled = !current || dirty; };
  const attempt = async action => { try { await action(); } catch (cause) { A.error(cause.linkIssue ? `${cause.message} Exportez le JSON puis corrigez cet intitulé dans le builder.` : cause.message); } };
  input.addEventListener("input", () => { dirty = true; buttons(); A.error(""); clearFieldError(); A.notice(current ? "Collecte modifiée : reconvertissez avant d’exporter. L’aperçu précédent est conservé." : ""); A.Files.staleWeight("Poids du courriel à copier : calculé après la conversion."); });
  get("convert").addEventListener("click", () => attempt(() => {
    clearFieldError(); let result;
    try { result = A.SnumAdapter.convert(input.value); } catch (cause) { fieldError(cause); return; }
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
