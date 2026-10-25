# Publication du backlog qualifié — 25 octobre 2026

Ce dossier sélectionne les preuves utiles à la publication des correctifs de #13, #52 et #130 à #149. La demande ultérieure de commit et push sur main remplace la limite de publication des rapports de qualification antérieurs. Les brouillons préexistants et l’intégralité des journaux restent conservés dans une archive locale avec inventaire SHA256 ; aucun résultat historique n’est effacé.

## Candidate vérifiée

- Base : `395c08d1dfa4d0b8e41416da798bf0313a8bd379`.
- Candidate finale après nettoyage du serveur de test : `4c4caff747a77c987be2ec4cbb914c39d3ea5b07b206886f6ab5fc24955f914e`, 76 empreintes : [identité](publication/candidate-identity.json).
- Audit natif ShipGuard 2.18 avec cinq agents Astra et 168 fichiers, puis supplément indépendant sur le seul helper corrigé : [verdict de publication](../verification-publication-shipguard-20261025/RAPPORT.md).
- L’ancien audit c43 conserve son NO-GO et le constat de fuite. La source produit et les distributions restent identiques entre c43 et la candidate finale ; le seul delta supplémentaire concerne le nettoyage d’un helper de test.
- Preuve avant/après sur la fonction exacte avec un serveur HTTP réel et une frontière navigateur remplacée : [rouge](publication/red.json), [vert](publication/green.json), [diff](publication/cleanup-fix.diff), [sonde](publication/with-preview-cleanup-probe.cjs).
- Après correction : 13/13 sous Chromium, Firefox et WebKit, sans échec ni test sauté : [résultats](publication/targeted/results.json) et [commande](publication/targeted/execution-command.json).
- Les suites complètes antérieures sur c43 ont passé 397/397 sur macOS et Linux arm64. Elles ne sont pas présentées comme un rejeu complet de la nouvelle candidate ; la CI standard du commit final fournit ce rejeu sur Linux x86.

## Code et vérification

Les changements corrigent la course des navigations d’aperçu, le débordement WebKit du HTML copié, les attentes et oracles du harnais, et la dépendance de développement fast-uri. L’arbitrage #138 garantit la lecture seule à la première modification de l’ancien onglet, sans écrasement, avec mémoire et export conservés.

Les contrôles du dépôt restent `npm run check` et `npm test`. Le [workflow existant](../../.github/workflows/pages.yml) exécute les tests avant sa publication GitHub Pages. L’état du run attaché au commit fait foi ; un push ne constitue pas à lui seul une réussite de CI.

L’archive complète et les brouillons ne sont pas ajoutés en masse au dépôt. Les fichiers de preuve sélectionnés sont des captures datées : leurs anciennes mentions « local/non commité » décrivent l’état avant cette autorisation de publication. Les inventaires et la conservation hors checkout sont consignés dans le reçu d’archivage.

## État des issues et limites

Le [registre des 22 issues](registre-preuves.md) sépare correctif local, investigation et dépendance externe. La publication ne ferme pas automatiquement les tickets.

Les recettes réelles Outlook classique/nouveau et Mélissa restent à exécuter : [kit opérateur](coordination/recette-messageries/PROCEDURE.md), douze cas NOT_EXECUTED. Le patch global de nettoyage ShipGuard #149 reste à intégrer et qualifier dans sa source propriétaire : [patch](coordination/cleanup/sg-visual-run-owned-session.patch). Les causes historiques #130/#142/#145 et celle des anciennes promesses decode pendantes ne sont pas inventées.

L’audit complet a aussi conservé des dettes préexistantes d’outils de qualification et une duplication sans effet actuel ; elles sont détaillées dans son rapport, sans être assimilées à une régression du correctif ni corrigées implicitement. Le GO concerne la publication du correctif vérifié ; il ne certifie pas une compatibilité de messagerie.

Le skill newsletter-contribution reste inchangé. Aucun accès à une boîte ni envoi de courrier n’est effectué.
