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
  addEventListener("message", event => { if (event.source === parent && event.data?.type === "mail-preview-measure" && event.data.token === token) measure(); });
  document.fonts.ready.then(measure);
  measure();
})();
