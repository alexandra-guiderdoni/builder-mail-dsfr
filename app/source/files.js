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
  // Poids du courriel à copier (#35) : jamais un blocage, seulement des repères prudents.
  const WARNINGS = Object.freeze({
    notice: "Attention : ce courriel approche du repère de 102 Kio au-delà duquel Gmail peut tronquer un message.",
    alert: "Alerte : ce courriel atteint le repère de 102 Kio ; Gmail risque de le tronquer. Allégez les images ou retirez des blocs."
  });
  const CAUTION = "Repères prudents, sans garantie sur la taille reçue ni sur la troncature.";
  // Les Kio sont tronqués au dixième : 92 159 octets s’affichent 89,9 Kio, jamais 90,0 Kio sans avertissement.
  const kio = bytes => (Math.floor(bytes * 10 / 1024) / 10).toLocaleString("fr-FR", {minimumFractionDigits: 1, maximumFractionDigits: 1});
  function weightText(result) {
    const base = `Poids du courriel à copier : ${kio(result.bytes)} Kio (${result.bytes.toLocaleString("fr-FR")} octets), images comprises.`;
    return result.level === "ok" ? base : `${base} ${WARNINGS[result.level]} ${CAUTION}`;
  }
  let weightTimer, weightCost = 0;
  function showWeight(result, text = weightText(result)) {
    const element = document.getElementById("mail-weight");
    if (!element) return;
    element.dataset.level = result.level;
    if (Number.isSafeInteger(result.bytes)) element.dataset.bytes = String(result.bytes); else delete element.dataset.bytes;
    element.textContent = text;
  }
  function measureWeight() {
    clearTimeout(weightTimer);
    const started = performance.now();
    try { showWeight(A.Render.weight(A.Render.clipboardHtml(A.doc()))); }
    catch (cause) { showWeight({level: "unavailable"}, `Poids du courriel à copier : indisponible tant que la copie est refusée${cause.linkIssue ? " (intitulé de lien à renseigner)" : ""}.`); }
    weightCost = performance.now() - started;
  }
  // Le poids relit tout le HTML copié et ses images : il attend une pause de saisie et n’ajoute aucun rendu complet
  // à chaque frappe, même là où l’aperçu suit encore chaque caractère.
  function scheduleWeight() { clearTimeout(weightTimer); weightTimer = setTimeout(measureWeight, Math.max(500, 3 * weightCost)); }
  function staleWeight(text) { clearTimeout(weightTimer); showWeight({level: "pending"}, text); }
  async function copy() {
    A.State.guard();
    A.Render.assertOutput(A.doc());
    if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error("La copie enrichie est indisponible ici. Téléchargez le mail HTML pour sa reprise sur votre poste.");
    // Le poids affiché est celui du HTML remis au presse-papiers ; une annonce de copie précédente ne survit pas à un échec.
    const html = A.Render.clipboardHtml(A.doc()), result = A.Render.weight(html);
    clearTimeout(weightTimer); showWeight(result); A.notice("");
    await navigator.clipboard.write([new ClipboardItem({"text/html": new Blob([html], {type: "text/html"}), "text/plain": new Blob([A.Render.plain(A.doc())], {type: "text/plain"})})]);
    A.notice(`Courriel copié en HTML et texte. ${result.level === "ok" ? "" : `${WARNINGS[result.level]} ${CAUTION} `}Contrôlez le collage et les images dans votre messagerie.`);
  }
  A.Files = Object.freeze({download, json, safeName, exportDate, exportName, image, validate, copy, weightText, measureWeight, scheduleWeight, staleWeight});
})();
