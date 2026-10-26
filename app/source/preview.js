/* Seul l’aperçu reçoit la mesure ; les sorties du moteur de courriels restent intactes. */
(() => {
  "use strict";
  const A = window.MailBuilder, measure = A.previewMeasure;
  const slots = ["preview", "catalogue-preview"].map(id => ({frame: document.getElementById(id)}));
  const leases = new Set();
  let frame = slots[0].frame, url, token, loaded = false, navigating = false, pending, latest, active;
  let catalogueId = "", catalogueHtml = "";
  function request() { if (token) frame?.contentWindow?.postMessage({type: "mail-preview-measure", token}, "*"); }
  function navigate(next) {
    const previous = url;
    url = URL.createObjectURL(new Blob([next.html], {type: "text/html"}));
    active = {next, started: performance.now() - next.cost};
    navigating = true; frame.src = `${url}#${next.token}`;
    if (previous) URL.revokeObjectURL(previous);
  }
  function show(value, onLoad) {
    const started = performance.now();
    const marker = "default-src &#39;none&#39;;", rendered = A.Render.html(value, true);
    if (!rendered.includes(marker)) throw new Error("La politique de sécurité de l’aperçu n’est pas reconnue.");
    const html = rendered.replace(marker, `${marker}script-src &#39;sha256-${measure.hash}&#39;;`)
      .replace("</body>", `<script>${measure.source}<\/script></body>`);
    token = crypto.randomUUID(); loaded = false;
    // Une seconde navigation avant le load de la première peut être perdue par le
    // navigateur. Garder seulement le dernier rendu demandé, sans créer son blob.
    const next = latest = {html, token, cost: performance.now() - started, onLoad};
    if (leases.size) return;
    if (navigating) pending = next; else navigate(next);
  }
  addEventListener("message", event => {
    const data = event.data;
    if (!frame || event.source !== frame.contentWindow || event.origin !== "null" || !data || data.type !== "mail-preview-size" || data.token !== token) return;
    /* Une mesure reçue avant le chargement du nouveau document est partielle : sous Firefox, la hauteur chutait puis remontait à chaque frappe. */
    if (!loaded) return;
    if (!frame.clientWidth || !Number.isSafeInteger(data.height) || data.height < 0 || data.width !== frame.clientWidth) return;
    const style = getComputedStyle(frame), height = data.height + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth) + 1;
    if (Math.abs(frame.getBoundingClientRect().height - height) > .5) frame.style.height = `${height}px`;
  });
  function listen(ownedFrame) {
    ownedFrame.addEventListener("load", () => {
      // Un load déjà en file de l'ancien élément n'appartient pas au nouvel aperçu.
      if (frame !== ownedFrame) return;
      navigating = false;
      if (pending) { const next = pending; pending = undefined; navigate(next); return; }
      loaded = true; request();
      const finished = active; active = undefined;
      if (finished) {
        const notify = finished.next.onLoad; finished.next.onLoad = undefined;
        notify?.(performance.now() - finished.started);
      }
    });
  }
  let width;
  const resize = new ResizeObserver(() => { if (frame && frame.clientWidth !== width) { width = frame.clientWidth; request(); } });
  listen(frame); resize.observe(frame);
  function catalogue(id) {
    if (id === catalogueId) return;
    const html = id ? A.Render.html(A.Model.create("Aperçu du composant", [id]), true) : "";
    catalogueId = id; catalogueHtml = html;
    const current = slots[1].frame;
    if (!current) return;
    current.hidden = !id; current.dataset.component = id;
    if (id) current.srcdoc = html; else current.removeAttribute("srcdoc");
  }
  // Retirer les éléments détruit leurs documents ; les cacher ne suffit pas à ce contrat.
  // Chaque confirmation possède une libération, pour transférer une confirmation sans réinsertion intermédiaire.
  function suspend() {
    const lease = {}; leases.add(lease);
    if (leases.size === 1) {
      resize.disconnect(); frame = null; loaded = navigating = false; pending = active = token = undefined;
      if (url) URL.revokeObjectURL(url); url = undefined;
      for (const slot of slots) {
        const old = slot.frame, placeholder = document.createElement("div");
        slot.template = old.cloneNode(false);
        slot.template.removeAttribute("src"); slot.template.removeAttribute("srcdoc");
        placeholder.className = `${old.className || ""} preview-placeholder`.trim();
        placeholder.hidden = old.hidden;
        placeholder.style.height = `${old.getBoundingClientRect().height}px`;
        placeholder.setAttribute("aria-hidden", "true");
        placeholder.textContent = "Aperçu suspendu pendant la confirmation.";
        old.replaceWith(placeholder); slot.placeholder = placeholder; slot.frame = null;
      }
    }
    return () => {
      if (!leases.delete(lease) || leases.size) return;
      frame = slots[0].frame = slots[0].template.cloneNode(false);
      listen(frame); width = undefined;
      if (latest) { latest = {...latest, token: crypto.randomUUID()}; token = latest.token; navigate(latest); }
      const catalogFrame = slots[1].frame = slots[1].template.cloneNode(false);
      catalogFrame.hidden = !catalogueId; catalogFrame.dataset.component = catalogueId;
      if (catalogueId) catalogFrame.srcdoc = catalogueHtml;
      for (const slot of slots) { slot.placeholder.replaceWith(slot.frame); slot.placeholder = slot.template = null; }
      resize.observe(frame);
    };
  }
  A.Preview = Object.freeze({show, catalogue, suspend});
})();
