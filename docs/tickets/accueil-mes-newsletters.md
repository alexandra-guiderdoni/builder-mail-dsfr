# Accueil « Mes newsletters » et gestion de la bibliothèque

Statut : réalisé et vérifié. Ce ticket conserve les revues de la tranche initiale ; le [suivi courant de livraison](../SUIVI-CORRECTIONS.md) précise le mandat de publication et les critères restant ouverts. Avis Claude initial non obtenu ; poursuite explicitement autorisée par l’utilisateur.

## Problème et résultat attendu

Les compositions, modèles, identités et sauvegardes existent déjà, mais leur gestion est répartie dans le panneau de l’éditeur. L’utilisateur veut retrouver la gestion de bibliothèque de Pupitro, avec un parcours ergonomique cohérent avec les usages DSFR.

L’application s’ouvre sur « Mes newsletters ». L’utilisateur y retrouve ses compositions, en ouvre ou en crée une, travaille dans l’éditeur puis revient à sa bibliothèque. Les actions de gestion et de sauvegarde sont réunies sur cet écran. Un accès à la bibliothèque reste disponible dans l’éditeur ; les modales servent aux actions courtes.

## Comportements et critères d’acceptation vérifiés

- [x] À l’ouverture, les compositions déjà enregistrées sont disponibles dans l’accueil, avec leur nom ; la bibliothèque existante est conservée.
- [x] Créer, importer et ouvrir une composition mène à son édition. Revenir à la bibliothèque puis rouvrir retrouve les modifications sauvegardées et les images.
- [x] Renommer et dupliquer produisent un résultat visible dans la liste ; une copie reste indépendante de son original.
- [x] Supprimer demande confirmation ; annuler laisse la bibliothèque intacte. Le retrait de la composition ouverte aboutit à un état cohérent et compréhensible.
- [x] L’accès permanent à la bibliothèque respecte les chargements, sauvegardes et champs invalides : un problème est signalé sans perdre le travail en mémoire.
- [x] Exporter une composition ou toute la bibliothèque puis la réimporter conserve textes, images, modèles et identités. Un fichier invalide ne remplace pas les données présentes.
- [x] Les modèles et identités existants restent accessibles avec leurs comportements actuels.
- [x] Changer de composition ou activer une mise à jour du programme conserve la bibliothèque. Le cache applicatif et les données restent séparés.
- [x] Le parcours est utilisable au clavier et sur une fenêtre étroite ; intitulés, focus et confirmations sont vérifiés dans le navigateur.
- [x] Le portable et la variante web partagent ce parcours ; le fonctionnement local et hors connexion est exercé sur les environnements de recette disponibles.

## Périmètre retenu

Une entrée représente une édition indépendante, comme les compositions actuelles, par exemple « SNUM — 22 octobre 2026 ». Le regroupement par publication reste un ajout distinct au modèle métier ; il n’est pas introduit par ce ticket.

La politique actuelle d’import ajoute des copies avec de nouveaux identifiants. La restauration de Pupitro ignore au contraire les éléments déjà présents. Ce ticket ne choisit pas implicitement une nouvelle politique de doublons.

## Revues avant implémentation — 22 octobre 2026

L’utilisateur demande une validation par Claude et ShipGuard, puis l’implémentation si les avis sont favorables. Le dossier soumis aux deux revues conserve une édition indépendante par entrée et les imports ajoutant des copies ; aucun regroupement par publication n’est introduit.

- ShipGuard `sg-pre-review` : **GO**, revue indépendante en lecture seule des sources du builder et des interfaces de Pupitro. Réutiliser modèle, stockage et imports ; étendre l’interface et les actions ciblées par identifiant. Aucun test de la future interface n’a été exécuté.
- Points discriminants de la revue : une action sur B doit viser B même si A est ouverte ; le dernier retrait conserve l’invariant d’une composition active ; une promesse de changement résolue ne prouve pas l’écriture réussie. Garder un export accessible en cas de panne de sauvegarde et vérifier focus, annulations, conflits et chargements.
- Claude via la compétence `second-avis` : **NON VÉRIFIÉ**, délai de 180 secondes dépassé, aucun avis exploitable. Le dossier autonome contenait le ticket et 13 autres pièces, sans conversation complète ni donnée métier. L’erreur et l’empreinte du dossier sont conservées localement sous `evidence/application/revue-bibliotheque/` ; ces fichiers ne sont pas publiés.
- Suite utilisateur : « claude pas dispo […] On y va alors ». Cette instruction lève l’attente d’avis Claude et autorise la réalisation locale. Aucune seconde consultation Claude n’a été lancée.
- Revue finale indépendante : aucun défaut P0/P1/P2 relevé, lecture seule. La campagne complète donne **28 réussites, 0 échec, 0 test sauté** ; Firefox et la relance PWA installée hors connexion passent sur Mac. Voir [le dossier de recette](../RECETTE-APPLICATION.md) pour les journaux, captures, incidents et limites.

## Dépendances et limites

Aucun autre ticket identifié comme dépendance. Le périmètre livré conserve les données et les éditions indépendantes déjà prises en charge.

Les formats génériques existants, les données locales, les modèles, les identités et la séparation SNUM restent préservés. Une nouvelle politique de restauration ou un regroupement par publication doit être décidé explicitement. Aucun serveur de données, compte, synchronisation entre postes, modification de Pupitro ou de l’amont officiel, publication ou accès à une messagerie n’est inclus.

## Origine de la demande

[Échange et décisions cuisine-moi](../../cuisine-moi/2026-10-22-bibliotheque-newsletters.md). Référence fonctionnelle : gestionnaire de bibliothèque de Pupitro, consulté en lecture seule. La [documentation DSFR des modales](https://www.systeme-de-design.gouv.fr/version-courante/fr/composants/modale) recommande des interactions simples et limitées ; le choix d’un accueil est un arbitrage de conception validé par l’utilisateur.
