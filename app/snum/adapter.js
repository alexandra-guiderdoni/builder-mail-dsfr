/* Adaptation métier séparée ; le résultat est une composition du contrat générique.
   Format de la revue de presse (#222) : en-tête, titre, introduction fixe, puis les rubriques non vides
   dans l’ordre du courriel, numérotées, et sous chacune un article court par entrée (titre lié,
   « source, JJ/MM/AAAA », ligne à retenir) ; puis la signature en paragraphe, le pied Marianne qui referme le cadre
   avec la mention de diffusion et le lien de contact, et la gestion des abonnements sous le cadre. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model, S = window.SnumMail;
  const labels = Object.fromEntries(S.rubrics), order = S.rubrics.map(([id]) => id);
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  // Identité de la revue de presse du SNUM (#223) : textes et liens repris tels quels du courriel réel, identiques dans
  // les seize envois relevés. Les intitulés suivent le modèle validé : flèche et espaces insécables.
  const SERVICE = "Service du numérique (SNUM)";
  const INTRO = "Ci-dessous les principales informations à retenir de ces derniers jours.\n\nBonne lecture !";
  const SIGNATURE = "Équipe Communication / Événementiel du SNUM\nSecteur relations bénéficiaires, gouvernance interne, communication\n"
    + "Bureau aide à la gouvernance et fonctions support (BGS)\nService du numérique (SNUM) du SG";
  // Dans le pied Marianne, la mention reste dans le cadre, alignée sur le texte ; le lien de contact passe à la ligne.
  const MENTION = "Revue de presse · Diffusion deux fois par semaine\nDocument à usage interne\n";
  const FOOTER_PROMPT = "Vous souhaitez gérer votre abonnement\u00a0? Vous avez des questions\u00a0?";
  const FOOTER_LINKS = [
    {url: "mailto:agents-snum-subscribe@listes.finances.gouv.fr?subject=Je%20souhaite%20m'abonner%20à%20la%20revue%20de%20presse%20du%20SNUM", label: "→\u00a0S’abonner"},
    {url: "mailto:agents-snum-unsubscribe@listes.finances.gouv.fr?subject=Je%20souhaite%20me%20désabonner%20de%20la%20revue%20de%20presse%20du%20SNUM", label: "→\u00a0Se\u00a0désabonner"},
    {url: "mailto:gouvernance.sg-snum@finances.gouv.fr?subject=Des%20questions%20sur%20la%20revue%20de%20presse%20du%20SNUM%20?", label: "→\u00a0Nous\u00a0contacter"}
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
    // Le pied Marianne referme le cadre (trait et ombre) ; son lien obligatoire est le vrai lien de contact.
    // La gestion des abonnements, prévue hors cadre, vient dessous.
    const contact = FOOTER_LINKS.at(-1);
    doc.blocks.push(textBlock(19, SIGNATURE), block(47, {f0: MENTION, f1: contact.url, f2: contact.label, f7: SERVICE}),
      {...block(50, {f0: FOOTER_PROMPT, f1: first.url, f2: first.label}), additionalLinks: extra.map(link => ({...link}))});
    const count = (n, one, many) => `${n} ${n === 1 ? one : many}`, remarks = packet.watch.length;
    return {document: M.document(doc), notice: `${count(packet.articles.length, "article", "articles")} · ${count(groups.length, "rubrique", "rubriques")}. ${count(remarks, "remarque de collecte reste", "remarques de collecte restent")} dans le paquet source, hors du courriel.`};
  }
  A.SnumAdapter = Object.freeze({convert});
})();
