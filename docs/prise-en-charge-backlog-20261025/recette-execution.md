# Recette de la version candidate

Base : `395c08d1dfa4d0b8e41416da798bf0313a8bd379`, branche `fix/backlog-qualification-20261025`, delta local non commité. Les identités détaillées de l’audit et de son supplément restent dans audit-final/. Les journaux intermédiaires rouges sont conservés, sans être remplacés par les derniers résultats.

## Vérifications effectuées

- Génération/provenance : `npm run check` réussit avec PROVENANCE_OK, APPLICATION_DISTRIBUTIONS_OK et DISTRIBUTIONS_OK.
- Dépendances réinstallées par `npm ci --ignore-scripts` ; fast-uri 3.1.9 réellement présent et audit npm à zéro vulnérabilité.
- Lots ciblés : portabilité, saisie/IME synthétique, récupération, import/export, rendu, reprise multi-onglets ; preuves et limites par issue dans registre-preuves.md.
- Dernier delta intégré : récupération/13 intitulés/frappe, cinq tests sur chacun des trois moteurs sur Mac et Linux ; aperçu huit tests par moteur et contrôle CPU×6 sans préchargement initial.
- Copie de catalogue : 590 cas Chromium et 590 WebKit, plus réécriture de largeur testée séparément sur les trois moteurs.
- Audit natif ShipGuard 2.18 : cinq zones isolées et artefacts retenus. Supplément sur le dernier delta : 74 empreintes conformes et dix invariants indépendants rejoués par la racine.

## Campagnes intégrées

Les résultats finaux sont consignés dans RAPPORT.md : 397/397 sur Mac et 397/397 sur Linux, aucun échec, annulation ou skip ; sources figées à l’overlay c43f9e5f67bcee948de67b57d9a51d4b20454bd1ed5a5bdd291de3ecc57b2ec5. Les journaux/reçus courants sont dans coordination/gates/macos-final-* et parcours/linux/final-oracle-integrated/. Une campagne Linux antérieure a été arrêtée sans footer après deux immobilisations dans une attente non bornée ; elle ne constitue pas un succès. La préparation a ensuite été remplacée explicitement par un oracle géométrique borné, contre-éprouvé sur cinq états invalides et validé indépendamment. La nouvelle campagne complète finale est verte, sans intervention, sur les mêmes sources que la finale Mac. Linux s’exécute dans un conteneur Ubuntu 24.04.5 arm64 Playwright 1.64.1 ; ce n’est pas une exécution du runner GitHub Actions x86.

Les campagnes antérieures ont refusé la candidate (390/391) : une attente de réparation des 13 liens et une navigation initiale d’aperçu perdue ont ainsi été révélées puis corrigées. Le runner Firefox/WebKit antérieur contenait aussi deux échecs de l’ancienne fixture window.name, désormais remplacée et retestée sur les trois moteurs. Ces résultats historiques ne sont pas présentés comme une matrice finale verte.

Les nombres agrégés du runner désignent les contextes de lancement de fichiers : certains sous-scénarios imposent leur moteur. Les compteurs ne sont donc pas des totaux purs Firefox/WebKit. Aucun registre d’échec n’a été élargi pour reclasser un échec produit en limitation.

## Limites maintenues

Windows/Outlook/Mélissa, IME natif, lecteur d’écran, quota physique hors Chromium, installation PWA sur le parc et collage/réception réelle restent distincts des tests automatisés. Les interceptions de presse-papiers sont identifiées. Aucune conclusion universelle sur Safari ou la messagerie. Le kit opérateur conserve ses reçus NOT_EXECUTED.

Les causes historiques de #130, #142 et #145 ne sont pas inventées après une non-reproduction bornée. #149 dispose d’un patch et de sondes CLI, sans installation globale. L’audit conserve trois P2 et un P3 préexistants. Aucun GO production, commit, push, déploiement, courrier ni clôture dans cette recette.
