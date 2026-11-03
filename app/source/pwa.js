(() => {
  "use strict";
  const A = window.MailBuilder, environment = document.getElementById("environment"), install = document.getElementById("install"), update = document.getElementById("update");
  if (location.protocol === "file:" || !document.querySelector('link[rel="manifest"]')) { environment.textContent = "Atelier portable · fonctionne sans connexion"; return; }
  // #210 : sur le site, le portable reste téléchargeable ; l’aide à l’installation se retire quand le navigateur propose
  // le bouton ou que l’atelier est installé. Le détail technique de l’état va dans l’aide repliable.
  const help = document.getElementById("install-help"), explain = document.getElementById("install-explain"), detail = document.getElementById("environment-detail");
  let installPrompt, registration, installed = !!window.matchMedia?.("(display-mode: standalone)").matches;
  // L’accueil guidé (#205) retire son étape « Installer » quand l’atelier est installé.
  const explainInstall = () => { explain.hidden = installed || !install.hidden; A.Library?.welcome?.(); };
  help.hidden = false; explainInstall();
  window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); installPrompt = event; install.hidden = false; explainInstall(); });
  install.addEventListener("click", async () => {
    if (!installPrompt) return;
    const prompt = installPrompt; installPrompt = null; install.hidden = true; explainInstall();
    // Jeton relevé au départ de l’action : l’annonce du résultat se tait si une autre annonce est passée pendant l’attente (#122).
    // Optional chaining : le contrat isolé de pwa.js (tests/pwa-contract.test.cjs) injecte un MailBuilder sans State.
    const ticket = A.State?.noticeTicket?.();
    try { await prompt.prompt(); const result = await prompt.userChoice; A.notice(result.outcome === "accepted" ? "Installation acceptée." : "Installation annulée. Le navigateur proposera une nouvelle tentative lorsqu’elle sera disponible.", ticket); } catch (cause) { A.error(`Installation indisponible : ${cause.message}`); }
  });
  window.addEventListener("appinstalled", () => { installed = true; install.hidden = true; explainInstall(); environment.textContent = "Atelier installé dans ce navigateur"; });
  if (!("serviceWorker" in navigator)) { environment.textContent = "Ce navigateur ne permet pas le hors connexion · utilisez l’atelier portable"; detail.textContent = "État technique : service de travail hors connexion (service worker) non pris en charge."; return; }
  let reloading = false, controlled = !!navigator.serviceWorker.controller;
  // Jeton optionnel : l’annonce différée se tait si une autre est passée pendant save/flush (#122).
  const reloadNeeded = since => { update.hidden = true; A.notice("Une nouvelle version est active dans un autre onglet. Rechargez cette page pour l’utiliser ; le rechargement reste soumis aux protections de sauvegarde.", since); };
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (reloading) location.reload(); else if (controlled) { A.State.outdated(); reloadNeeded(); } controlled = true; });
  update.addEventListener("click", async () => {
    const ticket = A.State?.noticeTicket?.();
    try { await A.State.save(); await A.State.flush(); if (registration.waiting) { reloading = true; registration.waiting.postMessage({type: "ACTIVATE_UPDATE"}); } else reloadNeeded(ticket); } catch (cause) { A.error(cause.message); }
  });
  const helpBox = document.getElementById("offline-help"), helpExport = document.getElementById("offline-export");
  const PORTABLE = "Pour travailler sans connexion, téléchargez l’atelier portable (lien ci-dessous) : ses newsletters sont séparées de celles de cette page. Exportez vos newsletters ici, puis importez-les dans le fichier portable.";
  // Ressources que sw.js précache ; un test de contrat vérifie que les deux listes restent identiques.
  const PRECACHED = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png"];
  let failureShown = false;
  // Même export que « Exporter Mes newsletters » : la garde des champs invalides s'applique.
  helpExport.addEventListener("click", () => { try { A.Actions["export-library"](); } catch (cause) { A.error(cause.message); } });
  const show = (status, message, technical) => { environment.textContent = status; helpBox.textContent = message; helpBox.hidden = !message; helpExport.hidden = !message; detail.textContent = technical ? `État technique : ${technical}` : ""; };
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
    if (proven) show("Version web · disponible hors connexion", "", "toutes les ressources de l’atelier sont dans le cache de ce navigateur.");
    else show("Version web · hors connexion pas garanti", `Le navigateur n’a pas gardé une copie complète de l’atelier : sans réseau, il pourrait ne pas s’ouvrir. Gardez la connexion. ${PORTABLE}`, "cache de l’atelier incomplet ou illisible.");
  };
  const failed = async firstInstall => {
    failureShown = true;
    if (firstInstall) { show("Version web · ne s’ouvrira pas sans connexion", `Le hors connexion n’a pas pu être préparé : une ressource de l’atelier n’a pas été mise en cache, donc cette page ne s’ouvrira pas sans connexion. Vos newsletters restent enregistrées dans ce navigateur. ${PORTABLE}`, "échec de la mise en cache à la première installation."); return; }
    const proven = await cacheComplete();
    if (proven) show("Mise à jour reportée · version actuelle disponible hors connexion", "La mise à jour n’a pas pu être préparée : une ressource nouvelle n’a pas été mise en cache. La version précédente reste en place et ses ressources sont disponibles hors connexion. Vos newsletters sont conservées. Rechargez la page plus tard pour réessayer.", "échec de la mise en cache de la nouvelle version ; cache précédent complet.");
    else show("Mise à jour reportée · hors connexion pas garanti", `La mise à jour n’a pas pu être préparée et les ressources de la version précédente n’ont pas pu être vérifiées : ne comptez pas sur le hors connexion. Vos newsletters restent enregistrées dans ce navigateur. ${PORTABLE}`, "échec de la mise en cache de la nouvelle version ; cache précédent incomplet ou illisible.");
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
    if (registration.active) announceActive(); else show("Préparation de l’accès hors connexion…", "", "");
    // Sans version active, « ready » ne se résout jamais après un échec d'installation : il ne bloque donc plus l'affichage.
    navigator.serviceWorker.ready.then(announceActive);
    watch(registration.installing);
  }).catch(cause => { failureShown = true; show("Version web · ne s’ouvrira pas sans connexion", `L’enregistrement du service hors connexion a échoué. Vos newsletters restent enregistrées dans ce navigateur. ${PORTABLE}`, "enregistrement du service worker refusé."); A.error(cause.message); });
})();
