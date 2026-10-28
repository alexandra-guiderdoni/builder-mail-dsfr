/* Contrôle avant copie ou téléchargement du courriel (#36) : liste fermée d’avertissements, confirmés une fois par sortie.
   Les blocages restent ceux du moteur (composition vide, refus de sécurité) ; aucun contrôle ne fait appel au réseau. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, get = id => document.getElementById(id);
  const RULES = Object.freeze(["demo-domain", "demo-text", "weight", "label-domain", "bidi", "mixed-script"]);
  // Décodage Punycode (RFC 3492) des étiquettes « xn-- », pour lire l’alphabet réel d’un domaine sans dépendance.
  function punycode(input) {
    const base = 36, tMin = 1, tMax = 26, digit = c => c >= 48 && c <= 57 ? c - 22 : c >= 65 && c <= 90 ? c - 65 : c >= 97 && c <= 122 ? c - 97 : base;
    const adapt = (delta, points, first) => {
      delta = first ? Math.floor(delta / 700) : delta >> 1; delta += Math.floor(delta / points);
      let k = 0; while (delta > ((base - tMin) * tMax) >> 1) { delta = Math.floor(delta / (base - tMin)); k += base; }
      return k + Math.floor((base - tMin + 1) * delta / (delta + 38));
    };
    const delimiter = input.lastIndexOf("-"), output = delimiter > 0 ? [...input.slice(0, delimiter)].map(c => c.codePointAt(0)) : [];
    let n = 128, i = 0, bias = 72, index = delimiter > 0 ? delimiter + 1 : 0;
    while (index < input.length) {
      const old = i;
      for (let w = 1, k = base; ; k += base) {
        const d = index < input.length ? digit(input.charCodeAt(index++)) : base;
        if (d >= base) throw new Error("Étiquette Punycode invalide.");
        i += d * w;
        const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
        if (d < t) break;
        w *= base - t;
      }
      bias = adapt(i - old, output.length + 1, old === 0);
      n += Math.floor(i / (output.length + 1)); i %= output.length + 1;
      output.splice(i++, 0, n);
    }
    return String.fromCodePoint(...output);
  }
  const decodeHost = host => host.split(".").map(label => { try { return /^xn--/i.test(label) ? punycode(label.slice(4).toLowerCase()) : label; } catch { return label; } }).join(".");
  // Hôte réel d’un lien HTTPS, ou domaine de l’adresse d’un lien mailto.
  function hostOf(url) {
    if (/^mailto:/i.test(url)) return (/@([^?]*)/.exec(url)?.[1] || "").toLowerCase();
    try { return new URL(url).hostname.toLowerCase(); } catch { return ""; }
  }
  // (1) Domaines réservés à la démonstration : .invalid, .example, .test et tout domaine « example.* ».
  const demoHost = host => { const labels = host.replace(/\.$/, "").split("."); return ["invalid", "example", "test"].includes(labels.at(-1)) || labels.slice(0, -1).includes("example"); };
  // (5) Contrôles bidirectionnels, bruts ou encodés en UTF-8 dans l’URL.
  const BIDI = /[؜‎‏‪-‮⁦-⁩]|%(?:D8%9C|E2%80%8[EF]|E2%80%A[A-E]|E2%81%A[6-9])/i;
  // (6) Un seul alphabet par domaine ; les écritures japonaise, coréenne et chinoise combinent légitimement plusieurs systèmes.
  const SCRIPTS = ["Latin", "Greek", "Cyrillic", "Armenian", "Georgian", "Hebrew", "Arabic", "Syriac", "Thaana", "Devanagari", "Bengali", "Gurmukhi", "Gujarati", "Tamil", "Telugu", "Kannada", "Malayalam", "Sinhala", "Thai", "Lao", "Tibetan", "Myanmar", "Khmer", "Ethiopic", "Cherokee", "Han", "Hiragana", "Katakana", "Hangul", "Bopomofo"].map(name => [name, new RegExp(`\\p{Script=${name}}`, "u")]);
  const COMBINED = [["Han", "Hiragana", "Katakana"], ["Han", "Hangul"], ["Han", "Bopomofo"]];
  function mixedScripts(host) {
    const scripts = new Set([...decodeHost(host)].filter(c => /\p{L}/u.test(c)).map(c => SCRIPTS.find(([, pattern]) => pattern.test(c))?.[0] || "autre"));
    return scripts.size > 1 && !COMBINED.some(set => [...scripts].every(script => set.includes(script)));
  }
  // (4) Domaines lisibles dans un intitulé ; une extension de document courante n’est pas un domaine affiché.
  const DOMAIN = /(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+\p{L}{2,63}(?![\p{L}\p{N}-])/gu;
  const DOCUMENTS = new Set(["pdf", "doc", "docx", "odt", "rtf", "xls", "xlsx", "ods", "csv", "ppt", "pptx", "odp", "txt", "html", "htm", "xml", "json", "jpg", "jpeg", "png", "gif", "svg", "webp"]);
  function shownHosts(label) {
    return [...label.matchAll(DOMAIN)].map(match => match[0]).filter(token => !DOCUMENTS.has(token.split(".").at(-1).toLowerCase()))
      .flatMap(token => { try { return [new URL("https://" + token).hostname]; } catch { return []; } });
  }
  const bare = host => host.replace(/^www\./, "");
  const sameSite = (real, shown) => bare(real) === bare(shown) || bare(real).endsWith("." + bare(shown));
  // Liens d’un bloc, avec les champs de l’éditeur à atteindre pour l’adresse et l’intitulé.
  function links(block) {
    const definition = M.component(block.component);
    return [
      ...definition.links.map(link => ({url: block.values[link.url], label: block.values[link.label], urlField: `field-${link.url}`, labelField: `field-${link.label}`})),
      ...(block.additionalLinks || []).map((link, i) => ({url: link.url, label: link.label, urlField: `field-footer-url-${i}`, labelField: `field-footer-label-${i}`})),
      ...(block.source ? [{url: block.source, label: block.sourceLabel?.trim() || "Consulter la source", urlField: "article-source", labelField: "article-source-label"}] : [])
    ];
  }
  function warnings(value, weight) {
    const found = [];
    value.blocks.forEach((block, index) => {
      const definition = M.component(block.component), name = `Bloc ${index + 1} « ${definition.label} »`;
      const add = (rule, field, detail) => { if (!found.some(w => w.rule === rule && w.block === block.id)) found.push({rule, block: block.id, field, message: `${name} : ${detail}`}); };
      const items = links(block);
      for (const link of items) { const host = hostOf(link.url); if (host && demoHost(host)) add("demo-domain", link.urlField, `lien de démonstration vers ${host}.`); }
      const unchanged = definition.fields.filter(f => {
        if (!f.default.trim() || block.values[f.key] !== f.default) return false;
        if (f.type === "text") return true;
        if (f.type === "url") return !demoHost(hostOf(f.default));
        return false;
      });
      if (unchanged.length) add("demo-text", `field-${unchanged[0].key}`, `valeur de démonstration du catalogue inchangée (${unchanged.map(f => f.label).join(", ")}).`);
      for (const link of items) {
        const real = hostOf(link.url), shown = real && shownHosts(link.label).find(host => !sameSite(real, host));
        if (shown) add("label-domain", link.labelField, `l’intitulé annonce ${decodeHost(shown)}, mais le lien mène à ${decodeHost(real)}.`);
      }
      for (const link of items) if (BIDI.test(link.url)) add("bidi", link.urlField, "caractère de contrôle bidirectionnel dans l’adresse du lien.");
      for (const link of items) { const host = hostOf(link.url); if (host && mixedScripts(host)) add("mixed-script", link.urlField, `le domaine ${decodeHost(host)} mélange plusieurs alphabets.`); }
    });
    if (weight && weight.level !== "ok" && value.blocks.length) {
      const target = weight.target, block = value.blocks.find(b => b.id === target?.block) || value.blocks[0];
      const first = M.component(block.component).fields.find(f => f.type === "text") || M.component(block.component).fields[0];
      const destination = target ? ` ${weight.dominant === "images" ? "Image incorporée la plus lourde" : "Champ texte le plus long"} : « ${target.label} », bloc ${value.blocks.indexOf(block) + 1} « ${M.component(block.component).label} ».` : "";
      found.push({rule: "weight", block: block.id, field: target?.field || (first ? `field-${first.key}` : ""), message: `${A.Files.weightText(weight, weight.action)}${destination}`});
    }
    return found.sort((a, b) => value.blocks.findIndex(x => x.id === a.block) - value.blocks.findIndex(x => x.id === b.block) || RULES.indexOf(a.rule) - RULES.indexOf(b.rule));
  }
  // Boîte de confirmation : une confirmation par copie ou téléchargement ; chaque avertissement mène à son bloc.
  let pending = null;
  // close est mis en file par le navigateur : attribuer chaque événement au cycle fermé,
  // même si une seconde boîte a déjà été ouverte puis fermée entre-temps.
  let cycle = null;
  const closing = [];
  function queueClosed() {
    if (!cycle || get("check-dialog").open) return;
    closing.push(cycle); cycle = null;
  }
  function restoreFocus(entry) {
    if (entry.focusRestored) return;
    entry.focusRestored = true;
    const {result, origin} = entry;
    try {
      if (result !== "go" && !result?.block) origin?.focus();
      if (result?.block) {
        A.selected = result.block; A.UI.blockList(); A.UI.fields();
        (get(result.field) || get("block-editor").querySelector("textarea,input"))?.focus();
      }
    } catch (cause) { entry.failure ||= cause; }
  }
  function finish(entry) {
    if (entry.finished) return;
    // Un événement ancien ne doit pas voler le focus d'une nouvelle confirmation.
    if (!cycle && !closing.length) restoreFocus(entry);
    entry.finished = true;
    if (entry.failure) entry.reject(entry.failure); else entry.resolve(entry.result === "go");
  }
  function releaseCycle(closed) {
    let lateFailure;
    for (const entry of closed.entries) {
      try { entry.release(); } catch (cause) {
        if (entry.finished) lateFailure ||= cause;
        else entry.failure ||= cause;
      }
      finish(entry);
    }
    // Une autorisation déjà rejetée ne peut être rejetée deux fois : exposer l'erreur secondaire.
    if (lateFailure) throw lateFailure;
  }
  function settle(result, failure) {
    if (!pending) return;
    const entry = pending; pending = null;
    entry.result = result; entry.failure ||= failure;
    const dialog = get("check-dialog");
    try { if (dialog.open) dialog.close(); } catch (cause) { entry.failure ||= cause; }
    if (dialog.open) { entry.failure ||= new Error("La boîte de confirmation n’a pas été fermée."); finish(entry); }
    else {
      // L'accès au bloc reste immédiat ; seul le retour des iframes attend close.
      restoreFocus(entry);
      if (cycle.opened) queueClosed();
      else { const unopened = cycle; cycle = null; releaseCycle(unopened); }
    }
  }
  function confirm(action, list) {
    if (!list.length || !get("check-dialog")) return Promise.resolve(true);
    const esc = A.Render.escape, copy = action === "copy";
    get("check-dialog-title").textContent = copy ? "Vérifier avant de copier" : "Vérifier avant de télécharger";
    get("check-dialog-description").textContent = `${list.length} point${list.length > 1 ? "s" : ""} à vérifier. Ces avertissements ne bloquent pas : corrigez le bloc concerné ou poursuivez.`;
    get("check-list").innerHTML = list.map((w, i) => `<li><p>${esc(w.message)}</p><button class="fr-btn fr-btn--tertiary" type="button" data-check-index="${i}">Aller au bloc ${A.doc().blocks.findIndex(b => b.id === w.block) + 1}</button></li>`).join("");
    get("check-confirm").textContent = copy ? "Copier quand même" : "Télécharger quand même";
    return new Promise((resolve, reject) => {
      const release = A.Preview.suspend();
      if (pending) settle(false);
      // Une fermeture native peut être en file sans avoir encore livré son événement.
      queueClosed();
      if (!cycle) cycle = {entries: [], opened: false};
      pending = {resolve, reject, release, list, origin: document.activeElement, result: false, finished: false};
      cycle.entries.push(pending);
      try {
        // Le focus part du titre : la liste peut dépasser l’écran, et les points se lisent avant les boutons.
        get("check-dialog").showModal(); cycle.opened = true;
        get("check-dialog").scrollTop = 0; get("check-dialog-title").focus();
      } catch (cause) { settle(false, cause); }
    });
  }
  if (typeof document !== "undefined" && document.getElementById("check-dialog")) {
    get("check-cancel").addEventListener("click", () => settle(false));
    get("check-dialog").addEventListener("close", () => {
      if (!closing.length && !get("check-dialog").open && cycle) {
        if (pending) { pending.result = false; pending = null; }
        queueClosed();
      }
      const closed = closing.shift();
      if (closed) releaseCycle(closed);
    });
    get("check-form").addEventListener("submit", event => { event.preventDefault(); settle("go"); });
    get("check-list").addEventListener("click", event => {
      const button = event.target.closest("[data-check-index]"), warning = button && pending?.list[Number(button.dataset.checkIndex)];
      if (warning) settle(warning);
    });
  }
  A.Checks = Object.freeze({rules: RULES, warnings, confirm, decodeHost});
})();
