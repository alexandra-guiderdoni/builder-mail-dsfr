/* Une adresse distante reste une référence : aucune récupération fetch, conversion ou archive locale. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, esc = A.Render.escape;
  const inputId = key => `remote-image-url-${key}`;
  const draft = (block, key) => A.drafts.get(`${A.doc().id}|${block.id}|${inputId(key)}`);
  function control(block, field, local) {
    const key = field.key, pending = draft(block, key), address = pending?.value ?? block.remoteImages?.[key] ?? "", remote = !!pending || !!block.remoteImages?.[key];
    return `<div class="image-field" data-image-source-group="${esc(key)}"><label class="fr-label" for="image-source-${esc(key)}">Source — ${esc(field.label)}</label><select class="fr-select" id="image-source-${esc(key)}" data-image-source="${esc(key)}"><option value="local"${remote ? "" : " selected"}>Depuis mon ordinateur</option><option value="remote"${remote ? " selected" : ""}>Depuis une adresse en ligne</option></select>${remote ? "" : `<div data-local-image>${local}</div>`}${remote ? `<div data-remote-image>${block.remoteImages?.[key] ? `<img src="${esc(block.remoteImages[key])}" referrerpolicy="no-referrer" data-remote-image-preview="${esc(key)}" alt="Aperçu de l’image hébergée">` : ""}<label class="fr-label" for="${inputId(key)}">Adresse HTTPS directe — ${esc(field.label)}</label><input class="fr-input" id="${inputId(key)}" type="url" data-remote-image-url="${esc(key)}" value="${esc(address)}" aria-describedby="remote-image-help-${esc(key)}"><p id="remote-image-help-${esc(key)}" class="muted">L’hébergeur reçoit une requête du navigateur à l’affichage de cette image. Elle reste en ligne, sans archivage dans le fichier ni garantie hors connexion. Appliquez l’adresse pour remplacer la source ; le fichier local est conservé pour revenir en arrière.</p><button class="fr-btn fr-btn--secondary" type="button" data-remote-image-apply="${esc(key)}">Appliquer l’adresse — ${esc(field.label)}</button>${block.remoteImages?.[key] ? `<p class="muted">Image hébergée sur ${esc(new URL(block.remoteImages[key]).hostname)} ; poids distant non mesuré.</p><p class="muted" id="remote-image-state-${esc(key)}">Chargement en ligne en cours ; disponibilité non encore observée.</p>` : ""}</div>` : ""}${block.component === "mail-31" && block.remoteImages?.[key] ? '<div class="actions"><button class="fr-btn fr-btn--secondary" type="button" data-block-action="remove-image">Retirer l’image</button></div>' : ""}</div>`;
  }
  function probe(address) {
    return new Promise((resolve, reject) => {
      const image = new Image(); let policy = false, settled = false;
      const violation = event => { if (event.effectiveDirective === "img-src" && event.blockedURI && address.startsWith(event.blockedURI)) policy = true; };
      const finish = error => {
        if (settled) return; settled = true; clearTimeout(timer); document.removeEventListener("securitypolicyviolation", violation);
        image.onload = image.onerror = null;
        if (error) reject(error); else resolve({width: image.naturalWidth, height: image.naturalHeight});
      };
      const timer = setTimeout(() => finish(new Error("Le chargement de l’image en ligne n’a pas abouti dans le délai prévu. La source enregistrée reste inchangée.")), 10000);
      document.addEventListener("securitypolicyviolation", violation);
      image.referrerPolicy = "no-referrer";
      image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0 ? null : new Error("La ressource ne présente pas de dimensions d’image exploitables. La source enregistrée reste inchangée."));
      image.onerror = () => setTimeout(() => finish(new Error(policy ? "L’image est bloquée par la politique de sécurité (CSP). La source enregistrée reste inchangée." : navigator.onLine === false ? "Le navigateur est hors connexion : l’image hébergée ne peut pas être chargée. La source enregistrée reste inchangée." : "L’image en ligne n’a pas pu être chargée : ressource non-image, indisponible, accès protégé, redirection ou réseau non exploitable. Le navigateur ne permet pas de départager ces causes. La source enregistrée reste inchangée.")), 0);
      image.src = address;
    });
  }
  async function apply(key) {
    const field = document.getElementById(inputId(key)), address = field.value, doc = A.doc().id, block = A.selected;
    A.State.guardEdit();
    try { M.url(address); } catch (cause) { A.State.setDraft(doc, block, field.id, address, cause.message); A.UI.fieldError(field, cause.message); throw cause; }
    const snapshot = A.library;
    A.notice("Chargement de l’image hébergée…"); const ticket = A.State.noticeTicket();
    A.pendingInputs++;
    let dimensions;
    try { dimensions = await probe(address); } catch (cause) { A.notice("", ticket); throw cause; } finally { A.pendingInputs--; }
    if (A.library !== snapshot || A.doc().id !== doc || A.selected !== block || !field.isConnected || field.value !== address) { A.notice("", ticket); throw new Error("Vérification d’image devenue obsolète : aucune source n’a été remplacée. Appliquez de nouveau l’adresse si elle est toujours souhaitée."); }
    A.State.dropDraft(doc, block, field.id);
    try {
      await A.State.change(lib => { const b = lib.documents.find(d => d.id === doc).blocks.find(b => b.id === block); (b.remoteImages ||= {})[key] = address; }, true, "edit");
    } catch (cause) { A.notice("", ticket); A.State.setDraft(doc, block, field.id, address, cause.message); throw cause; }
    A.notice(`Image hébergée sur ${new URL(address).hostname} : affichée dans ce navigateur, ${dimensions.width} × ${dimensions.height} pixels. Poids distant inconnu ; réception dans la messagerie non vérifiée.`, ticket);
  }
  const editor = document.getElementById("block-editor");
  if (editor) {
    for (const type of ["load", "error"]) editor.addEventListener(type, event => {
      const image = event.target, key = image.dataset?.remoteImagePreview;
      if (!key) return;
      const state = document.getElementById(`remote-image-state-${key}`);
      if (state) state.textContent = type === "load" ? `Image affichée dans ce navigateur, ${image.naturalWidth} × ${image.naturalHeight} pixels ; poids distant inconnu, réception non vérifiée.` : navigator.onLine === false ? "Image hébergée indisponible hors connexion ; revenez au fichier local si nécessaire." : "Image hébergée non affichée : accès, ressource ou réseau non exploitable ; cause exacte non observable ici.";
    }, true);
    editor.addEventListener("change", event => {
      const key = event.target.dataset.imageSource; if (!key) return;
      const block = A.doc().blocks.find(b => b.id === A.selected);
      try {
        A.State.guardEdit();
        if (event.target.value === "remote") {
          if (!block.remoteImages?.[key]) A.State.setDraft(A.doc().id, block.id, inputId(key), "", "Saisissez puis appliquez l’adresse de l’image, ou revenez au fichier local.");
          A.UI.fields(); document.getElementById(inputId(key)).focus();
        } else {
          A.State.dropDraft(A.doc().id, block.id, inputId(key));
          if (block.remoteImages?.[key]) A.State.change(lib => { const b = lib.documents.find(d => d.id === lib.activeId).blocks.find(b => b.id === block.id); M.localImage(b, key, b.values[key]); }, true, "edit").catch(cause => A.error(cause.message));
          else A.UI.fields();
          if (!A.drafts.size && !A.invalid.size) { A.error(""); A.State.restoreErrorFromState(); }
          document.getElementById(`image-source-${key}`)?.focus();
        }
      } catch (cause) { event.target.value = draft(block, key) || block.remoteImages?.[key] ? "remote" : "local"; A.error(cause.message); }
    });
    editor.addEventListener("input", event => {
      const key = event.target.dataset.remoteImageUrl; if (!key) return;
      const field = event.target, message = M.checkUrl(field.value) || "Cette adresse d’image n’est pas encore appliquée. Appliquez-la ou revenez au fichier local.";
      A.State.setDraft(A.doc().id, A.selected, field.id, field.value, message);
      A.UI.fieldError(field, "");
    });
    const request = key => { const doc = A.doc().id, block = A.selected, field = document.getElementById(inputId(key)); return apply(key).catch(cause => {
      // Une annulation remonte le champ : le résultat de l'ancien chargement ne lui appartient plus.
      if (!field || document.getElementById(inputId(key)) !== field || A.doc().id !== doc || A.selected !== block) return;
      A.State.setDraft(doc, block, field.id, field.value, cause.message); A.UI.fieldError(field, cause.message);
      A.error(cause.message);
    }); };
    editor.addEventListener("click", event => {
      if (event.target.closest('[data-block-action="remove-image"]')) A.State.dropDraft(A.doc().id, A.selected, inputId("f0"));
      const button = event.target.closest("[data-remote-image-apply]"); if (button) request(button.dataset.remoteImageApply); });
    editor.addEventListener("keydown", event => { if (event.key === "Enter" && event.target.dataset.remoteImageUrl) { event.preventDefault(); request(event.target.dataset.remoteImageUrl); } });
  }
  A.RemoteImages = Object.freeze({control, probe});
})();
