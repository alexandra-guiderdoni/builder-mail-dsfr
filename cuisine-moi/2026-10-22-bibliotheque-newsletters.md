Bibliothèque de newsletters : notes cuisine-moi
===============================================

Date : 2026-10-22 | Objectif : préciser la gestion des newsletters et des sauvegardes en prenant la bibliothèque de Pupitro comme référence.

## Résumé / décisions clés

- Demande : comprendre le cache quand on change de newsletter et améliorer la gestion de bibliothèque.
- Référence confirmée par l’utilisateur : `/Users/alex/Claude/projets-heberges/Pupitro`, pour sa gestion de bibliothèque.
- Périmètre actuel : réalisation locale de l’accueil et de sa bibliothèque, autorisée par l’utilisateur après la revue ShipGuard. Pupitro et l’amont officiel restent en lecture seule ; aucun commit, push ou déploiement n’est inclus.
- Fait vérifié dans le builder : le cache web possède les ressources du programme ; IndexedDB possède les compositions, modèles, identités et images. Changer de composition ne demande pas de vider le cache. Le portable ne démarre aucun Service Worker.
- Le builder sait déjà conserver plusieurs compositions, les dupliquer, les renommer, les retirer et exporter/importer la bibliothèque. Ces fonctions sont réparties dans le panneau latéral.
- Pupitro propose un bouton « Bibliothèque », une fenêtre de gestion avec liste, ouverture, renommage, suppression confirmée, export et restauration avec aperçu. Sa bibliothèque reste distincte de son cache applicatif.
- Décision confirmée : reprendre les fonctions de gestion de Pupitro, avec un accueil « Mes newsletters » et un accès permanent à la bibliothèque depuis l’éditeur. Réserver les modales aux actions courtes. L’utilisateur répond « ok ticket ? ask matth » à cette recommandation.
- Suite initiale : préparer le ticket et consulter le routeur `ask-matt`, retrouvé dans les compétences locales. Il oriente la préparation de tickets vers `to-tickets`. Le ticket reste local ; aucun suivi global des agents n’est installé.
- Autorisation suivante : « fait valider par claude et shipguard puis on y va si tout le monde est ok ». L’implémentation locale est autorisée sous cette condition ; aucun mandat de publication n’est ajouté.
- Autorisation finale : « claude pas dispo […] On y va alors ». L’utilisateur lève l’attente Claude. L’accueil a été réalisé et vérifié : 28 tests réussis, Firefox natif et relance installée hors connexion sur Mac ; revue finale indépendante sans défaut P0/P1/P2 relevé.

## Journal questions-réponses

### Précision utilisateur — référence

- Capture : le projet mentionné est Pupitro, au chemin indiqué ci-dessus.
- Drapeaux : aucun doute restant sur le projet à consulter.

### Précision utilisateur — périmètre de la comparaison

- Capture : « avec la gestion de la bibliothèque » ; la référence concerne la gestion des documents.
- Drapeaux : le parcours précis du builder reste à décider.

### Q1 — Accès à la bibliothèque

- Question prévue : fenêtre ouverte par un bouton « Bibliothèque », comme Pupitro, ou écran d’accueil « Mes newsletters » avant l’éditeur ?
- Recommandation initiale : le bouton et la fenêtre dédiée, au plus près de la référence demandée.
- Capture : l’utilisateur demande une recommandation sur le parcours « le plus DSFR et ergonomique possible », puis réitère la question fenêtre ou accueil. Il ne choisit pas encore l’une des deux options.
- Recommandation révisée après lecture des sources : un accueil « Mes newsletters », avec un accès permanent depuis l’éditeur. La gestion comporte plusieurs tâches et mérite une surface dédiée ; une modale convient aux actions courtes, notamment une confirmation de suppression. Le DSFR recommande de limiter les interactions dans les modales ; il n’impose pas cet écran d’accueil.
- Confirmation : l’utilisateur accepte la recommandation et demande le ticket. Le choix de l’accueil est acquis ; aucun changement de code lancé.

### Q2 — Ce que représente une entrée

- Question prévue : chaque entrée de « Mes newsletters » représente-t-elle une édition indépendante ou une lettre regroupant plusieurs éditions ?
- Recommandation : une édition indépendante par entrée pour la première version, correspondant au contrat de composition existant ; regrouper par publication si l’utilisateur en exprime le besoin.
- Capture : aucune réponse à l’outil de choix. La proposition suivante, une édition indépendante par entrée, conserve le modèle existant ; l’autorisation de réaliser ce ticket porte sur ce périmètre conservé. Aucun regroupement par publication n’est ajouté.
- Drapeaux : un regroupement futur par publication nécessiterait une demande distincte.

### Suite utilisateur — revues puis implémentation conditionnelle

- Question : obtenir les avis Claude et ShipGuard avant de lancer le ticket.
- Capture : revue ShipGuard indépendante favorable, lecture seule et sources citées. Consultation Claude effectuée une fois par `second-avis`, sans outils d’exécution ; erreur `timeout` après 180 secondes, aucun avis exploitable.
- Drapeaux : la condition « tout le monde est ok » reste non satisfaite. Aucun changement applicatif, commit, push ou ticket distant. La procédure `second-avis` interdit une relance automatique ; un dossier plus court est préparé sans nouvel appel.

### Autorisation finale et résultat

- Capture utilisateur : « claude pas dispo. Shipguard est ok ? pas de question ? On y va alors ». L’absence d’avis Claude ne bloque plus la réalisation ; aucune validation Claude n’est inventée.
- Résultat : accueil avec actions ciblées sur chaque composition, dialogues courts et retour vers l’éditeur ; fichiers et exports communs accessibles depuis les deux vues. Modèle, stockage, état, imports, rendu et HTML SNUM identiques octet pour octet à la recette précédente.
- Preuves : `accueil-suite-finale.log`, 28 réussites sans échec ni test sauté ; `accueil-parcours-cibles-final.log`, 3 parcours réussis ; `bibliotheque-accueil.json` et captures grand écran/390 px ; recettes Firefox et installation PWA avec relance hors connexion et retrait de l’installation de recette.
- Incident : le helper clavier pouvait activer un contrôle encore masqué pendant une transition ; l’attente de visibilité corrige le scénario. Les journaux ciblés d’échec sont conservés, l’instrumentation temporaire retirée.
- Revue : ShipGuard préalable GO et unique revue finale indépendante sans défaut P0/P1/P2. Revues statiques distinctes des recettes exécutées.

## Ticket local

- [Accueil « Mes newsletters » et gestion de la bibliothèque](../docs/tickets/accueil-mes-newsletters.md).
- Un seul parcours complet : choisir ou créer une composition dans la bibliothèque, la modifier, la retrouver puis exporter/restaurer ses données.
- Critères cochés avec les preuves de recette. Aucune publication distante.

## Drapeaux ouverts

- Accès au gestionnaire : décidé, accueil et accès permanent depuis l’éditeur.
- Sens d’une entrée : composition indépendante conservée, sans regroupement par publication.
- Doublons à l’import/restauration : politique du builder conservée, création de copies avec de nouveaux identifiants.
- Modèles et identités : accès conservé dans l’éditeur, parcours exercés dans la campagne complète.
- Reprise sur un autre poste : export/import existants ; aucune synchronisation automatique à ajouter sans décision.
- Suivi du ticket : le dépôt ne possède pas de configuration `docs/agents/issue-tracker.md`. Le brouillon ne constitue pas une configuration de tracker ; si le flux Matt doit être installé durablement, utiliser son étape de configuration avec un choix humain.
- Prochaine étape : essai utilisateur de l’accueil. Windows, Outlook, Mélissa, installation humaine sur le parc et HTTPS réel restent à qualifier dans le chantier global, séparément de cette tranche locale.

## Sources consultées

- Builder : `app/source/storage.js`, `state.js`, `view.js`, `library-actions.js`, `pwa.js`, `sw.js`.
- Pupitro, en lecture seule : `AGENTS.md`, `README.md`, `todo.md`, `CODEBASE_MAP.md`, `reader/library.js`, `reader/index.html`, `reader/app.js` et repérage des modules de sauvegarde/cache.
- DSFR courant : [Modale — quand et comment l’utiliser](https://www.systeme-de-design.gouv.fr/version-courante/fr/composants/modale), consulté le 22 octobre 2026 : parcimonie et interactions simples et limitées. La recommandation d’accueil est une déduction de conception, pas une obligation du DSFR.
- Revues : compétences `sg-pre-review`, `sg-mission-lock` et `second-avis` ; retour indépendant ShipGuard avec sources, résultat brut de la consultation Claude dans `evidence/application/revue-bibliotheque/claude-preavis.json`.
