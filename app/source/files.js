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
  const CAUTION = "Repères prudents, sans garantie sur la taille reçue ni sur la troncature.";
  // Les Kio sont tronqués au dixième : les seuils historiques restent 92 160 et 104 448 octets.
  const kio = bytes => (Math.floor(bytes * 10 / 1024) / 10).toLocaleString("fr-FR", {minimumFractionDigits: 1, maximumFractionDigits: 1});
  const count = bytes => bytes.toLocaleString("fr-FR");
  function weightAdvice(result) {
    if (result.dominant === "images") return "Les images incorporées dominent : allégez les illustrations si possible, en conservant les logos de charte.";
    if (result.dominant === "styles") return "Les styles de tête dominent ; retirer un logo n’est pas le conseil adapté.";
    return "Les textes, le balisage et les styles inline dominent : revoyez la longueur des textes ou le nombre de blocs.";
  }
  function weightRisk(result) {
    return result.level === "ok" ? "" : `${result.level === "alert" ? "Alerte" : "Attention"} : repère local ${result.level === "alert" ? "102" : "90"} Kio atteint. Gmail peut n’afficher qu’une partie d’un message volumineux ; l’envoi reste possible. ${CAUTION}`;
  }
  function weightSummary(result, action = "copy") {
    const base = `HTML préparé pour ${action === "export" ? "le téléchargement" : "la copie"} : ${kio(result.bytes)} Kio, images comprises.`;
    return result.level === "ok" ? base : `${base} ${weightRisk(result)}`;
  }
  function weightText(result, action = "copy") {
    const base = `HTML préparé pour ${action === "export" ? "le téléchargement" : "la copie"} : ${count(result.bytes)} octets (${kio(result.bytes)} Kio), images comprises.`;
    const p = result.parts, share = bytes => `${(100 * bytes / (result.bytes || 1)).toLocaleString("fr-FR", {maximumFractionDigits: 1})} %`;
    const detail = p ? ` Répartition : styles de tête ${count(p.styles)} octets (${share(p.styles)}) ; données d’images incorporées ${count(p.images)} octets (${share(p.images)}, ${result.occurrences} occurrences, ${result.distinct} fichiers distincts, URL data: et Base64 compris) ; textes, balisage et styles inline ${count(p.other)} octets (${share(p.other)}).${result.variants ? " Les variantes de logos clair et sombre sont prévues par le gabarit." : ""}` : "";
    return `${base}${detail}${result.level === "ok" ? "" : ` ${weightRisk(result)} ${weightAdvice(result)}`} Les prestataires situent la troncature Gmail vers 102 000 octets de HTML reçu ; Gmail ne publie pas de limite. La messagerie peut extraire les images et retirer les styles : le poids reçu n’est pas mesuré ici. Faites un envoi de test avant diffusion.`;
  }
  let weightTimer, weightCost = 0;
  function showWeight(result, text = weightText(result)) {
    const element = document.getElementById("mail-weight");
    if (!element) return;
    element.dataset.level = result.level;
    if (Number.isSafeInteger(result.bytes)) element.dataset.bytes = String(result.bytes); else delete element.dataset.bytes;
    element.textContent = text;
    // Le builder propose une synthèse visible ; SNUM garde sa description complète existante.
    const summary = document.getElementById("mail-weight-summary");
    if (summary) {
      summary.dataset.level = result.level;
      if (Number.isSafeInteger(result.bytes)) {
        summary.dataset.bytes = String(result.bytes);
        summary.textContent = weightSummary(result);
      } else { delete summary.dataset.bytes; summary.textContent = text; }
    }
  }
  function measureWeight() {
    clearTimeout(weightTimer);
    const started = performance.now();
    try { showWeight(A.Render.weightDetails(A.Render.clipboardHtml(A.doc()), A.doc())); }
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
    const html = A.Render.clipboardHtml(A.doc()), result = A.Render.weightDetails(html, A.doc());
    // Le builder et SNUM exposent un jeton pour préserver un retour plus récent pendant la copie.
    clearTimeout(weightTimer); showWeight(result); A.notice(""); const ticket = A.State.noticeTicket?.();
    // Avertissements confirmables du contrôle avant copie (#36), absents du convertisseur SNUM.
    const warnings = A.Checks?.warnings(A.doc(), result);
    if (warnings && !(await A.Checks.confirm("copy", warnings))) return;
    await navigator.clipboard.write([new ClipboardItem({"text/html": new Blob([html], {type: "text/html"}), "text/plain": new Blob([A.Render.plain(A.doc())], {type: "text/plain"})})]);
    // Après une modale, le document redevient accessible de façon asynchrone : laisser la région live se réexposer.
    // Le jeton d’origine reste contrôlé par A.notice ; une annonce plus récente garde la priorité pendant ce délai.
    if (warnings?.length) await new Promise(resolve => setTimeout(resolve, 250));
    A.notice([`Courriel copié en HTML et texte. ${result.level === "ok" ? "" : `${weightRisk(result)} ${weightAdvice(result)} `}Contrôlez le collage et les images dans votre messagerie.`, ...A.Render.warnings(A.doc())].join(" "), ticket);
  }
  A.Files = Object.freeze({download, json, safeName, exportDate, exportName, image, validate, copy, weightText, weightSummary, weightAdvice, measureWeight, scheduleWeight, staleWeight});
})();
