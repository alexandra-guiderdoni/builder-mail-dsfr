/* Adaptation métier séparée ; le résultat est une composition du contrat générique. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model;
  const labels = {numerique: "Numérique", ia: "Intelligence artificielle (IA)", commande: "Commande publique", rh: "Ressources humaines", bercy: "Bercy"};
  const textBlock = (component, ...texts) => M.setTexts(M.createBlock(component), texts);
  function convert(input) {
    const packet = window.SnumMail.parse(input), doc = M.create(`Revue de presse — ${packet.edition_date_long}`, [2, 5]);
    M.setTexts(doc.blocks[0], ["SNUM"]); M.setTexts(doc.blocks[1], [doc.subject]);
    doc.blocks.push(textBlock(19, `Veille du ${packet.window_start} au ${packet.window_end} · ${packet.articles.length} articles sélectionnés.`));
    const groups = new Map();
    for (const article of packet.articles) {
      if (!groups.has(article.rubric)) groups.set(article.rubric, []);
      groups.get(article.rubric).push(article);
    }
    for (const [rubric, articles] of groups) {
      doc.blocks.push(textBlock(12, labels[rubric]));
      for (const article of articles) {
        const lead = textBlock(15, article.title, `${article.source} · ${article.publication_date_long}${article.essential ? " · Essentiel" : ""}`);
        lead.source = article.url;
        doc.blocks.push(lead, textBlock(19, article.fact), textBlock(25, "À retenir", article.takeaway), textBlock(25, "Pour le SNUM", article.snum_interest), textBlock(19, `Mots-clés : ${article.keywords.join(" · ")}`));
      }
    }
    doc.blocks.push(textBlock(47, "Revue de presse du SNUM.", "Informations sur les données personnelles", "SNUM"));
    return {document: M.document(doc), notice: `${packet.articles.length} articles · ${groups.size} rubriques. ${packet.watch.length} remarques de collecte restent dans le paquet source, hors du courriel.`};
  }
  A.SnumAdapter = Object.freeze({convert});
})();
