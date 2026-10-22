(() => {
  "use strict";
  const get = id => document.getElementById(id), escape = MailRender.escape;
  let doc = MailDocument.initial(), revision = 0, importTicket = 0, restoreTicket = 0, previewURL, startup, token = null, saveQueue = Promise.resolve();
  let documentGeneration = 0; const imageTickets = new Map();
  const invalid = new Map();
  function newGeneration() { documentGeneration++; imageTickets.clear(); }
  const status = message => { get("status").textContent = message; };
  const error = message => { const shown = invalid.values().next().value || message; get("error").textContent = shown; get("error").hidden = !shown; };
  function guard() { if (invalid.size) throw new Error("Corrigez les champs signalés avant cette action."); }
  function edit(input, mutator, label) {
    const next = MailDocument.copy(doc);
    try { mutator(next); MailDocument.validate(next); invalid.delete(input.id); input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); doc = next; changed(); }
    catch (cause) { invalid.set(input.id, `${label} : ${cause.message}`); input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", "error"); error(cause.message); }
  }
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
    saveQueue = saveQueue.then(async () => {
      await startup;
      const saved = await PrototypeDraft.save(snapshot, token); token = saved.token;
      if (revision === current) get("save-state").textContent = "Brouillon sauvegardé dans ce navigateur.";
    }).catch(cause => { get("save-state").textContent = "Sauvegarde non réalisée."; error(cause.message); });
    return saveQueue;
  }
  function changed() { revision++; error(""); preview(); save(); }
  function field(label, name, value, textarea = false) {
    const id = `block-${name}`;
    return `<label for="${id}">${label}</label>${textarea ? `<textarea id="${id}" data-field="${name}" rows="4">${escape(value)}</textarea>` : `<input id="${id}" data-field="${name}" value="${escape(value)}">`}`;
  }
  function draw() {
    get("service").value = doc.service; get("subject").value = doc.subject; get("footer").value = doc.footer;
    get("blocks").innerHTML = doc.blocks.map((b, i) => `<section class="block" data-id="${escape(b.id)}" aria-labelledby="heading-${i}">
      <h3 id="heading-${i}" tabindex="-1">${i + 1}. ${{text: "Paragraphe", image: "Image", button: "Action"}[b.type]}</h3>
      ${b.type === "image" ? `<label for="image-${i}">Image PNG ou JPEG locale</label><input id="image-${i}" data-image type="file" accept="image/png,image/jpeg">${field("Alternative de l’image", `${i}-alt`, b.alt)}` : field("Titre ou libellé", `${i}-title`, b.title)}
      ${b.type === "text" ? field("Texte", `${i}-body`, b.body, true) + field("Lien HTTPS de la source (facultatif)", `${i}-url`, b.url) : ""}
      ${b.type === "button" ? field("Lien HTTPS", `${i}-url`, b.url) : ""}
      <div class="actions"><button data-move="-1" ${i === 0 ? "disabled" : ""} aria-label="Monter le bloc ${i + 1}">Monter</button><button data-move="1" ${i === doc.blocks.length - 1 ? "disabled" : ""} aria-label="Descendre le bloc ${i + 1}">Descendre</button><button data-duplicate aria-label="Dupliquer le bloc ${i + 1}">Dupliquer</button><button data-remove aria-label="Retirer le bloc ${i + 1}">Retirer</button></div></section>`).join("");
    preview();
  }
  function replace(next) { guard(); MailDocument.validate(next); newGeneration(); doc = MailDocument.copy(next); revision++; draw(); save(); }
  function download(content, type, name) {
    const url = URL.createObjectURL(new Blob([content], {type})), a = document.createElement("a");
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function localImage(file) {
    const value = await MailImages.read(file, ["image/png", "image/jpeg"]); MailDocument.image(value); return value;
  }
  async function validateImages(next) {
    MailDocument.validate(next);
    await MailImages.validate([{value: next.logo, label: "Logo"}, ...next.blocks.filter(b => b.type === "image").map((b, i) => ({value: b.image, label: `Image de contenu ${i + 1}`}))]);
    return next;
  }
  for (const key of ["service", "subject", "footer"]) get(key).addEventListener("input", event => edit(event.target, next => { next[key] = event.target.value; }, event.target.labels[0].textContent));
  get("blocks").addEventListener("input", event => {
    const name = event.target.dataset.field;
    if (!name) return;
    const match = name.match(/^(\d+)-(\w+)$/);
    edit(event.target, next => { next.blocks[Number(match[1])][match[2]] = event.target.value; }, `Bloc ${Number(match[1]) + 1}, ${event.target.labels[0].textContent}`);
  });
  get("blocks").addEventListener("change", async event => {
    if (!event.target.hasAttribute("data-image")) return;
    const id = event.target.closest("[data-id]").dataset.id;
    const generation = documentGeneration, ticket = (imageTickets.get(id) || 0) + 1; imageTickets.set(id, ticket); status("Chargement de l’image locale…");
    try {
      const image = await localImage(event.target.files[0]), target = doc.blocks.find(b => b.id === id);
      if (generation !== documentGeneration || imageTickets.get(id) !== ticket || !target) { status("Image obsolète ignorée ; le contenu actuel est conservé."); return; }
      target.image = image; changed(); status("Image locale incorporée au brouillon.");
    } catch (cause) { error(cause.message); }
  });
  get("blocks").addEventListener("click", event => {
    const button = event.target.closest("button"); if (!button) return;
    try { guard(); } catch (cause) { error(cause.message); return; }
    const index = doc.blocks.findIndex(b => b.id === button.closest("[data-id]").dataset.id);
    if (index < 0) return;
    let focusId = doc.blocks[index].id, focusAction = "h3";
    if (button.hasAttribute("data-move")) {
      const destination = index + Number(button.dataset.move);
      [doc.blocks[index], doc.blocks[destination]] = [doc.blocks[destination], doc.blocks[index]];
      focusAction = `[data-move="${button.dataset.move}"]:not([disabled])`;
    } else if (button.hasAttribute("data-duplicate")) {
      const clone = {...MailDocument.copy(doc.blocks[index]), id: crypto.randomUUID()}; doc.blocks.splice(index + 1, 0, clone); focusId = clone.id;
    } else if (button.hasAttribute("data-remove")) {
      imageTickets.set(doc.blocks[index].id, (imageTickets.get(doc.blocks[index].id) || 0) + 1); doc.blocks.splice(index, 1); focusId = doc.blocks[Math.min(index, doc.blocks.length - 1)]?.id;
    }
    revision++; draw(); save();
    const section = [...get("blocks").children].find(e => e.dataset.id === focusId);
    (section?.querySelector(focusAction) || section?.querySelector("h3") || document.querySelector("[data-add=text]")).focus();
  });
  document.querySelectorAll("[data-add]").forEach(button => button.addEventListener("click", () => { try { guard(); doc.blocks.push(MailDocument.block(button.dataset.add, crypto.randomUUID())); revision++; draw(); save(); } catch (cause) { error(cause.message); } }));
  get("project-input").addEventListener("change", async event => {
    const file = event.target.files[0]; if (!file) return;
    const started = revision, ticket = ++importTicket;
    try {
      const next = await validateImages(MailDocument.parse(await file.text()));
      if (started !== revision || ticket !== importTicket) throw new Error("Import obsolète ignoré : une saisie ou un import plus récent est conservé.");
      replace(next); error(""); status("Composition importée avec ses images.");
    } catch (cause) { error(cause.message); }
    if (ticket === importTicket) event.target.value = "";
  });
  get("snum-import").addEventListener("click", () => {
    try { const result = MailDocument.fromSnum(get("snum-input").value); replace(result.doc); error(""); status(`Paquet SNUM importé. ${result.notes} remarques de collecte exclues du mail ; consultez le paquet source pour les relire.`); } catch (cause) { error(cause.message); }
  });
  const actions = {
    demo: () => { replace(MailDocument.initial()); status("Exemple chargé. L’ancien brouillon sera remplacé après sauvegarde."); },
    save,
    restore: async () => {
      guard();
      const started = revision, ticket = ++restoreTicket;
      await saveQueue;
      const stored = await PrototypeDraft.load(); if (!stored) throw new Error("Aucun brouillon sauvegardé dans ce navigateur.");
      const next = MailDocument.copy(await validateImages(stored.doc));
      guard(); if (started !== revision || ticket !== restoreTicket) throw new Error("La restauration obsolète est ignorée ; la saisie plus récente est conservée.");
      newGeneration(); doc = next; token = stored.token ?? null; revision++; draw(); status("Brouillon relu depuis le stockage local.");
    },
    project: () => { guard(); download(JSON.stringify(MailDocument.validate(doc), null, 2), "application/json", "composition.builder-mail.json"); status("Fichier de travail proposé au téléchargement."); },
    mail: () => { guard(); download(MailRender.html(doc), "text/html;charset=utf-8", "courriel.html"); status("Courriel HTML proposé au téléchargement."); },
    copy: async () => {
      guard();
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
  const webApp = location.protocol !== "file:" && !!document.querySelector('link[rel="manifest"]');
  get("environment").textContent = webApp ? "Variante web · préparation du hors connexion en cours" : "Fichier portable · aucun accès réseau requis";
  draw();
  startup = PrototypeDraft.load().then(stored => { token = stored?.token ?? null; if (stored && revision === 0 && !invalid.size) { newGeneration(); doc = MailDocument.copy(MailDocument.validate(stored.doc)); draw(); get("save-state").textContent = "Brouillon restauré depuis ce navigateur."; } else if (!stored) get("save-state").textContent = "Aucun brouillon sauvegardé : modifiez le contenu pour démarrer."; }).catch(cause => { get("save-state").textContent = "Sauvegarde indisponible."; error(cause.message); });
  if (webApp && "serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").then(() => navigator.serviceWorker.ready).then(() => { get("environment").textContent = "Variante web · ressources préparées pour le hors connexion"; navigator.serviceWorker.addEventListener("controllerchange", () => { get("environment").textContent = "Variante web · hors connexion pris en charge par le cache"; }); }).catch(cause => { get("environment").textContent = "Préparation du hors connexion échouée."; error(cause.message); });
})();
