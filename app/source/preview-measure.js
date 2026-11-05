(() => {
  "use strict";
  const token = location.hash.slice(1);
  let pending = false;
  function measure() {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      const gutter = innerHeight - document.documentElement.clientHeight;
      const height = Math.ceil(Math.max(document.body.scrollHeight, document.body.getBoundingClientRect().height) + gutter);
      parent.postMessage({type: "mail-preview-size", token, height, width: innerWidth}, "*");
    });
  }
  new ResizeObserver(measure).observe(document.body);
  addEventListener("load", measure);
  addEventListener("resize", measure);
  document.addEventListener("load", measure, true);
  // #211 : sur demande, seule la position verticale d’un repère de bloc et la hauteur jusqu’au repère suivant sont transmises.
  function locate(block) {
    const markers = [...document.querySelectorAll("[data-preview-block]")], index = markers.findIndex(marker => marker.dataset.previewBlock === block);
    if (index < 0) { parent.postMessage({type: "mail-preview-block", token, block, found: false}, "*"); return; }
    const top = markers[index].getBoundingClientRect().top + scrollY, next = markers[index + 1];
    const bottom = (next ? next.getBoundingClientRect().top : document.body.getBoundingClientRect().bottom) + scrollY;
    parent.postMessage({type: "mail-preview-block", token, block, found: true, top: Math.round(top), height: Math.max(0, Math.round(bottom - top))}, "*");
  }
  addEventListener("message", event => {
    if (event.source !== parent || event.data?.token !== token) return;
    if (event.data.type === "mail-preview-measure") measure();
    else if (event.data.type === "mail-preview-locate" && typeof event.data.block === "string") locate(event.data.block);
  });
  document.fonts.ready.then(measure);
  measure();
})();
