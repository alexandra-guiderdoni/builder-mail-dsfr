# Réalisation de l’atelier autonome

Objectif : application complète du cadrage confirmé, depuis le prototype `c329339`. Le mandat de livraison du 22 octobre autorise la publication sur `main` dans le dépôt personnel et la clôture des issues satisfaites. Les essais de messagerie sur Mac ont été autorisés séparément ; le parc et son hébergement restent à qualifier.

## État vérifié au démarrage

- Le clone applicatif était propre et aligné avec la branche distante du prototype : divergence `0/0`.
- Branche de développement locale : `feature/atelier-autonome`.
- Le pourquoi et les décisions figurent dans `docs/cadrage-source.md` et `SPECIFICATION.md`.
- La référence épinglée contient 52 sections de courriel, dont les variantes d’en-têtes, textes, images, cartes, actions et pieds de page.
- Le prototype et sa recette restent conservés séparément.

## Exigences et preuves à produire

| Exigence | État actuel | Preuve attendue |
| --- | --- | --- |
| Catalogue complet et variantes | 52 sections et 178 champs compilés ; structures et CSS comparés | Contrôle DOM indépendant et bibliothèque de recette par famille ; réception métier à qualifier. |
| Composition et identité | Implémentées et exercées localement | Édition, déplacement, duplication, retrait, en-tête, pied et images locales dans les parcours navigateur. |
| Bibliothèque, modèles, identités | Implémentés et exercés localement | Réouverture, redémarrage Firefox et échange vers un profil neuf avec images. |
| Accueil Mes newsletters | Implémenté et exercé localement | Actions par entrée, copies indépendantes, annulation, dernière suppression, focus, fenêtre étroite et export en cas de panne. |
| JSON générique et conversion SNUM séparée | Implémentés et exercés localement | Schéma et exemple importable ; compatibilité v1 ; page SNUM autonome vers le builder, rendu HTML identique, rubriques et articles structurés, remarques hors courriel. |
| Fichier portable et webapp | Portable, cache web et installation Mac via DevTools observés | Première ouverture hors connexion ; application installée relancée après redémarrage du navigateur, serveur arrêté. Parcours humain, parc et HTTPS réel non vérifiés. |
| Erreurs, reprise et mises à jour | Scénarios ciblés observés | Imports invalides, quota simulé, conflits entre fenêtres, récupération atomique, avertissement de fermeture pendant sauvegarde et cycle de mise à jour sans perte. |
| Clavier et sorties | Contrôles ciblés observés | Activation par Entrée ; téléchargements inspectés ; HTML et texte du presse-papiers relus dans Chromium. |
| Messageries | Gmail et Mélissa sur Mac : messages reçus, PNG/JPEG principaux identiques aux originaux | Compléter Windows/Outlook, images bloquées, retouche et lecteur d’écran ; contrôler la fidélité après la correction de largeur. |
| Revue finale indépendante | Réalisée ; trois défauts initiaux corrigés, aucun défaut relevé sur la séparation SNUM | Un P1 et deux P2 reproduits puis corrigés ; relecture du P1 et tests de régression. Revue statique de la nouvelle séparation, sans exécution concurrente de navigateur. |

La [recette de l’application](RECETTE-APPLICATION.md) contient les commandes, résultats, erreurs et limites. La dernière campagne comporte **64 réussites, aucun échec ni saut** ; les recettes natives Firefox et d’installation sur Mac sont consignées séparément. La revue indépendante de la correction de copie donne GO local après correction des filets décoratifs. L’avis Claude initial n’a pas été obtenu ; l’utilisateur a autorisé de poursuivre sans lui. Le [reçu initial](recette-application-observee.json) conserve la campagne historique ; le [format JSON](FORMAT-JSON.md) documente les échanges sans changer le contrat des données existantes.

Les essais métier manquants ne bloquent pas la livraison des corrections vérifiées. La bibliothèque de recette couvre les neuf familles. L’installation Mac pilotée par DevTools et sa relance hors connexion restent distinctes du dialogue humain et du parc. Le résultat global demeure incomplet tant que Windows/Outlook, le lecteur d’écran, l’installation sur le parc et HTTPS approuvé ne sont pas qualifiés. Le [suivi des 27 issues](SUIVI-CORRECTIONS.md) distingue les corrections livrables des critères de #2 et #13 encore ouverts.

## Conditions de reprise

Les critères restants exigent un opérateur sur Windows/Firefox avec Outlook, le lecteur d’écran retenu, les versions et restrictions du poste, ainsi qu’une origine HTTPS autorisée pour la distribution web. Tout déploiement nécessite son mandat distinct. Les autorisations d’envoi obtenues pour les essais Mac ne valent pas autorisation générale sur le parc. La recette opérateur et les fichiers de qualification sont prêts.
