/* Seul l’aperçu reçoit la mesure ; les sorties du moteur de courriels restent intactes. */
(() => {
  "use strict";
  const A = window.MailBuilder, frame = document.getElementById("preview"), measure = A.previewMeasure;
  let url, token, loaded = false;
  function request() { frame.contentWindow?.postMessage({type: "mail-preview-measure", token}, "*"); }
  function show(value) {
    const marker = "default-src &#39;none&#39;;", rendered = A.Render.html(value, true);
    if (!rendered.includes(marker)) throw new Error("La politique de sécurité de l’aperçu n’est pas reconnue.");
    const html = rendered.replace(marker, `${marker}script-src &#39;sha256-${measure.hash}&#39;;`)
      .replace("</body>", `<script>${measure.source}<\/script></body>`);
    token = crypto.randomUUID(); loaded = false;
    const previous = url;
    url = URL.createObjectURL(new Blob([html], {type: "text/html"}));
    frame.src = `${url}#${token}`;
    if (previous) URL.revokeObjectURL(previous);
  }
  addEventListener("message", event => {
    const data = event.data;
    if (event.source !== frame.contentWindow || event.origin !== "null" || !data || data.type !== "mail-preview-size" || data.token !== token) return;
    /* Une mesure reçue avant le chargement du nouveau document est partielle : sous Firefox, la hauteur chutait puis remontait à chaque frappe. */
    if (!loaded) return;
    if (!frame.clientWidth || !Number.isSafeInteger(data.height) || data.height < 0 || data.width !== frame.clientWidth) return;
    const style = getComputedStyle(frame), height = data.height + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth) + 1;
    if (Math.abs(frame.getBoundingClientRect().height - height) > .5) frame.style.height = `${height}px`;
  });
  frame.addEventListener("load", () => { loaded = true; request(); });
  let width;
  new ResizeObserver(() => { if (frame.clientWidth !== width) { width = frame.clientWidth; request(); } }).observe(frame);
  A.Preview = Object.freeze({show});
})();
