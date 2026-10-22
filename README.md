# Atelier de courriels DSFR

Application locale pour composer des courriels à partir des **52 sections et variantes du modèle officiel épinglé**, conserver plusieurs compositions, réutiliser des modèles et des identités de service, puis récupérer le courriel dans sa messagerie.

**Version en qualification.** Édition, bibliothèque, copie et installation avec relance hors connexion ont été exercées sur Mac. Des messages envoyés depuis Gmail et Mélissa ont été reçus avec les images PNG/JPEG conservées. Le débordement horizontal découvert dans le message Mélissa possède une correction et des tests dédiés. Windows/Outlook, le lecteur d’écran retenu, l’installation sur le parc et l’autorisation de son accès au site restent à qualifier. Le [dossier de recette](docs/RECETTE-APPLICATION.md) distingue chaque preuve et ses limites.

## Ouvrir l’atelier

La [campagne RGAA en cours](docs/accessibilite/titre-page-20261023/RAPPORT.md) publie les matrices des 106 critères et 258 tests, les corrections vérifiées et les lacunes restantes. Les **102 tests applicatifs passent**. Un objet vide utilise désormais le nom de composition comme titre de l’export HTML, avec une aide associée au champ Objet. Les 13 intitulés des liens intégrés aux composants sont obligatoires avant copie ou téléchargement HTML ; les anciens JSON restent récupérables et leur aperçu indique les liens à compléter sans les activer. Le nom de composition et les 13 champs URL annoncent aussi leur contrainte. **La conformité RGAA à 100 % reste à démontrer**, avec qualification de chaque test applicable et essais humains manquants.

Le [protocole de contraste](docs/accessibilite/contrastes-20261022/RAPPORT.md) décrit 80 observations ciblées et cinq contrôles négatifs. Leur renouvellement sur cette version figure dans la campagne courante ; il ne qualifie pas globalement les critères de couleur.

**[Ouvrir l’atelier en ligne](https://alexandra-guiderdoni.github.io/builder-mail-dsfr/)**. La version courante et le rechargement hors connexion après préparation du cache ont été vérifiés le 23 octobre 2026 ; [reçu de publication et limites](docs/accessibilite/titre-page-20261023/publication.json).

Télécharger puis ouvrir [le fichier portable](app/distribution/portable.html) par double-clic. Il contient l’interface, les composants et les images de départ ; il fonctionne dès la première ouverture sans réseau. Aucun Python, Node.js, compte ou service d’IA n’est nécessaire sur le poste métier.

L’accueil « Mes newsletters » retrouve les compositions de ce navigateur. Ouvrir une édition, la renommer, la dupliquer, l’exporter ou la supprimer après confirmation. Dans l’éditeur, « Retour à Mes newsletters » ramène à cet accueil. Les fichiers et sauvegardes restent accessibles depuis les deux vues.

Personnaliser les blocs, charger ses images locales, puis attendre l’indication de sauvegarde. **Exporter régulièrement la bibliothèque** : les données du navigateur dépendent du profil et de son origine. Un fichier de travail exporté contient aussi les images. Changer de newsletter ne demande pas de vider le cache du programme.

Chaque bloc propose « Lien source facultatif du bloc » et **« Intitulé du lien source »** : remplacer « Consulter la source » par le texte souhaité. Cet intitulé est conservé dans la bibliothèque, les modèles, les fichiers et la copie du courriel. L’interface utilise localement Marianne, la grille, les champs et les boutons du DSFR 1.15.4 ; les espacements et le repli des colonnes ont été vérifiés de 320 à 1440 px.

Le [guide d’utilisation](docs/UTILISATION.md) explique modèles, identités, imports JSON, exports et récupération. Le [format JSON générique](docs/FORMAT-JSON.md) possède un [exemple importable](app/distribution/exemple.courriel.json) et un [schéma](app/distribution/courriels.schema.json). Les anciens fichiers de composition v1 restent acceptés.

La collecte SNUM a sa [page HTML autonome dédiée](app/distribution/snum.html) : elle convertit le paquet métier en composition JSON, à importer ensuite dans le builder. Elle organise les rubriques et les articles avec le même moteur de rendu. Le builder ne contient plus d’import spécifique SNUM.

La [variante web](app/distribution/web/index.html) partage le moteur du portable et est publiée sur GitHub Pages. Son cache a été exercé sur l’origine publique ; sa relance après installation a été observée en boucle locale sur le Mac. L’installation sur le parc reste à qualifier. Pour retrouver ses compositions sur l’origine web, importer un export JSON de sa bibliothèque portable.

Pour la recette métier, importer [la bibliothèque des neuf familles](app/distribution/qualification.courriels.json) : elle contient les 52 sections à examiner dans les messages reçus.

## Développer et vérifier

Python 3.10+ et Node.js 22+ servent à la génération et aux recettes, uniquement sur le poste de développement :

```sh
python3 scripts/build_app.py
npm run check
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --ignore-scripts
npm test
```

Les tests navigateur nécessitent le Chromium de la version Playwright épinglée. La [maintenance](docs/MAINTENANCE.md) décrit les sources, les prérequis, la recette Firefox, le stockage et la procédure de mise à jour.

## Sources et périmètre

- [Cadrage confirmé](docs/cadrage-source.md) et [spécification](SPECIFICATION.md) : intention et contraintes.
- [Suivi des critères](docs/SUIVI-APPLICATION.md) : réalisation et qualification restante.
- [Notice des références](reference/NOTICE.md) : origine, empreintes et adaptations.
- [Prototype conservé](prototype/distribution/portable.html) et [sa recette historique](docs/RECETTE.md) : première tranche, distincte de cette application.

Sources éditables : `app/source/`, `app/snum/`, `app/assets/`, `scripts/` et `reference/catalogue.json`. Les distributions sont générées ; les gabarits officiels sont conservés sous `reference/dsfr-mail/`. Aucun DSFR web n’est chargé dans le courriel.

Le dépôt officiel, son clone de référence et le projet SNUM restent en lecture seule. La publication autorisée concerne uniquement `main` dans le dépôt personnel du builder. Les essais de messagerie ont reçu leur autorisation distincte ; l’application n’accède à aucun compte et n’envoie aucun message. Aucun déploiement sur le parc n’est déduit de cette publication Git.

<!-- PDG-LARGE-FILE-JUSTIFICATION: les distributions HTML incorporent le moteur, le catalogue et les ressources pour le premier démarrage hors connexion ; le gabarit amont est conservé intégralement comme référence vérifiable. Les sources applicatives restent modulaires. -->

<!-- PDG-BINARY-ASSET-JUSTIFICATION: quatre images amont et les icônes locales rendent la génération et la distribution indépendantes du réseau. -->
