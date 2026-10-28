(() => {
  "use strict";
  const A = window.MailBuilder, environment = document.getElementById("environment"), install = document.getElementById("install"), update = document.getElementById("update");
  if (location.protocol === "file:" || !document.querySelector('link[rel="manifest"]')) { environment.textContent = "Fichier portable · prêt hors connexion"; return; }
  let installPrompt, registration;
  window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); installPrompt = event; install.hidden = false; });
  install.addEventListener("click", async () => {
    if (!installPrompt) return;
    const prompt = installPrompt; installPrompt = null; install.hidden = true;
    // Jeton relevé au départ de l’action : l’annonce du résultat se tait si une autre annonce est passée pendant l’attente (#122).
    // Optional chaining : le contrat isolé de pwa.js (tests/pwa-contract.test.cjs) injecte un MailBuilder sans State.
    const ticket = A.State?.noticeTicket?.();
    try { await prompt.prompt(); const result = await prompt.userChoice; A.notice(result.outcome === "accepted" ? "Installation acceptée." : "Installation annulée. Le navigateur proposera une nouvelle tentative lorsqu’elle sera disponible.", ticket); } catch (cause) { A.error(`Installation indisponible : ${cause.message}`); }
  });
  window.addEventListener("appinstalled", () => { install.hidden = true; environment.textContent = "Atelier installé dans ce navigateur"; });
  if (!("serviceWorker" in navigator)) { environment.textContent = "Hors connexion web indisponible · utilisez le fichier portable"; return; }
  let reloading = false, controlled = !!navigator.serviceWorker.controller;
  // Jeton optionnel : l’annonce différée se tait si une autre est passée pendant save/flush (#122).
  const reloadNeeded = since => { update.hidden = true; A.notice("Une nouvelle version est active dans un autre onglet. Rechargez cette page pour l’utiliser ; le rechargement reste soumis aux protections de sauvegarde.", since); };
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (reloading) location.reload(); else if (controlled) { A.State.outdated(); reloadNeeded(); } controlled = true; });
  update.addEventListener("click", async () => {
    const ticket = A.State?.noticeTicket?.();
    try { await A.State.save(); await A.State.flush(); if (registration.waiting) { reloading = true; registration.waiting.postMessage({type: "ACTIVATE_UPDATE"}); } else reloadNeeded(ticket); } catch (cause) { A.error(cause.message); }
  });
  const helpBox = document.getElementById("offline-help"), helpExport = document.getElementById("offline-export");
  const PORTABLE = "Pour travailler sans connexion, utilisez le fichier portable : sa bibliothèque est séparée de celle de cette page. Exportez la bibliothèque ici, puis importez-la dans le fichier portable.";
  // Ressources que sw.js précache ; un test de contrat vérifie que les deux listes restent identiques.
  const PRECACHED = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png"];
  let failureShown = false;
  // Même export que « Exporter la bibliothèque » : la garde des champs invalides s'applique.
  helpExport.addEventListener("click", () => { try { A.Actions["export-library"](); } catch (cause) { A.error(cause.message); } });
  const show = (status, message) => { environment.textContent = status; helpBox.textContent = message; helpBox.hidden = !message; helpExport.hidden = !message; };
  // Preuve du hors connexion : un cache de ce scope contient toutes les ressources précachées. Un cache vide laissé par une installation en échec ne compte pas.
  const cacheComplete = async () => {
    try {
      const prefix = "atelier-courriels-" + encodeURIComponent(registration.scope) + "-", wanted = PRECACHED.map(file => new URL(file, registration.scope).href);
      for (const key of await caches.keys()) {
        if (!key.startsWith(prefix)) continue;
        const present = (await (await caches.open(key)).keys()).map(request => request.url);
        if (wanted.every(url => present.includes(url))) return true;
      }
    } catch { /* cache illisible : aucune preuve */ }
    return false;
  };
  const announceActive = async () => {
    const proven = await cacheComplete();
    if (failureShown) return;
    if (proven) show("Version web · ressources disponibles hors connexion", "");
    else show("Version web · hors connexion non vérifié", `Les ressources de l’atelier ne sont pas toutes présentes dans le cache de ce navigateur : le hors connexion n’est pas vérifié. ${PORTABLE}`);
  };
  const failed = async firstInstall => {
    failureShown = true;
    if (firstInstall) { show("Hors connexion indisponible · utilisez le fichier portable", `Le hors connexion n’a pas pu être préparé : une ressource de l’atelier n’a pas été mise en cache, donc cette page ne s’ouvrira pas sans connexion. Vos compositions restent enregistrées dans ce navigateur. ${PORTABLE}`); return; }
    const proven = await cacheComplete();
    if (proven) show("Version web · mise à jour non préparée", "La mise à jour n’a pas pu être préparée : une ressource nouvelle n’a pas été mise en cache. La version précédente reste en place et ses ressources sont disponibles hors connexion. Vos compositions sont conservées. Rechargez la page plus tard pour réessayer.");
    else show("Mise à jour non préparée · hors connexion non vérifié", `La mise à jour n’a pas pu être préparée et les ressources de la version précédente n’ont pas pu être vérifiées : ne comptez pas sur le hors connexion. Vos compositions restent enregistrées dans ce navigateur. ${PORTABLE}`);
  };
  // Un worker redevenu « redundant » sans avoir atteint « installed » est un échec d'installation (précache refusé) ; il est de première installation si aucune version n'est active.
  const watch = worker => {
    if (!worker) return;
    let installed = false;
    const check = () => {
      if (["installed", "activating", "activated"].includes(worker.state)) installed = true;
      if (worker.state === "redundant" && !installed) failed(!registration.active);
      if (worker.state === "installed" && navigator.serviceWorker.controller) { update.hidden = false; A.notice("Une mise à jour est prête. Vos données seront sauvegardées avant son activation."); }
    };
    worker.addEventListener("statechange", check); check();
  };
  navigator.serviceWorker.register("./sw.js").then(result => {
    registration = result;
    if (registration.waiting) update.hidden = false;
    registration.addEventListener("updatefound", () => watch(registration.installing));
    if (registration.active) announceActive(); else show("Préparation du hors connexion…", "");
    // Sans version active, « ready » ne se résout jamais après un échec d'installation : il ne bloque donc plus l'affichage.
    navigator.serviceWorker.ready.then(announceActive);
    watch(registration.installing);
  }).catch(cause => { failureShown = true; show("Hors connexion indisponible · utilisez le fichier portable", `L’enregistrement du service hors connexion a échoué. Vos compositions restent enregistrées dans ce navigateur. ${PORTABLE}`); A.error(cause.message); });
})();
