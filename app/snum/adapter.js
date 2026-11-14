/* Adaptation métier séparée ; le résultat est une composition du contrat générique.
   Format de la revue de presse (#222) : en-tête, titre, introduction fixe, puis les rubriques non vides
   dans l’ordre du courriel, numérotées, et sous chacune un article court par entrée (titre lié,
   « source, JJ/MM/AAAA », ligne à retenir) ; signature, pied Marianne portant la mention de diffusion, puis
   gestion des abonnements sous le cadre, comme dans le courriel de l’équipe. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, S = window.SnumMail;
  const labels = Object.fromEntries(S.rubrics), order = S.rubrics.map(([id]) => id);
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  // Identité de la revue de presse du SNUM (#223), identique dans les seize envois relevés de l’équipe.
  const SERVICE = "Service du numérique (SNUM)";
  const INTRO = "Ci-dessous les principales informations à retenir de ces derniers jours.\n\nBonne lecture !";
  // Dans le pied Marianne, la mention reste dans le cadre et suit la colonne de texte ; le lien des données personnelles passe à la ligne.
  const MENTION = "Revue de presse · Diffusion deux fois par semaine\nDocument à usage interne\n";
  const SIGNATURE = ["Équipe Communication / Événementiel du SNUM", "Secteur relations bénéficiaires, gouvernance interne, communication",
    "Bureau aide à la gouvernance et fonctions support (BGS)", "Service du numérique (SNUM) du SG"];
  const FOOTER_PROMPT = "Vous souhaitez gérer votre abonnement ? Vous avez des questions ?";
  const mailto = (address, subject) => `mailto:${address}?subject=${encodeURIComponent(subject)}`;
  const FOOTER_LINKS = [
    {url: mailto("agents-snum-subscribe@listes.finances.gouv.fr", "Je souhaite m'abonner à la revue de presse du SNUM"), label: "→ S’abonner"},
    {url: mailto("agents-snum-unsubscribe@listes.finances.gouv.fr", "Je souhaite me désabonner de la revue de presse du SNUM"), label: "→ Se désabonner"},
    {url: mailto("gouvernance.sg-snum@finances.gouv.fr", "Des questions sur la revue de presse du SNUM ?"), label: "→ Nous contacter"}
  ];
  const parts = iso => iso.split("-").map(Number);
  const dateLabel = iso => { const [year, month, day] = parts(iso); return `${day} ${months[month - 1]} ${year}`; };
  const shortDate = iso => iso.split("-").reverse().join("/");
  const weekday = iso => { const [year, month, day] = parts(iso); return days[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]; };
  const block = (component, values = {}) => { const result = M.createBlock(component); Object.assign(result.values, values); return result; };
  const textBlock = (component, ...texts) => M.setTexts(M.createBlock(component), texts);
  const article = item => block(31, {f0: "", f1: "", f2: "", f3: item.url, f4: item.title, f5: `${item.source}, ${shortDate(item.publication_date_iso)}`, f6: item.takeaway});
  function convert(input) {
    const packet = S.parse(input), date = dateLabel(packet.edition_date);
    const doc = M.create(`Revue de presse du SNUM - ${weekday(packet.edition_date)} ${date}`, [2, 5]);
    M.setTexts(doc.blocks[0], [SERVICE]); M.setTexts(doc.blocks[1], ["Revue de presse"]);
    doc.blocks.push(textBlock(19, `L’essentiel de l’actualité · ${date}\n\n${INTRO}`));
    const groups = order.map(rubric => [rubric, packet.articles.filter(item => item.rubric === rubric)]).filter(([, items]) => items.length);
    groups.forEach(([rubric, items], index) => {
      doc.blocks.push(textBlock(17, `${String(index + 1).padStart(2, "0")}. ${labels[rubric]}`), ...items.map(article));
    });
    const [first, ...extra] = FOOTER_LINKS;
    // Le cadre bordé se ferme sur le pied Marianne ; la gestion des abonnements, prévue hors cadre, vient dessous.
    doc.blocks.push(textBlock(39, ...SIGNATURE), textBlock(47, MENTION, "Informations sur les données personnelles", SERVICE),
      {...block(50, {f0: FOOTER_PROMPT, f1: first.url, f2: first.label}), additionalLinks: extra.map(link => ({...link}))});
    const count = (n, one, many) => `${n} ${n === 1 ? one : many}`, remarks = packet.watch.length;
    return {document: M.document(doc), notice: `${count(packet.articles.length, "article", "articles")} · ${count(groups.length, "rubrique", "rubriques")}. ${count(remarks, "remarque de collecte reste", "remarques de collecte restent")} dans le paquet source, hors du courriel.`};
  }
  A.SnumAdapter = Object.freeze({convert});
})();
