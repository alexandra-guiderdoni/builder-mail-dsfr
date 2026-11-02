/* Exemples embarqués (#202) : newsletters remplies au contenu fictif, versionnées avec l’atelier et hors de la bibliothèque.
   Chaque exemple est construit à la demande depuis le catalogue courant : composant et valeurs par bloc, les autres champs
   gardent la valeur du catalogue (identité « Votre service », logos). Les liens visent des domaines de démonstration. */
(() => {
  "use strict";
  const A = window.MailBuilder, M = A.Model;
  const LIST = Object.freeze([
    {key: "information", label: "Information de service", description: "Annonce courte d’un changement pour les usagers : une fermeture exceptionnelle de l’accueil.", subject: "Fermeture exceptionnelle de l’accueil le vendredi 14 novembre", blocks: [
      {component: "mail-02"},
      {component: "mail-05", values: {"f0": "Fermeture exceptionnelle de l’accueil le vendredi 14 novembre"}},
      {component: "mail-08", values: {"f0": "En raison de travaux de mise en accessibilité, l’accueil du public sera fermé toute la journée du vendredi 14 novembre. Vos démarches en ligne restent disponibles.", "f1": "Camille Martin", "f2": "Responsable de l’accueil des usagers"}},
      {component: "mail-19", values: {"f0": "Pendant cette fermeture, vous pouvez déposer vos demandes depuis votre espace en ligne, nous écrire par la messagerie sécurisée ou prendre rendez-vous pour la semaine suivante.\n\nL’accueil rouvrira le lundi 17 novembre à 9 heures, aux horaires habituels. Merci de votre compréhension."}},
      {component: "mail-40", values: {"f0": "https://demarches.exemple.invalid/rendez-vous", "f1": "Prendre rendez-vous"}},
      {component: "mail-47", values: {"f0": "Vous recevez ce message car vous êtes inscrit à la liste d’information des usagers de Votre service."}},
      {component: "mail-49", values: {"f0": "Si vous ne souhaitez plus recevoir ces messages,", "f1": "https://lettre.exemple.invalid/desabonnement", "f2": "désabonnez-vous de la liste."}}
    ]},
    {key: "lettre", label: "Lettre d’information", description: "Lettre périodique aux partenaires : deux articles et un chiffre mis en avant.", subject: "La lettre des partenaires · novembre 2026", blocks: [
      {component: "mail-02"},
      {component: "mail-05", values: {"f0": "La lettre des partenaires · novembre 2026"}},
      {component: "mail-10", values: {"f0": "À la une", "f1": "Les nouveautés du mois pour les structures partenaires."}},
      {component: "mail-31", values: {"f0": "", "f1": "", "f2": "Appel à projets", "f3": "https://partenaires.exemple.invalid/appel-a-projets-2027", "f4": "L’appel à projets 2027 est ouvert jusqu’au 15 janvier", "f5": "Mission partenariats", "f6": "3 novembre 2026 · 3 min de lecture"}},
      {component: "mail-31", values: {"f0": "", "f1": "", "f2": "Webinaire", "f3": "https://partenaires.exemple.invalid/webinaire-subventions", "f4": "Remplir son dossier de subvention : un webinaire le 20 novembre", "f5": "Pôle accompagnement", "f6": "28 octobre 2026 · 2 min de lecture"}},
      {component: "mail-35", values: {"f0": "Le chiffre du mois", "f1": "412 structures ont déposé un dossier cette année, soit un quart de plus que l’an dernier."}},
      {component: "mail-47", values: {"f0": "Vous recevez ce message car vous êtes abonné à la lettre des partenaires de Votre service."}},
      {component: "mail-49", values: {"f0": "Si vous ne souhaitez plus recevoir cette lettre,", "f1": "https://lettre.exemple.invalid/desabonnement", "f2": "désabonnez-vous de la liste."}}
    ]},
    {key: "invitation", label: "Invitation", description: "Invitation à un événement avec inscription en ligne et contact du service.", subject: "Invitation : rencontre régionale des partenaires, le 4 décembre", blocks: [
      {component: "mail-02"},
      {component: "mail-05", values: {"f0": "Rencontre régionale des partenaires, le jeudi 4 décembre 2026"}},
      {component: "mail-19", values: {"f0": "Nous avons le plaisir de vous inviter à la rencontre régionale des partenaires, le jeudi 4 décembre 2026, de 9 h 30 à 16 h 30, à la Maison des associations.\n\nAu programme : le bilan de l’année, des ateliers sur les nouveaux dispositifs et un temps d’échange. La participation est gratuite ; l’inscription est obligatoire avant le 20 novembre."}},
      {component: "mail-40", values: {"f0": "https://evenements.exemple.invalid/rencontre-2026", "f1": "S’inscrire à la rencontre"}},
      {component: "mail-39", values: {"f0": "Une question ?", "f2": "Mission partenariats", "f3": "partenariats@exemple.invalid · 01 00 00 00 00"}},
      {component: "mail-47", values: {"f0": "Vous recevez ce message car vous êtes inscrit à la liste des partenaires de Votre service."}},
      {component: "mail-49", values: {"f0": "Si vous ne souhaitez plus recevoir ces invitations,", "f1": "https://lettre.exemple.invalid/desabonnement", "f2": "désabonnez-vous de la liste."}}
    ]},
    {key: "revue", label: "Revue de presse", description: "Sélection d’articles par rubrique, sans image, pour une diffusion interne.", subject: "Revue de presse · semaine du 3 novembre 2026", blocks: [
      {component: "mail-02"},
      {component: "mail-05", values: {"f0": "Revue de presse"}},
      {component: "mail-19", values: {"f0": "L’essentiel de l’actualité · semaine du 3 novembre 2026\n\nUne sélection d’articles sur les politiques publiques de l’emploi et de la formation. Les opinions exprimées n’engagent que leurs auteurs."}},
      {component: "mail-17", values: {"f0": "01 · Emploi et territoires"}},
      {component: "mail-31", values: {"f0": "", "f1": "", "f2": "", "f3": "https://journal.exemple.invalid/emploi-zones-rurales", "f4": "Dans les zones rurales, les points d’accueil de proximité misent sur l’accompagnement numérique", "f5": "Le Quotidien des régions · 3 novembre 2026", "f6": ""}},
      {component: "mail-31", values: {"f0": "", "f1": "", "f2": "", "f3": "https://hebdo.exemple.invalid/apprentissage-bilan", "f4": "Apprentissage : un bilan contrasté selon les secteurs", "f5": "L’Hebdo de l’économie · 4 novembre 2026", "f6": ""}},
      {component: "mail-17", values: {"f0": "02 · Formation professionnelle"}},
      {component: "mail-31", values: {"f0": "", "f1": "", "f2": "", "f3": "https://revue.exemple.invalid/formation-continue", "f4": "Formation continue : les salariés de plus de 50 ans encore peu concernés", "f5": "La Revue sociale · 5 novembre 2026", "f6": ""}},
      {component: "mail-19", values: {"f0": "Revue de presse hebdomadaire · diffusion interne\nLes articles cités restent la propriété de leurs éditeurs."}},
      {component: "mail-50", values: {"f0": "Vous souhaitez gérer votre abonnement ? Vous avez une question sur cette revue ?", "f1": "mailto:revue-de-presse@exemple.invalid?subject=Abonnement", "f2": "→ Écrire à l’équipe"}}
    ]}
  ].map(example => Object.freeze(example)));
  const get = key => { const example = LIST.find(e => e.key === key); if (!example) throw new Error("Cet exemple n’est plus disponible."); return example; };
  // Copie indépendante : nouveaux identifiants à chaque construction, validée par le moteur.
  function build(key, name) {
    const example = get(key), doc = M.create(name ?? example.label, example.blocks.map(b => b.component));
    doc.subject = example.subject;
    example.blocks.forEach((b, i) => Object.assign(doc.blocks[i].values, b.values || {}));
    return M.document(doc);
  }
  // Valeurs propres aux exemples, par composant et par champ : le contrôle avant copie signale celles restées telles quelles.
  const values = new Map();
  for (const example of LIST) for (const b of example.blocks) for (const [key, value] of Object.entries(b.values || {})) {
    if (!value.trim() || value === M.component(b.component).fields.find(f => f.key === key)?.default) continue;
    values.set(`${b.component} ${key}`, (values.get(`${b.component} ${key}`) || new Set()).add(value));
  }
  const isExampleValue = (component, key, value) => !!values.get(`${component} ${key}`)?.has(value);
  A.Examples = Object.freeze({list: LIST, get, build, isExampleValue});
})();
