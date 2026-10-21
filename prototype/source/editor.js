(() => {
  "use strict";
  const get = id => document.getElementById(id), escape = MailRender.escape;
  let doc = MailDocument.initial(), revision = 0, previewURL;
  const status = message => { get("status").textContent = message; };
  const error = message => { get("error").textContent = message; get("error").hidden = !message; };
  function summary() {
    get("state-service").textContent = doc.service;
    get("state-subject").textContent = doc.subject;
    get("state-count").textContent = `${doc.blocks.length} blocs, ${doc.blocks.filter(b => b.type === "image").length} images de contenu`;
  }
  function preview() {
    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = URL.createObjectURL(new Blob([MailRender.html(doc)], {type: "text/html"}));
    get("preview").src = previewURL;
    summary();
  }
  async function save() {
    const current = revision, snapshot = MailDocument.copy(doc);
    get("save-state").textContent = "Sauvegarde en cours…";
    try {
      await PrototypeDraft.save(snapshot);
      if (revision === current) get("save-state").textContent = "Brouillon sauvegardé dans ce navigateur.";
    } catch (cause) { get("save-state").textContent = "Sauvegarde non réalisée."; error(cause.message); }
  }
  function changed() { revision++; error(""); preview(); save(); }
  function field(label, name, value, textarea = false) {
    const id = `block-${name}`;
    return `<label for="${id}">${label}</label>${textarea ? `<textarea id="${id}" data-field="${name}" rows="4">${escape(value)}</textarea>` : `<input id="${id}" data-field="${name}" value="${escape(value)}">`}`;
  }
  function draw() {
    get("service").value = doc.service; get("subject").value = doc.subject; get("footer").value = doc.footer;
    get("blocks").innerHTML = doc.blocks.map((b, i) => `<section class="block" data-id="${escape(b.id)}" aria-labelledby="heading-${i}">
      <h3 id="heading-${i}">${i + 1}. ${{text: "Paragraphe", image: "Image", button: "Action"}[b.type]}</h3>
      ${b.type === "image" ? `<label for="image-${i}">Image PNG ou JPEG locale</label><input id="image-${i}" data-image type="file" accept="image/png,image/jpeg">${field("Alternative de l’image", `${i}-alt`, b.alt)}` : field("Titre ou libellé", `${i}-title`, b.title)}
      ${b.type === "text" ? field("Texte", `${i}-body`, b.body, true) : ""}
      ${b.type === "button" ? field("Lien HTTPS", `${i}-url`, b.url) : ""}
      <div class="actions"><button data-move="-1" ${i === 0 ? "disabled" : ""} aria-label="Monter le bloc ${i + 1}">Monter</button><button data-move="1" ${i === doc.blocks.length - 1 ? "disabled" : ""} aria-label="Descendre le bloc ${i + 1}">Descendre</button><button data-duplicate aria-label="Dupliquer le bloc ${i + 1}">Dupliquer</button><button data-remove aria-label="Retirer le bloc ${i + 1}">Retirer</button></div></section>`).join("");
    preview();
  }
  function replace(next) { MailDocument.validate(next); doc = MailDocument.copy(next); revision++; draw(); save(); }
  function download(content, type, name) {
    const url = URL.createObjectURL(new Blob([content], {type})), a = document.createElement("a");
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function localImage(file) {
    if (!file || !["image/png", "image/jpeg"].includes(file.type)) throw new Error("Choisissez une image PNG ou JPEG.");
    const value = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("Image illisible.")); reader.readAsDataURL(file);
    });
    const img = new Image(); img.src = value;
    try { await img.decode(); } catch { throw new Error("Le contenu du fichier n’est pas une image lisible."); }
    return value;
  }
  for (const key of ["service", "subject", "footer"]) get(key).addEventListener("input", event => { doc[key] = event.target.value; changed(); });
  get("blocks").addEventListener("input", event => {
    const name = event.target.dataset.field;
    if (!name) return;
    const match = name.match(/^(\d+)-(\w+)$/), next = MailDocument.copy(doc);
    next.blocks[Number(match[1])][match[2]] = event.target.value;
    try { MailDocument.validate(next); doc = next; changed(); } catch (cause) { error(cause.message); }
  });
  get("blocks").addEventListener("change", async event => {
    if (!event.target.hasAttribute("data-image")) return;
    const id = event.target.closest("[data-id]").dataset.id;
    try { const image = await localImage(event.target.files[0]); const target = doc.blocks.find(b => b.id === id); if (target) { target.image = image; changed(); } } catch (cause) { error(cause.message); }
  });
  get("blocks").addEventListener("click", event => {
    const button = event.target.closest("button"); if (!button) return;
    const index = doc.blocks.findIndex(b => b.id === button.closest("[data-id]").dataset.id);
    if (button.hasAttribute("data-move")) {
      const destination = index + Number(button.dataset.move);
      [doc.blocks[index], doc.blocks[destination]] = [doc.blocks[destination], doc.blocks[index]];
    } else if (button.hasAttribute("data-duplicate")) doc.blocks.splice(index + 1, 0, {...MailDocument.copy(doc.blocks[index]), id: crypto.randomUUID()});
    else if (button.hasAttribute("data-remove")) doc.blocks.splice(index, 1);
    revision++; draw(); save();
    get("blocks").querySelector("button:not([disabled])")?.focus();
  });
  document.querySelectorAll("[data-add]").forEach(button => button.addEventListener("click", () => { doc.blocks.push(MailDocument.block(button.dataset.add, crypto.randomUUID())); revision++; draw(); save(); }));
  get("project-input").addEventListener("change", async event => {
    if (!event.target.files[0]) return;
    try { replace(MailDocument.parse(await event.target.files[0].text())); error(""); status("Composition importée avec ses images."); } catch (cause) { error(cause.message); }
    event.target.value = "";
  });
  get("snum-import").addEventListener("click", () => {
    try { const result = MailDocument.fromSnum(get("snum-input").value); replace(result.doc); error(""); status(`Paquet SNUM importé. ${result.notes} remarques de collecte exclues du mail ; consultez le paquet source pour les relire.`); } catch (cause) { error(cause.message); }
  });
  const actions = {
    demo: () => { replace(MailDocument.initial()); status("Exemple chargé. L’ancien brouillon sera remplacé après sauvegarde."); },
    save,
    restore: async () => { const stored = await PrototypeDraft.load(); if (!stored) throw new Error("Aucun brouillon sauvegardé dans ce navigateur."); doc = MailDocument.copy(MailDocument.validate(stored.doc)); revision++; draw(); status("Brouillon relu depuis le stockage local."); },
    project: () => { download(JSON.stringify(MailDocument.validate(doc), null, 2), "application/json", "composition.builder-mail.json"); status("Fichier de travail proposé au téléchargement."); },
    mail: () => { download(MailRender.html(doc), "text/html;charset=utf-8", "courriel.html"); status("Courriel HTML proposé au téléchargement."); },
    copy: async () => {
      if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error("Copie enrichie indisponible ici : téléchargez le mail et qualifiez son insertion sur le poste cible.");
      await navigator.clipboard.write([new ClipboardItem({"text/html": new Blob([MailRender.body(doc)], {type: "text/html"}), "text/plain": new Blob([MailRender.plain(doc)], {type: "text/plain"})})]);
      status("Mail copié en HTML et texte. Vérifiez ensuite le collage dans votre messagerie.");
    },
    invalid: () => { try { MailDocument.parse('{"schema":"invalide"}'); } catch (cause) { error(`${cause.message} Votre composition est conservée.`); status("Import invalide refusé ; aucun remplacement du brouillon."); } }
  };
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", async () => { error(""); try { await actions[button.dataset.action](); } catch (cause) { error(cause.message); } }));
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(index) { tabs.forEach((tab, i) => { tab.setAttribute("aria-selected", String(i === index)); tab.tabIndex = i === index ? 0 : -1; get(tab.getAttribute("aria-controls")).hidden = i !== index; }); }
  tabs.forEach((tab, i) => { tab.addEventListener("click", () => selectTab(i)); tab.addEventListener("keydown", event => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; selectTab(next); tabs[next].focus(); }); });
  get("environment").textContent = location.protocol === "file:" ? "Fichier portable · aucun accès réseau requis" : "Variante web · préparation du hors connexion en cours";
  draw();
  PrototypeDraft.load().then(stored => { if (stored && revision === 0) { doc = MailDocument.copy(MailDocument.validate(stored.doc)); draw(); get("save-state").textContent = "Brouillon restauré depuis ce navigateur."; } else if (!stored) get("save-state").textContent = "Aucun brouillon sauvegardé : modifiez le contenu pour démarrer."; }).catch(cause => { get("save-state").textContent = "Sauvegarde indisponible."; error(cause.message); });
  if (location.protocol !== "file:" && "serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").then(() => navigator.serviceWorker.ready).then(() => { get("environment").textContent = "Variante web · ressources préparées pour le hors connexion"; navigator.serviceWorker.addEventListener("controllerchange", () => { get("environment").textContent = "Variante web · hors connexion pris en charge par le cache"; }); }).catch(cause => { get("environment").textContent = "Préparation du hors connexion échouée."; error(cause.message); });
})();
