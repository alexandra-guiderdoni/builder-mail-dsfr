/* Adaptation métier séparée ; le résultat est une composition du contrat générique.
   Structure du modèle éditorial validé (#46) : en-tête, titre, introduction, puis par rubrique une partie
   et un article sans image par entrée, mention et signature, gestion des abonnements, pied Marianne. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model;
  const labels = {numerique: "Numérique", ia: "Intelligence artificielle (IA)", commande: "Commande publique", rh: "Ressources humaines", bercy: "Bercy"};
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  // Identité fictive du dépôt public : l’équipe applique son identité locale (en-tête, pieds) et corrige la signature avant envoi.
  const SERVICE = "Service";
  const CLOSING = `Sélection d’articles préparée à partir de la Collecte.\n\nL’équipe de veille du ${SERVICE}`;
  const FOOTER_PROMPT = "Pour gérer votre réception ou nous écrire :";
  const FOOTER_LINKS = [
    {url: "mailto:abonnement@exemple.invalid?subject=Inscription", label: "→ Recevoir la revue"},
    {url: "mailto:desabonnement@exemple.invalid?subject=Desinscription", label: "→ Ne plus la recevoir"},
    {url: "mailto:veille@exemple.invalid?subject=Question", label: "→ Écrire à l’équipe"}
  ];
  const dateLabel = iso => { const [year, month, day] = iso.split("-").map(Number); return `${day} ${months[month - 1]} ${year}`; };
  const block = (component, values = {}) => { const result = M.createBlock(component); Object.assign(result.values, values); return result; };
  const textBlock = (component, ...texts) => M.setTexts(M.createBlock(component), texts);
  function intro(packet) {
    const count = packet.articles.length, essentials = packet.articles.filter(article => article.essential).length;
    const summary = `Veille du ${dateLabel(packet.window_start)} au ${dateLabel(packet.window_end)} · ${count} ${count === 1 ? "article sélectionné" : "articles sélectionnés"}, dont ${essentials} ${essentials === 1 ? "essentiel" : "essentiels"}.`;
    return `Édition du ${packet.edition_date_long}\n\n${summary}`;
  }
  function article(item) {
    return block(31, {
      f0: "", f1: "", f2: "", f3: item.url, f4: item.title,
      f5: [item.essential ? "Essentiel" : "", item.source, item.publication_date_long].filter(Boolean).join(" · "),
      f6: `${item.fact}\nÀ retenir : ${item.takeaway}\nPour le SNUM : ${item.snum_interest}\nMots-clés : ${item.keywords.join(" · ")}`
    });
  }
  function convert(input) {
    const packet = window.SnumMail.parse(input), doc = M.create(`Revue de presse — ${packet.edition_date_long}`, [2, 5]);
    M.setTexts(doc.blocks[0], [SERVICE]); M.setTexts(doc.blocks[1], [doc.subject]);
    doc.blocks.push(textBlock(19, intro(packet)));
    const groups = new Map();
    for (const item of packet.articles) {
      if (!groups.has(item.rubric)) groups.set(item.rubric, []);
      groups.get(item.rubric).push(item);
    }
    [...groups].forEach(([rubric, items], index) => {
      doc.blocks.push(textBlock(17, `${String(index + 1).padStart(2, "0")}. ${labels[rubric]}`), ...items.map(article));
    });
    const [first, ...extra] = FOOTER_LINKS;
    doc.blocks.push(textBlock(19, CLOSING), {...block(50, {f0: FOOTER_PROMPT, f1: first.url, f2: first.label}), additionalLinks: extra.map(link => ({...link}))});
    doc.blocks.push(textBlock(47, `Revue de presse du ${SERVICE}.`, "Informations sur les données personnelles", SERVICE));
    return {document: M.document(doc), notice: `${packet.articles.length} articles · ${groups.size} rubriques. ${packet.watch.length} remarques de collecte restent dans le paquet source, hors du courriel.`};
  }
  A.SnumAdapter = Object.freeze({convert});
})();
