(() => {
  "use strict";
  const A = window.MailBuilder, environment = document.getElementById("environment"), install = document.getElementById("install"), update = document.getElementById("update");
  if (location.protocol === "file:" || !document.querySelector('link[rel="manifest"]')) { environment.textContent = "Fichier portable · prêt hors connexion"; return; }
  let installPrompt, registration;
  window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); installPrompt = event; install.hidden = false; });
  install.addEventListener("click", async () => {
    if (!installPrompt) return;
    const prompt = installPrompt; installPrompt = null; install.hidden = true;
    try { await prompt.prompt(); const result = await prompt.userChoice; A.notice(result.outcome === "accepted" ? "Installation acceptée." : "Installation annulée. Le navigateur proposera une nouvelle tentative lorsqu’elle sera disponible."); } catch (cause) { A.error(`Installation indisponible : ${cause.message}`); }
  });
  window.addEventListener("appinstalled", () => { install.hidden = true; environment.textContent = "Atelier installé dans ce navigateur"; });
  if (!("serviceWorker" in navigator)) { environment.textContent = "Hors connexion web indisponible · utilisez le fichier portable"; return; }
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (reloading) location.reload(); });
  update.addEventListener("click", async () => {
    try { await A.State.save(); await A.State.flush(); if (registration.waiting) { reloading = true; registration.waiting.postMessage({type: "ACTIVATE_UPDATE"}); } } catch (cause) { A.error(cause.message); }
  });
  navigator.serviceWorker.register("./sw.js").then(async result => {
    registration = result;
    const ready = await navigator.serviceWorker.ready;
    environment.textContent = ready.active ? "Version web · ressources disponibles hors connexion" : "Préparation du hors connexion…";
    if (registration.waiting) update.hidden = false;
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => { if (worker.state === "installed" && navigator.serviceWorker.controller) { update.hidden = false; A.notice("Une mise à jour est prête. Vos données seront sauvegardées avant son activation."); } });
    });
  }).catch(cause => { environment.textContent = "Préparation du hors connexion impossible"; A.error(cause.message); });
})();
