/* Recherche du catalogue : insensible aux accents, à la casse, aux tirets et aux apostrophes. */
(() => {
  "use strict";
  const A = window.MailBuilder;
  // Mots des agents, par composant. Proposition à valider : seuls les composants qui existent y figurent.
  const SYNONYMS = Object.freeze({
    "mail-00": "préheader preheader texte caché résumé aperçu messagerie",
    "mail-01": "version web navigateur afficher problème d’affichage",
    "mail-02": "logo bandeau république française header entête",
    "mail-03": "logo bandeau partenaire header entête cobranding",
    "mail-04": "bandeau visuel photo image illustration campagne",
    "mail-05": "titre h1 intitulé nom de la lettre",
    "mail-06": "titre visuel photo image illustration",
    "mail-07": "préheader preheader extrait résumé aperçu messagerie",
    "mail-08": "introduction intro édito éditorial signature auteur signé",
    "mail-09": "introduction intro présentation service",
    "mail-10": "rubrique chapitre intertitre titre",
    "mail-11": "rubrique chapitre intertitre titre",
    "mail-12": "rubrique chapitre intertitre titre",
    "mail-13": "rubrique chapitre intertitre titre",
    "mail-14": "sous-partie intertitre sous-titre titre",
    "mail-15": "sous-partie intertitre sous-titre titre",
    "mail-16": "sous-partie intertitre sous-titre titre",
    "mail-17": "sous-partie intertitre sous-titre titre",
    "mail-18": "texte corps contenu bloc de texte",
    "mail-19": "texte corps contenu bloc de texte",
    "mail-20": "puces énumération points liste à puces",
    "mail-21": "puces énumération points liste à puces",
    "mail-22": "puces énumération points liste à puces",
    "mail-23": "puces énumération points liste à puces",
    "mail-24": "texte intertitre présentation encadré",
    "mail-25": "texte intertitre présentation encadré",
    "mail-26": "photo illustration visuel crédit légende paysage format",
    "mail-27": "photo illustration visuel crédit légende paysage format",
    "mail-28": "photo illustration visuel crédit légende format",
    "mail-29": "photo illustration visuel crédit légende format",
    "mail-30": "actualité brève billet news carte vignette photo",
    "mail-31": "actualité brève billet news carte vignette photo lire la suite",
    "mail-32": "participer contribuer appel à projets appel à candidatures témoignage",
    "mail-33": "participer contribuer appel à projets appel à candidatures témoignage bouton",
    "mail-34": "statistiques indicateurs données nombres bilan chiffre",
    "mail-35": "encadré à retenir information importante focus zoom",
    "mail-36": "encadré à retenir information importante focus zoom",
    "mail-37": "photo image illustration section illustrée sous-section",
    "mail-38": "photo image illustration section illustrée",
    "mail-39": "coordonnées adresse téléphone courriel mail boîte fonctionnelle signature",
    "mail-40": "lien appel à l’action call to action cta action",
    "mail-41": "lien appel à l’action call to action cta action",
    "mail-42": "lien appel à l’action call to action cta action",
    "mail-43": "liens appel à l’action call to action cta lien texte",
    "mail-44": "statistique indicateur nombre donnée séparateur",
    "mail-45": "invitation rejoindre partenariat adhérer",
    "mail-46": "cartes colonnes deux colonnes information vignettes",
    "mail-47": "footer mentions légales signature bas de page",
    "mail-48": "footer mentions légales signature bas de page logo",
    "mail-49": "se désabonner unsubscribe désinscription résilier stop",
    "mail-50": "préférences abonnement inscription newsletter gérer",
    "mail-51": "fin conclusion remerciements formule de politesse signature texte de fin",
  });
  const fold = text => String(text).toLocaleLowerCase("fr").normalize("NFD").replace(/\p{M}/gu, "")
    .replaceAll("œ", "oe").replaceAll("æ", "ae").replace(/[-‐‑–'’]/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  // Un pluriel saisi (« photos ») retrouve le singulier du catalogue.
  const tokens = query => fold(query).split(" ").filter(Boolean).map(t => t.length > 3 ? t.replace(/[sx]$/u, "") : t);
  function filter(components, query) {
    const words = tokens(query);
    return components.filter(c => {
      const haystack = fold(`${c.family} ${c.label} ${SYNONYMS[c.id] || ""}`);
      return words.every(word => haystack.includes(word));
    });
  }
  A.CatalogueSearch = Object.freeze({fold, filter, synonyms: SYNONYMS});
})();
